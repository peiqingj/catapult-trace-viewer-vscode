# Catapult Trace Viewer

Open Chrome Catapult trace files directly inside VS Code with the classic Catapult timeline UI.

This extension is for people who still use compatible `chrome://tracing` / Catapult trace files and want to inspect them without leaving VS Code.

## Features

- Open `.json`, `.trace`, and `.ctrace` files with **Open With... > Catapult Trace Viewer**.
- Right-click a supported trace file and choose **Open with Catapult Trace Viewer** from the Explorer context menu.
- View traces in a normal VS Code editor tab using a read-only custom editor.
- Use the legacy Catapult viewer locally from vendored assets, without uploading trace data to a remote web app.
- Keep the classic light Catapult UI even when VS Code uses a dark theme.

## How to Use

1. Open a folder that contains a Catapult-compatible trace file.
2. Right-click a `.json`, `.trace`, or `.ctrace` file in the Explorer.
3. Select **Open with Catapult Trace Viewer**.

![Open a trace with Catapult Trace Viewer](docs/resources/open-with-catapult-trace-viewer.gif)

You can also use VS Code's **Open With...** command and choose **Catapult Trace Viewer**.

## Supported Files

This extension registers for:

- `.json`
- `.trace`
- `.ctrace`

The file still needs to contain trace data that the legacy Catapult viewer can understand.

## Privacy

Trace files are loaded into a local VS Code webview. The bundled viewer assets are served from this extension, so trace data is not sent to an external viewer service.

## Limitations

- Very large traces may use a lot of webview renderer memory.
- The viewer is based on Chrome's legacy Catapult tracing UI, so some newer trace formats may not render correctly.
- The bundled viewer depends on older WebComponents behavior and a compatibility polyfill.

## Development and Release

Developer setup, local packaging, and release notes live in [docs/development.md](docs/development.md).

## Third Party Notices

See [vendor/THIRD_PARTY_NOTICES.md](vendor/THIRD_PARTY_NOTICES.md) for Catapult and WebComponents licensing notes.
