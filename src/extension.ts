import * as path from 'node:path';
import * as vscode from 'vscode';

const viewType = 'catapultTraceViewer.traceViewer';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(CatapultTraceViewerProvider.register(context));

  context.subscriptions.push(
    vscode.commands.registerCommand('catapultTraceViewer.open', async (resource?: vscode.Uri) => {
      const target = resource ?? vscode.window.activeTextEditor?.document.uri;

      if (!target) {
        const picked = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'Trace files': ['json', 'trace', 'ctrace'],
            'All files': ['*']
          },
          title: 'Open trace with Catapult Trace Viewer'
        });

        if (!picked?.[0]) {
          return;
        }

        await openTrace(picked[0]);
        return;
      }

      await openTrace(target);
    })
  );
}

export function deactivate(): void {}

async function openTrace(resource: vscode.Uri): Promise<void> {
  await vscode.commands.executeCommand('vscode.openWith', resource, viewType, vscode.ViewColumn.Active);
}

class CatapultTraceViewerProvider implements vscode.CustomReadonlyEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.window.registerCustomEditorProvider(viewType, new CatapultTraceViewerProvider(context), {
      supportsMultipleEditorsPerDocument: false,
      webviewOptions: {
        retainContextWhenHidden: true
      }
    });
  }

  private constructor(private readonly context: vscode.ExtensionContext) {}

  public openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): vscode.CustomDocument {
    return {
      uri,
      dispose: () => {}
    };
  }

  public resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    const webview = webviewPanel.webview;
    const mediaRoot = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    const vendorRoot = vscode.Uri.joinPath(this.context.extensionUri, 'vendor');
    const documentRoot = getParentUri(document.uri);

    webview.options = {
      enableScripts: true,
      localResourceRoots: [mediaRoot, vendorRoot, documentRoot]
    };

    webviewPanel.title = `${basename(document.uri)} - Catapult Trace`;
    webview.html = this.getHtml(webview, document.uri);
  }

  private getHtml(webview: vscode.Webview, traceUri: vscode.Uri): string {
    const mediaUri = (fileName: string): string =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', fileName)).toString();
    const vendorUri = (fileName: string): string =>
      webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'vendor', fileName)).toString();

    const traceSrc = webview.asWebviewUri(traceUri).toString();
    const catapultSrc = vendorUri('trace_viewer_full.html');
    const traceName = basename(traceUri);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval' blob:; connect-src ${webview.cspSource} data: blob:; worker-src blob:; font-src ${webview.cspSource} data:;">
  <link rel="stylesheet" href="${mediaUri('viewer.css')}">
  <script src="${vendorUri('webcomponents.min.js')}"></script>
  <title>${escapeHtml(traceName)}</title>
</head>
<body data-catapult-src="${escapeHtml(catapultSrc)}" data-trace-src="${escapeHtml(traceSrc)}" data-trace-name="${escapeHtml(traceName)}">
  <div id="status" role="status">Loading Catapult Trace Viewer...</div>
  <script src="${mediaUri('viewer.js')}"></script>
</body>
</html>`;
  }
}

function getParentUri(uri: vscode.Uri): vscode.Uri {
  if (uri.scheme === 'file') {
    return vscode.Uri.file(path.dirname(uri.fsPath));
  }

  const parentPath = uri.path.replace(/\/[^/]*$/, '') || '/';
  return uri.with({ path: parentPath });
}

function basename(uri: vscode.Uri): string {
  if (uri.scheme === 'file') {
    return path.basename(uri.fsPath);
  }

  return uri.path.split('/').pop() || uri.toString();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, character => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return character;
    }
  });
}