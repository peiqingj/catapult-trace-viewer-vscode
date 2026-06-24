# Catapult Trace Viewer

Open Chrome Catapult trace files directly inside VS Code using the legacy Catapult Trace Viewer UI.

This extension is for people who prefer the old `chrome://tracing` / Catapult timeline experience over newer trace viewers for compatible trace files.

## Features

- Open `.json`, `.trace`, and `.ctrace` files with **Open With... > Catapult Trace Viewer**.
- Use a read-only custom editor so the trace opens inside a normal VS Code editor tab.
- Load the legacy Catapult viewer locally from vendored assets, without sending trace data to a remote web app.
- Preserve the classic light Catapult UI even when VS Code is using a dark theme.

## Development

```sh
npm install
npm run compile
```

Then press F5 and open `trace.json` in the Extension Development Host with **Open With... > Catapult Trace Viewer**.

You can also right-click a `.json`, `.trace`, or `.ctrace` file and run **Open with Catapult Trace Viewer**.

To build and install the local VSIX:

```sh
npm run package
npm run install
```

`npm run package` writes `catapult-trace-viewer-vscode-0.0.1.vsix`. `npm run install` rebuilds that VSIX and installs it with `code --install-extension --force`.

The install helper skips ordinary dependency installs, so `npm install` will not reinstall the extension.

To publish to the VS Code Marketplace after logging in with `vsce login peiqingj`:

```sh
npm run publish:marketplace
```

## Release

The repository has two GitHub workflows:

- **CI** builds and packages the extension on pushes and pull requests.
- **Release VSIX** creates a GitHub release and uploads the packaged `.vsix` when a `v*` tag is pushed, or when run manually from the Actions tab.

For a local release package only:

```sh
npm run package
```

## Notes

This extension vendors the legacy Catapult viewer assets used by Chrome's old tracing UI. The viewer depends on deprecated WebComponents V0 behavior and a polyfill, so some edge cases may behave differently from old Chrome builds.

Current limitations:

- Large traces may consume a lot of webview renderer memory.
- The CSP is intentionally relaxed for the legacy Catapult bundle.

## Third Party Notices

See [vendor/THIRD_PARTY_NOTICES.md](vendor/THIRD_PARTY_NOTICES.md) for Catapult and WebComponents licensing notes.
