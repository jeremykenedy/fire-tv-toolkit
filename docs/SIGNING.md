# Signing desktop installers

Regular desktop CI creates unsigned installers and tests them on native macOS, Windows and Linux runners. Signed Mac and Windows builds use a separate configuration that requires a trusted signing identity. It fails if signing cannot complete, rather than producing an unsigned file under a signed build command.

## macOS

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs). Membership currently costs USD 99 per year.
2. Create a [Developer ID Application certificate](https://developer.apple.com/help/account/certificates/create-developer-id-certificates/) and install it with its private key in your Mac's keychain. Direct distribution through a DMG or ZIP uses this certificate. A Developer ID Installer certificate is for PKG installers, which this app does not build.
3. Create an App Store Connect API key for [notarization](https://github.com/electron/notarize#usage-with-app-store-connect-api-key). Keep the downloaded P8 private key outside the repository. Record its Key ID and Issuer ID.
4. Set `APPLE_API_KEY` to the P8 file path, `APPLE_API_KEY_ID` to its Key ID, and `APPLE_API_ISSUER` to its Issuer ID. Enable certificate discovery by removing any `CSC_IDENTITY_AUTO_DISCOVERY=false` override.
5. Build on macOS:

```sh
npm --prefix desktop run dist:signed -- --mac --x64 --arm64
```

The build signs the application, enables the hardened runtime and submits it for notarization. Check the produced app with `codesign --verify --deep --strict` and `xcrun stapler validate` before publishing it.

For CI, export the signing identity and private key as an encrypted P12. Provide it through the `CSC_LINK` secret and store its password in `CSC_KEY_PASSWORD`. Decode the notarization private key to a temporary runner file and point `APPLE_API_KEY` at that file. Use GitHub Actions secrets for private keys and passwords. Do not commit them or paste them into chat. Run credentialed builds from the verified primary branch only, never from pull requests.

## Windows

[Microsoft Artifact Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart), formerly Trusted Signing, supports individual developers in the United States and Canada. Its [Basic tier](https://learn.microsoft.com/en-us/azure/artifact-signing/how-to-change-sku) currently costs USD 9.99 per month and includes 5,000 signatures.

1. Create an Azure subscription and Artifact Signing account.
2. Complete identity validation in the Azure portal and create a Public Trust certificate profile. Enrollment, billing approval and identity verification are account-holder steps.
3. Give the build identity permission to sign with that certificate profile. Keep its access limited to signing. Use federated authentication for CI where available; the signing integration also accepts the Azure environment credentials documented by Microsoft.
4. Set these environment variables on the Windows build runner:

| Variable | Value |
| --- | --- |
| `WINDOWS_SIGNING_PUBLISHER` | The exact validated publisher name on the certificate |
| `WINDOWS_SIGNING_ENDPOINT` | The regional Artifact Signing endpoint |
| `WINDOWS_SIGNING_ACCOUNT` | The Artifact Signing account name |
| `WINDOWS_SIGNING_PROFILE` | The Public Trust certificate profile name |

5. Authenticate the runner to Azure and build on Windows:

```sh
npm --prefix desktop run dist:signed -- --win --x64
```

The [electron-builder Windows integration](https://www.electron.build/v26/docs/features/code-signing/code-signing-win/) signs the app and NSIS installer using the certificate profile. Verify the resulting EXE with PowerShell's `Get-AuthenticodeSignature` before publication. A signature identifies the publisher; Windows reputation and organizational policies can still affect installation prompts.

## Current release

Signing credentials are not configured for 4.1.0. Its packages remain unsigned until the account holder completes the setup above and a signed build passes verification. The source and ordinary installer build do not require a paid signing account.
