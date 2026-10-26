import fs from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const MAX_MANIFEST = 4 * 1048576;
const ZIP_END = Buffer.from('504b0506', 'hex').readUInt32LE(0);
const ZIP_CENTRAL = Buffer.from('504b0102', 'hex').readUInt32LE(0);
const ZIP_LOCAL = Buffer.from('504b0304', 'hex').readUInt32LE(0);
const NO_STRING = 2 ** 32 - 1;

/** Reads one bounded ZIP member without extracting archive paths to disk. */
export function readZipEntry(apk, requestedName, maxBytes = MAX_MANIFEST) {
  if (apk.length < 22) throw new Error('Truncated ZIP archive.');
  const lower = Math.max(0, apk.length - 65557);
  let end = apk.length - 22;
  while (end >= lower && apk.readUInt32LE(end) !== ZIP_END) end -= 1;
  if (end < lower || apk.readUInt16LE(end + 4) || apk.readUInt16LE(end + 6))
    throw new Error('Unsupported ZIP directory.');
  let at = apk.readUInt32LE(end + 16);
  const entries = apk.readUInt16LE(end + 10);
  for (let i = 0; i < entries; i += 1) {
    if (at + 46 > apk.length || apk.readUInt32LE(at) !== ZIP_CENTRAL) break;
    const nameLength = apk.readUInt16LE(at + 28);
    const name = apk.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    if (name === requestedName) {
      const method = apk.readUInt16LE(at + 10);
      const compressed = apk.readUInt32LE(at + 20), size = apk.readUInt32LE(at + 24);
      const local = apk.readUInt32LE(at + 42);
      if ((apk.readUInt16LE(at + 8) & 1) || size > maxBytes || compressed > maxBytes
          || local + 30 > apk.length || apk.readUInt32LE(local) !== ZIP_LOCAL)
        throw new Error('Unsupported ZIP entry.');
      const start = local + 30 + apk.readUInt16LE(local + 26) + apk.readUInt16LE(local + 28);
      if (start + compressed > apk.length) throw new Error('Truncated ZIP entry.');
      const data = apk.subarray(start, start + compressed);
      const result = method === 0 ? data : method === 8 ? inflateRawSync(data, {maxOutputLength: maxBytes}) : null;
      if (!result || result.length !== size) throw new Error('Invalid ZIP compression.');
      return result;
    }
    at += 46 + nameLength + apk.readUInt16LE(at + 30) + apk.readUInt16LE(at + 32);
  }
  throw new Error(`ZIP member is unavailable: ${requestedName}`);
}

function readStringPool(data, at, header, size) {
  if (header < 28) throw new Error('Invalid Android string pool.');
  const count = data.readUInt32LE(at + 8), flags = data.readUInt32LE(at + 16);
  const base = at + data.readUInt32LE(at + 20);
  if (count > 100000 || header + count * 4 > size) throw new Error('Invalid Android string count.');
  const strings = [];
  for (let i = 0; i < count; i += 1) {
    let offset = base + data.readUInt32LE(at + header + i * 4);
    const length = (wide) => {
      let value = wide ? data.readUInt16LE(offset) : data.readUInt8(offset); offset += wide ? 2 : 1;
      const high = wide ? 0x8000 : 0x80;
      if (value & high) {
        value = (value & (high - 1)) * high * 2 + (wide ? data.readUInt16LE(offset) : data.readUInt8(offset));
        offset += wide ? 2 : 1;
      }
      return value;
    };
    if (flags & 0x100) length(false);
    const bytes = length(!(flags & 0x100)) * ((flags & 0x100) ? 1 : 2);
    if (offset < base || offset + bytes > at + size) throw new Error('Invalid Android string offset.');
    strings.push(data.subarray(offset, offset + bytes).toString(flags & 0x100 ? 'utf8' : 'utf16le'));
  }
  return strings;
}

function readManifestAttributes(data, strings, at, size) {
  const attributeSize = data.readUInt16LE(at + 26), count = data.readUInt16LE(at + 28);
  const start = at + 16 + data.readUInt16LE(at + 24);
  if (attributeSize < 20 || start + attributeSize * count > at + size) throw new Error('Invalid manifest attributes.');
  let pkg, low, versionName, high = 0;
  for (let i = 0; i < count; i += 1) {
    const attr = start + i * attributeSize;
    const name = strings[data.readUInt32LE(attr + 4)], type = data.readUInt8(attr + 15);
    const value = data.readUInt32LE(attr + 16), raw = data.readUInt32LE(attr + 8);
    if (name === 'package') pkg = strings[raw === NO_STRING ? value : raw];
    if (name === 'versionCode' && (type === 0x10 || type === 0x11)) low = value;
    if (name === 'versionCodeMajor' && (type === 0x10 || type === 0x11)) high = value;
    if (name === 'versionName' && type === 3) {
      versionName = strings[raw === NO_STRING ? value : raw];
      if (typeof versionName !== 'string' || !versionName.length || versionName.length > 128
          || /[\x00-\x1f\x7f]/.test(versionName)) throw new Error('Invalid APK version name.');
    }
  }
  const parts = typeof pkg === 'string' ? pkg.split('.') : [];
  if (parts.length < 2 || !parts.every(part => /^[A-Za-z0-9_]+$/.test(part)) || low === undefined)
    throw new Error('APK package or version code is unavailable.');
  return {package: pkg, versionCode: (BigInt(high) << 32n) + BigInt(low),
    ...(versionName === undefined ? {} : {versionName})};
}

/** Reads Android's compiled manifest without executing the APK or requiring an SDK. */
export function parseBinaryManifest(data) {
  if (data.length < 8 || data.readUInt16LE(0) !== 3 || data.readUInt32LE(4) !== data.length)
    throw new Error('Invalid compiled Android manifest.');
  let strings = [];
  for (let at = data.readUInt16LE(2); at + 8 <= data.length;) {
    const kind = data.readUInt16LE(at), header = data.readUInt16LE(at + 2), size = data.readUInt32LE(at + 4);
    if (header < 8 || size < header || at + size > data.length) throw new Error('Truncated Android manifest chunk.');
    if (kind === 1) strings = readStringPool(data, at, header, size);
    else if (kind === 0x0102 && strings[data.readUInt32LE(at + 20)] === 'manifest')
      return readManifestAttributes(data, strings, at, size);
    at += size;
  }
  throw new Error('APK manifest root is unavailable.');
}

export function inspectApk(file) {
  const size = fs.statSync(file).size;
  if (size < 22 || size > 250 * 1048576) throw new Error('APK exceeds its allowed size.');
  return parseBinaryManifest(readZipEntry(fs.readFileSync(file), 'AndroidManifest.xml'));
}
