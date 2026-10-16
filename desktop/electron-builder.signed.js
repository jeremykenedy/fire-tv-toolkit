import fs from 'node:fs';

const { build } = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before building signed installers.`);
  return value;
}

const config = { ...build, forceCodeSigning: true };
if (process.platform === 'darwin') {
  required('APPLE_API_KEY');
  required('APPLE_API_KEY_ID');
  required('APPLE_API_ISSUER');
  if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false')
    throw new Error(
      'Enable certificate discovery before building signed installers.',
    );
  config.mac = { ...build.mac, hardenedRuntime: true, notarize: true };
} else if (process.platform === 'win32') {
  config.win = {
    ...build.win,
    azureSignOptions: {
      publisherName: required('WINDOWS_SIGNING_PUBLISHER'),
      endpoint: required('WINDOWS_SIGNING_ENDPOINT'),
      codeSigningAccountName: required('WINDOWS_SIGNING_ACCOUNT'),
      certificateProfileName: required('WINDOWS_SIGNING_PROFILE'),
    },
  };
} else {
  throw new Error(
    'Build signed Mac or Windows installers on their own operating system.',
  );
}

export default config;
