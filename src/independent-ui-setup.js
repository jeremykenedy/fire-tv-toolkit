import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { deviceInfo, readDiagnostic, packageDetails } from './adb.js';
import { launcherState } from './apply/launcher.js';
import { FIRE_TV_UI } from './launcher-registry.js';
import { inspectApk } from './apk-manifest.js';
import { verifyApkSigner } from './apk-signature.js';

const MAX_APK = 250 * 1048576;

/** Checks local candidate bytes without treating a declaration as release approval. */
export function inspectIndependentUiContract(file) {
  if (!fs.statSync(file).isFile() || fs.statSync(file).size > 65536)
    throw new Error('The artifact contract must be a JSON file of at most 64 KiB.');
  const contract = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (contract?.schemaVersion !== 1 || contract.kind !== 'fire-tv-ui-source-release'
      || contract.package !== FIRE_TV_UI.pkg || contract.provenance !== 'maintained-source'
      || !/^[a-f0-9]{40}$/.test(contract.sourceCommit)
      || !/^v\d+\.\d+\.\d+$/.test(contract.releaseTag)
      || !Number.isSafeInteger(contract.versionCode) || contract.versionCode <= 0
      || !Number.isSafeInteger(contract.minSdk) || contract.minSdk < 27
      || !Number.isSafeInteger(contract.bytes) || contract.bytes < 22 || contract.bytes > MAX_APK
      || !/^[a-f0-9]{64}$/.test(contract.sha256)
      || contract.signerSha256 !== FIRE_TV_UI.signerSha256
      || typeof contract.apkPath !== 'string' || !contract.apkPath.length)
    throw new Error('The source release contract needs the production package, signer, stable tag, source commit, version, SDK, size, hash and local APK path.');
  const apk = path.resolve(path.dirname(file), contract.apkPath);
  const stat = fs.statSync(apk);
  if (!stat.isFile() || stat.size !== contract.bytes)
    throw new Error('The APK size does not match the artifact contract.');
  const bytes = fs.readFileSync(apk);
  if (bytes.length !== contract.bytes || createHash('sha256').update(bytes).digest('hex') !== contract.sha256)
    throw new Error('The APK checksum does not match the artifact contract.');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'firetv-source-inspect-'));
  try {
    const copy = path.join(directory, 'candidate.apk');
    fs.writeFileSync(copy, bytes, { mode: 0o600, flag: 'wx' });
    const manifest = inspectApk(copy, { includeSdk: true });
    if (manifest.package !== FIRE_TV_UI.pkg || manifest.versionCode !== BigInt(contract.versionCode))
      throw new Error('The APK package or version does not match the production release contract.');
    if (manifest.minSdk !== contract.minSdk)
      throw new Error('The APK minimum SDK does not match the production release contract.');
    const signature = verifyApkSigner(copy, FIRE_TV_UI.signerSha256);
    return { package: contract.package, versionCode: contract.versionCode, minSdk: manifest.minSdk, targetSdk: manifest.targetSdk,
      releaseTag: contract.releaseTag, sourceCommit: contract.sourceCommit,
      sha256: contract.sha256, bytes: contract.bytes, declaredSignerSha256: contract.signerSha256,
      signatureVerified: signature.status === 'verified', signatureStatus: signature.status,
      ...(signature.signerSha256 ? { actualSignerSha256: signature.signerSha256 } : {}),
      provenanceVerified: false, publishedReleaseVerified: false };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

/** Read-only planning for the selected CLI TV or desktop profile address. */
export async function preflightIndependentUi(ip, contractPath) {
  const artifact = contractPath === undefined ? null : inspectIndependentUiContract(contractPath);
  const [identity, sdkRaw, featuresRaw, state, installed] = await Promise.all([
    deviceInfo(ip), readDiagnostic(ip, ['getprop', 'ro.build.version.sdk']),
    readDiagnostic(ip, ['pm', 'list', 'features']), launcherState(ip), packageDetails(ip, FIRE_TV_UI.pkg),
  ]);
  const sdk = /^\d{1,3}$/.test(sdkRaw) ? Number(sdkRaw) : null;
  const television = /^feature:android\.(software\.leanback|hardware\.type\.television)$/m.test(featuresRaw);
  const blockers = [];
  if (!identity.serial || /^(unknown|null)$/i.test(identity.serial)) blockers.push('Confirm the connected TV identity before installation.');
  if (sdk === null || sdk < (artifact?.minSdk ?? 27)) blockers.push('The TV does not report a supported Android API level.');
  if (!television) blockers.push('Android TV or Leanback capability has not been confirmed.');
  if (installed.versionCode !== null && !state.installed.includes(FIRE_TV_UI.id))
    blockers.push('The installed UI inventory is inconsistent. Reconnect and check again.');
  if (state.installed.includes(FIRE_TV_UI.id) && installed.versionCode === null)
    blockers.push('The installed UI version is unavailable. Keep the installed application.');
  if (artifact && installed.versionCode !== null && BigInt(artifact.versionCode) <= installed.versionCode)
    blockers.push('The candidate must have a higher version code than the installed UI.');
  if (!artifact) blockers.push('Choose an independently built production release contract when that release is available.');
  if (!artifact) blockers.push('Verify the actual APK signer when a production release is available.');
  else if (artifact.signatureStatus === 'unavailable') blockers.push('APK signature verification is unavailable. Install the Android SDK build tools and Java, then retry.');
  else if (artifact?.signatureStatus === 'invalid') blockers.push('The APK signature could not be verified. Keep the installed application.');
  else if (artifact?.signatureStatus === 'mismatch') blockers.push('The APK signer does not match the approved production signer. Keep the installed application.');
  if (!artifact?.provenanceVerified) blockers.push('Verify the published release and source provenance before installation.');
  blockers.push('Complete UI parity, migration, recovery and native hardware acceptance before production setup.');
  return { stage: 'preflight', installationAllowed: false, target: { ip, ...identity, sdk, television },
    currentHome: state.home, services: [...state.services], disabled: [...state.disabled],
    installedUiVersionCode: installed.versionCode?.toString() ?? null, artifact, blockers,
    steps: [
      'Keep the current Home choice and installed applications while release checks are pending.',
      'Back up UI settings and verify credential, artwork and saved setup continuity before upgrading.',
      'Install only the verified production package as an in-place update, then verify package, signer and version on the TV.',
      'Keep the existing Home choice after installation. Select Fire TV UI separately only when you choose to switch.',
      'Validate Home, Factory UI escape, Settings and restored configuration on the selected TV.',
    ],
    recovery: [
      `The current Home choice is ${state.home}. Keep that choice during setup.`,
      'If installation fails, retain the installed app and its data. Do not uninstall it or assume a downgrade will work.',
      'If Home routing fails after an explicit switch, reconnect to this same TV and run firetv-launcher --use=amazon for Factory Home.',
      'Choose the previous launcher explicitly after checking its installation and saved settings.',
    ] };
}
