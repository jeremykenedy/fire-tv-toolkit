import { deflateRawSync } from 'node:zlib';

export function iconPng(width = 1920, height = 1080) {
  const png = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
  png.write('IHDR', 12);
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  return png;
}

export function iconZip(entries = { 'Icons/catalog.json': JSON.stringify([{file:'pc.png'}]), 'Icons/pc.png': iconPng() }, method = 8) {
  const locals = [], directory = [];
  let offset = 0;
  for (const [name, value] of Object.entries(entries)) {
    const filename = Buffer.from(name), bytes = Buffer.from(value);
    const body = method === 8 ? deflateRawSync(bytes) : bytes;
    const local = Buffer.alloc(30 + filename.length);
    local.writeUInt32LE(67324752); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(filename.length, 26); filename.copy(local, 30);
    const central = Buffer.alloc(46 + filename.length);
    central.writeUInt32LE(33639248); central.writeUInt16LE(method, 10);
    central.writeUInt32LE(body.length, 20); central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42); filename.copy(central, 46);
    locals.push(local, body); directory.push(central); offset += local.length + body.length;
  }
  const end = Buffer.alloc(22); end.writeUInt32LE(101010256);
  end.writeUInt16LE(directory.length, 8); end.writeUInt16LE(directory.length, 10);
  end.writeUInt32LE(directory.reduce((size, value) => size + value.length, 0), 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...directory, end]);
}
