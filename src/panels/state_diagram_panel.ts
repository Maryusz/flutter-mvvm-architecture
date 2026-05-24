import * as vscode from "vscode";
import * as crypto from "crypto";
import {
  analyzeWorkspaceDependencies,
  analyzeFeatureAnatomy,
  ArchitectureDiagramData,
  FeatureAnatomy
} from "../analyzer/dependency_analyzer";

export class StateDiagramPanel {
  public static currentPanel: StateDiagramPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _rootPath: string;
  private _disposables: vscode.Disposable[] = [];
  private _lastData: ArchitectureDiagramData | null = null;
  private _refreshInProgress = false;

  private constructor(panel: vscode.WebviewPanel, rootPath: string) {
    this._panel = panel;
    this._rootPath = rootPath;

    // Show a non-scripted loading page immediately so the tab is not blank
    this._panel.webview.html = this._getLoadingHtml();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Message handler: only interactive commands (refresh/anatomy/openFile).
    // Initial data is embedded in HTML — no 'ready' handshake needed.
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "refresh":
            await this.refreshData();
            break;
          case "getAnatomy":
            try {
              const anatomy = await analyzeFeatureAnatomy(this._rootPath, message.featureName);
              this._panel.webview.postMessage({ command: "setAnatomy", anatomy });
            } catch (err) {
              vscode.window.showErrorMessage(`Error analyzing anatomy: ${err}`);
              this._panel.webview.postMessage({
                command: "setAnatomyError",
                featureName: message.featureName,
                message: String(err)
              });
            }
            break;
          case "openFile":
            try {
              const uri = vscode.Uri.file(message.filePath);
              await vscode.window.showTextDocument(uri);
            } catch (err) {
              vscode.window.showErrorMessage(`Cannot open file: ${err}`);
            }
            break;
        }
      },
      null,
      this._disposables
    );

    // Trigger analysis immediately — no waiting for a 'ready' message.
    // refreshData() embeds the result directly into webview.html.
    this.refreshData();
  }

  public static createOrShow(extensionUri: vscode.Uri, rootPath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (StateDiagramPanel.currentPanel) {
      StateDiagramPanel.currentPanel._panel.reveal(column);
      StateDiagramPanel.currentPanel.refreshData();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "stateDiagram",
      "MVVM Flutter: State Diagram",
      column || vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    StateDiagramPanel.currentPanel = new StateDiagramPanel(panel, rootPath);
  }

  public async refreshData() {
    if (this._refreshInProgress) { return; }
    this._refreshInProgress = true;
    try {
      const data: ArchitectureDiagramData = await analyzeWorkspaceDependencies(this._rootPath);
      this._lastData = data;
      // Embed data directly in HTML — avoids any message-channel dependency
      this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, data);
    } catch (e) {
      vscode.window.showErrorMessage(`Error generating architecture diagram: ${e}`);
      this._panel.webview.html = this._getErrorHtml(String(e));
    } finally {
      this._refreshInProgress = false;
    }
  }

  public dispose() {
    StateDiagramPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) { x.dispose(); }
    }
  }

  private _getLoadingHtml(): string {
    return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
</head>
<body style="background:#1e1e1e;color:#888;padding:20px;font-family:var(--vscode-font-family,sans-serif);font-size:14px;">
Analyzing project structure\u2026
</body></html>`;
  }

  private _getErrorHtml(message: string): string {
    const safe = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
</head>
<body style="background:#1e1e1e;color:#e74c3c;padding:20px;font-family:var(--vscode-font-family,sans-serif);font-size:14px;">
&#x274C; Error: ${safe}
</body></html>`;
  }

  private _getHtmlForWebview(webview: vscode.Webview, data: ArchitectureDiagramData): string {
    const nonce = crypto.randomBytes(16).toString('base64');
    // Safely embed JSON: escape </script> sequences to prevent early tag close
    const dataJson = JSON.stringify(data).replace(/<\/script>/gi, '<\\/script>');
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; worker-src ${webview.cspSource};">
<title>MVVM Flutter Inspector</title>
<style>
*{box-sizing:border-box;}
body{font-family:var(--vscode-font-family,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif);margin:0;padding:10px;color:var(--vscode-editor-foreground,#ccc);background:var(--vscode-editor-background,#1e1e1e);height:100vh;display:flex;flex-direction:column;overflow:hidden;}
header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border-bottom:1px solid #3c3c3c;padding-bottom:6px;flex-shrink:0;}
h1{font-size:1.1rem;margin:0;font-weight:500;}
.subtitle{font-size:0.75rem;color:#888;margin-left:8px;}
button{background:var(--vscode-button-background,#007acc);color:var(--vscode-button-foreground,#fff);border:none;padding:4px 10px;cursor:pointer;border-radius:2px;font-size:0.8rem;}
button:hover{background:var(--vscode-button-hoverBackground,#005fa3);}
.tabs-bar{display:flex;background:#252526;border-bottom:1px solid #3c3c3c;flex-shrink:0;}
.tab-btn{padding:7px 14px;background:none;border:none;border-bottom:2px solid transparent;color:#888;cursor:pointer;font-size:0.82rem;border-radius:0;}
.tab-btn:hover{background:#1e1e1e;color:#fff;}
.tab-btn.active{background:#1e1e1e;color:#fff;border-bottom:2px solid #007acc;}
.tab-content{display:none;flex:1;min-height:0;overflow:hidden;}
.tab-content.active{display:flex;}
#main-map-layout{flex:1;display:flex;gap:10px;min-height:0;overflow:hidden;padding-top:8px;}
.viewport{flex:1;border:1px solid #3c3c3c;background:#1a1a1a;border-radius:4px;overflow:hidden;position:relative;cursor:grab;user-select:none;}
.viewport:active{cursor:grabbing;}
.zoomable{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;}
.zoom-hud{position:absolute;top:8px;right:8px;display:flex;gap:3px;z-index:200;}
.zoom-hud button{background:rgba(30,30,30,.9);border:1px solid #474747;color:#ccc;width:26px;height:26px;padding:0;font-size:1rem;font-weight:bold;display:flex;align-items:center;justify-content:center;border-radius:3px;}
.zoom-hud button:hover{background:#007acc;color:#fff;border-color:transparent;}
#sidebar{width:230px;background:#252526;border:1px solid #3c3c3c;border-radius:4px;padding:10px;display:flex;flex-direction:column;overflow-y:auto;flex-shrink:0;gap:12px;}
.sb-section{border-bottom:1px solid #3c3c3c;padding-bottom:8px;}
.sb-section:last-child{border-bottom:none;}
.sb-title{font-weight:bold;margin-bottom:5px;font-size:0.78rem;text-transform:uppercase;letter-spacing:.5px;color:#fff;}
.leg-item{display:flex;align-items:center;gap:7px;font-size:0.72rem;margin-bottom:5px;}
.leg-dot{width:11px;height:11px;border-radius:2px;flex-shrink:0;}
/* Graph nodes */
.gnode{position:absolute;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;padding:5px 7px;transition:filter .12s,box-shadow .15s,opacity .12s;}
.gnode:hover{filter:brightness(1.25);}
.gnode.selected{box-shadow:0 0 0 3px #f1c40f !important;}
.gnode.dimmed{opacity:0.14;}
.gnode.lit{filter:brightness(1.4);}
.gnode-label{font-size:0.72rem;color:#fff;font-weight:500;text-align:center;word-break:break-word;line-height:1.25;}
.gnode-sub{font-size:0.6rem;color:#aaa;margin-top:2px;}
.gnode-counters{display:flex;gap:5px;margin-top:3px;justify-content:center;flex-wrap:wrap;}
.dep-out{font-size:0.58rem;color:#3498db;background:rgba(52,152,219,.18);border-radius:2px;padding:0 4px;}
.dep-in{font-size:0.58rem;color:#e67e22;background:rgba(230,126,34,.18);border-radius:2px;padding:0 4px;}
.use-cnt{font-size:0.58rem;color:#9b59b6;background:rgba(155,89,182,.18);border-radius:2px;padding:0 4px;}
/* Zone backgrounds */
.zone-bg{position:absolute;border-radius:6px;border:1px solid;pointer-events:none;z-index:0;}
.zone-feat{background:rgba(15,37,64,.5);border-color:rgba(52,152,219,.2);}
.zone-glob{background:rgba(61,26,0,.5);border-color:rgba(230,126,34,.2);}
.zone-label{position:absolute;font-size:0.58rem;font-weight:bold;text-transform:uppercase;letter-spacing:.7px;z-index:1;pointer-events:none;}
.zone-lbl-feat{color:rgba(52,152,219,.7);}
.zone-lbl-glob{color:rgba(230,126,34,.7);}
/* Map edges */
.edge-path{transition:opacity .12s;}
.edge-path.dimmed{opacity:0.05 !important;}
.edge-path.lit{opacity:1 !important;stroke-width:2.6px !important;}
/* Sidebar search */
.map-search{width:100%;background:#1e1e1e;border:1px solid #3c3c3c;color:#ccc;padding:4px 6px;border-radius:2px;font-size:0.75rem;margin-bottom:6px;outline:none;}
.map-search:focus{border-color:#007acc;}
.sb-group-label{font-size:0.63rem;color:#666;text-transform:uppercase;letter-spacing:.5px;margin:6px 0 3px;font-weight:bold;}
/* Inspector tab */
#inspector-wrap{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;padding-top:8px;}
.insp-header{font-size:0.95rem;font-weight:500;margin-bottom:6px;border-bottom:1px solid #3c3c3c;padding-bottom:5px;color:#007acc;flex-shrink:0;display:flex;align-items:center;justify-content:space-between;}
#anatomy-viewport{flex:1;border:1px solid #3c3c3c;background:#1a1a1a;border-radius:4px;overflow:hidden;position:relative;cursor:grab;user-select:none;}
.connections-legend{position:absolute;bottom:10px;right:10px;background:rgba(20,20,20,.95);border:1px solid #3c3c3c;border-radius:4px;padding:7px 9px;font-size:0.68rem;z-index:150;pointer-events:none;}
.cl-title{font-weight:bold;margin-bottom:3px;color:#fff;text-transform:uppercase;font-size:0.58rem;letter-spacing:.5px;}
.cl-item{display:flex;align-items:center;margin:2px 0;}
.cl-dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px;flex-shrink:0;}
.anatomy-zoomable{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform;display:flex;flex-direction:column;padding:10px;min-width:600px;}
.aflow{display:flex;justify-content:space-around;align-items:center;background:#1e1e1e;border:1px solid #333;border-radius:4px;padding:5px 8px;margin-bottom:8px;font-size:0.75rem;flex-shrink:0;}
.aflow-arrow{font-size:1rem;color:#666;}
.layers-row{display:flex;gap:10px;flex:1;position:relative;}
.layer-col{flex:1;display:flex;flex-direction:column;border-radius:4px;background:#1a1a1a;border:1px solid #2d2d2d;min-width:0;}
.layer-col.pres{border-top:3px solid #8e44ad;}
.layer-col.uc{border-top:3px solid #f1c40f;}
.layer-col.dom{border-top:3px solid #f39c12;}
.layer-col.dat{border-top:3px solid #16a085;}
.layer-head{font-weight:bold;padding:5px 8px;font-size:0.8rem;display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.02);border-bottom:1px solid #2d2d2d;}
.layer-head.pres{color:#d7bde2;}
.layer-head.uc{color:#fef9e7;}
.layer-head.dom{color:#fdebd0;}
.layer-head.dat{color:#d1f2eb;}
.layer-body{overflow-y:auto;padding:5px;display:flex;flex-direction:column;gap:6px;}
.file-card{background:#222;border-radius:3px;padding:5px 7px;border:1px solid #2e2e2e;}
.fname{font-family:monospace;font-size:0.75rem;color:#ddd;word-break:break-all;}
.cbadge{display:inline-block;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#bbb;font-size:0.68rem;padding:0 3px;border-radius:2px;margin:2px 2px 0 0;font-family:monospace;}
.prov-card{background:rgba(255,255,255,.02);border-radius:3px;padding:4px 7px;margin-top:3px;border-left:3px solid #007acc;cursor:pointer;transition:background .15s,border-left-color .15s,transform .1s;}
.prov-card:hover{background:rgba(255,255,255,.05);transform:scale(1.01);}
.prov-card.dep-out{border-left-color:#f39c12 !important;background:rgba(243,156,18,.06);}
.prov-card.dep-in{border-left-color:#3498db !important;background:rgba(52,152,219,.06);}
.prov-card.active-prov{border-left-color:#f1c40f !important;background:rgba(241,196,15,.08);box-shadow:0 0 4px rgba(241,196,15,.25);}
.prov-name{font-family:monospace;font-size:0.73rem;font-weight:500;color:#76d7c4;word-break:break-all;}
.prov-meta{font-size:0.67rem;color:#888;display:flex;flex-wrap:wrap;gap:3px;margin-top:1px;}
.badge-t{background:#2c3e50;color:#bdc3c7;padding:0 3px;border-radius:1px;}
.badge-r{background:rgba(0,122,204,.15);color:#3498db;padding:0 3px;border-radius:1px;}
#conn-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:10;}
.conn-path{fill:none;stroke-width:1.8px;stroke-linecap:round;opacity:.8;stroke-dasharray:5 3;animation:flow 30s linear infinite;}
@keyframes flow{to{stroke-dashoffset:-500;}}
.violations-panel{flex-shrink:0;background:#2d1515;border:1px solid #5a2222;border-radius:4px;padding:7px 10px;margin-top:6px;max-height:120px;overflow-y:auto;}
.viol-title{font-size:0.75rem;font-weight:bold;color:#e74c3c;margin-bottom:4px;}
.viol-item{font-size:0.7rem;line-height:1.4;margin-bottom:3px;padding-left:8px;border-left:2px solid #c0392b;}
.viol-item.warning{border-left-color:#e67e22;color:#e67e22;}
.viol-item.error{border-left-color:#e74c3c;color:#e74c3c;}
</style>
</head>
<body>
<header>
  <div style="display:flex;align-items:center;">
    <h1>MVVM Flutter: State &amp; Dependency Inspector</h1>
    <span class="subtitle">Riverpod 2.0 / 3.0</span>
  </div>
  <button id="refreshBtn">Refresh</button>
</header>

<div class="tabs-bar">
  <button class="tab-btn active" id="tbMap">Dependency Map</button>
  <button class="tab-btn" id="tbInsp">3-Layer Inspector</button>
</div>

<!-- TAB 1: Dependency Map -->
<div class="tab-content active" id="tab-map">
  <div id="main-map-layout">
    <div id="map-viewport" class="viewport">
      <div class="zoom-hud">
        <button id="mapZIn">+</button>
        <button id="mapZOut">-</button>
        <button id="mapZRst">&#x21ba;</button>
      </div>
      <div id="map-canvas" class="zoomable">
        <div id="map-loading" style="padding:20px;color:#888;font-style:italic;">Analysing project structure...</div>
      </div>
    </div>

    <div id="sidebar">
      <div class="sb-section">
        <div class="sb-title">Nodes</div>
        <input id="map-search" class="map-search" type="text" placeholder="Filter…" autocomplete="off"/>
        <div id="feat-list" style="display:flex;flex-direction:column;gap:3px;max-height:200px;overflow-y:auto;padding-right:3px;">
        </div>
      </div>
      <div class="sb-section">
        <div class="sb-title">Legend</div>
        <div class="leg-item"><div class="leg-dot" style="background:#0f2a1a;border:1px solid #2ecc71;"></div><span>Standalone Feature</span></div>
        <div class="leg-item"><div class="leg-dot" style="background:#0f2540;border:1px solid #3498db;"></div><span>Feature with Deps</span></div>
        <div class="leg-item"><div class="leg-dot" style="background:#3d1a00;border:1px solid #e67e22;"></div><span>Global Provider</span></div>
        <div style="margin-top:6px;border-top:1px solid #333;padding-top:5px;">
          <div class="leg-item"><span style="display:inline-block;width:18px;height:2px;background:#3498db;margin-right:7px;"></span><span>Feature → Feature</span></div>
          <div class="leg-item"><span style="display:inline-block;width:18px;height:2px;background:#e67e22;border-top:2px dashed #e67e22;height:0;margin-right:7px;"></span><span>Feature → Global</span></div>
          <div class="leg-item"><span style="display:inline-block;width:18px;height:0;border-top:2px dashed #9b59b6;margin-right:7px;"></span><span>Global → Feature</span></div>
        </div>
        <div style="margin-top:5px;border-top:1px solid #333;padding-top:5px;">
          <div class="leg-item" style="gap:4px;"><span class="dep-out">→N</span><span style="font-size:0.68rem;">outgoing deps</span></div>
          <div class="leg-item" style="gap:4px;"><span class="dep-in">←N</span><span style="font-size:0.68rem;">incoming deps</span></div>
          <div class="leg-item" style="gap:4px;"><span class="use-cnt">×N used</span><span style="font-size:0.68rem;">feature usages</span></div>
        </div>
      </div>
      <div class="sb-section">
        <div class="sb-title">Details</div>
        <div id="detail-panel" style="font-size:0.78rem;line-height:1.4;">
          <i style="color:#666;">Click a node to inspect.</i>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- TAB 2: 3-Layer Inspector -->
<div class="tab-content" id="tab-inspector">
  <div id="inspector-wrap">
    <div class="insp-header">
      <span id="insp-title">3-Layer Inspector — select a feature from the Map tab</span>
    </div>
    <div id="violations-wrap" style="display:none;"></div>
    <div id="anatomy-viewport" class="viewport">
      <div class="zoom-hud">
        <button id="anatZIn">+</button>
        <button id="anatZOut">-</button>
        <button id="anatZRst">&#x21ba;</button>
      </div>
      <div class="connections-legend">
        <div class="cl-title">Connection Legend</div>
        <div class="cl-item"><span class="cl-dot" style="background:#f39c12;"></span><span>Depends On (outgoing)</span></div>
        <div class="cl-item"><span class="cl-dot" style="background:#3498db;"></span><span>Used By (incoming)</span></div>
        <div class="cl-item" style="margin-top:4px;border-top:1px dashed #444;padding-top:3px;font-size:0.62rem;"><span style="color:#85ebc3;font-style:italic;">Labels: watch / read / listen</span></div>
      </div>
      <svg id="conn-svg"></svg>
      <div id="anatomy-canvas" class="anatomy-zoomable">
        <div style="display:flex;align-items:center;justify-content:center;color:#666;font-style:italic;font-size:0.82rem;padding:20px;">
          Select a feature from the Dependency Map to inspect its 3-layer structure.
        </div>
      </div>
    </div>
  </div>
</div>

<script nonce="${nonce}">
var vscode = acquireVsCodeApi();
var _data = null;
var _selectedId = null;
var _hoveredProvId = null;

// ── Map zoom/pan ──────────────────────────────────────────────────────────────
var mSx=1, mTx=0, mTy=0, mDrag=false, mDx=0, mDy=0;
var mapVp = document.getElementById('map-viewport');
var mapCanvas = document.getElementById('map-canvas');

function updateMapT(){mapCanvas.style.transform='translate('+mTx+'px,'+mTy+'px) scale('+mSx+')';}
mapVp.addEventListener('mousedown',function(e){
  if(e.button!==0)return;
  if(e.target.closest('.gnode,button'))return;
  mDrag=true;mapVp.style.cursor='grabbing';
  mDx=e.clientX-mTx;mDy=e.clientY-mTy;
});
window.addEventListener('mousemove',function(e){
  if(!mDrag)return;
  mTx=e.clientX-mDx;mTy=e.clientY-mDy;updateMapT();
});
window.addEventListener('mouseup',function(){if(mDrag){mDrag=false;mapVp.style.cursor='grab';}});
mapVp.addEventListener('wheel',function(e){
  e.preventDefault();
  var f=e.deltaY<0?1.08:0.925;
  var ns=Math.min(Math.max(mSx*f,.2),4);
  var r=mapVp.getBoundingClientRect();
  var mx=e.clientX-r.left,my=e.clientY-r.top;
  mTx=mx-(mx-mTx)*(ns/mSx);mTy=my-(my-mTy)*(ns/mSx);
  mSx=ns;updateMapT();
},{passive:false});
function mapZoomIn(e){if(e)e.stopPropagation();_zoomCenter(true);}
function mapZoomOut(e){if(e)e.stopPropagation();_zoomCenter(false);}
function mapZoomReset(e){if(e)e.stopPropagation();mSx=1;mTx=0;mTy=0;updateMapT();}
function _zoomCenter(zIn){
  var ns=Math.min(Math.max(mSx+(zIn ? .18 : -.18),.2),4);
  var r=mapVp.getBoundingClientRect();
  var cx=r.width/2,cy=r.height/2;
  mTx=cx-(cx-mTx)*(ns/mSx);mTy=cy-(cy-mTy)*(ns/mSx);mSx=ns;updateMapT();
}

// ── Anatomy zoom/pan ──────────────────────────────────────────────────────────
var aSx=1, aTx=0, aTy=0, aDrag=false, aDx=0, aDy=0;
var anatVp = document.getElementById('anatomy-viewport');
var anatCanvas = document.getElementById('anatomy-canvas');

function updateAnatT(){
  anatCanvas.style.transform='translate('+aTx+'px,'+aTy+'px) scale('+aSx+')';
  _redrawConn();
}
anatVp.addEventListener('mousedown',function(e){
  if(e.button!==0)return;
  if(e.target.closest('.prov-card,.layer-body,button'))return;
  aDrag=true;anatVp.style.cursor='grabbing';
  aDx=e.clientX-aTx;aDy=e.clientY-aTy;
});
window.addEventListener('mousemove',function(e){
  if(!aDrag)return;
  aTx=e.clientX-aDx;aTy=e.clientY-aDy;updateAnatT();
});
window.addEventListener('mouseup',function(){if(aDrag){aDrag=false;anatVp.style.cursor='grab';}});
anatVp.addEventListener('wheel',function(e){
  if(e.target.closest('.layer-body'))return;
  e.preventDefault();
  var f=e.deltaY<0?1.08:0.925;
  var ns=Math.min(Math.max(aSx*f,.2),3);
  var r=anatVp.getBoundingClientRect();
  var mx=e.clientX-r.left,my=e.clientY-r.top;
  aTx=mx-(mx-aTx)*(ns/aSx);aTy=my-(my-aTy)*(ns/aSx);
  aSx=ns;updateAnatT();
},{passive:false});
function anatZoomIn(e){if(e)e.stopPropagation();_anatZoomCenter(true);}
function anatZoomOut(e){if(e)e.stopPropagation();_anatZoomCenter(false);}
function anatZoomReset(e){if(e)e.stopPropagation();aSx=1;aTx=0;aTy=0;updateAnatT();}
function _anatZoomCenter(zIn){
  var ns=Math.min(Math.max(aSx+(zIn ? .18 : -.18),.2),3);
  var r=anatVp.getBoundingClientRect();
  var cx=r.width/2,cy=r.height/2;
  aTx=cx-(cx-aTx)*(ns/aSx);aTy=cy-(cy-aTy)*(ns/aSx);aSx=ns;updateAnatT();
}
window.addEventListener('resize',_redrawConn);

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(t){
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  document.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active');});
  if(t==='map'){
    document.getElementById('tbMap').classList.add('active');
    document.getElementById('tab-map').classList.add('active');
  } else {
    document.getElementById('tbInsp').classList.add('active');
    document.getElementById('tab-inspector').classList.add('active');
    setTimeout(_redrawConn,80);
  }
}

// ── Refresh button ────────────────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click',function(){
  var loading=document.getElementById('map-loading');
  if(!loading){
    loading=document.createElement('div');
    loading.id='map-loading';
    loading.style.cssText='padding:20px;color:#888;font-style:italic;';
    var canvas=document.getElementById('map-canvas');
    if(canvas){canvas.innerHTML='';canvas.appendChild(loading);}
  }
  loading.style.display='';
  loading.textContent='Refreshing...';
  vscode.postMessage({command:'refresh'});
});

// ── Messages from extension (anatomy only — initial data is embedded) ─────────
window.addEventListener('message',function(ev){
  var msg=ev.data;
  if(msg.command==='setAnatomy'){
    try{_renderAnatomy(msg.anatomy);}
    catch(err){
      document.getElementById('insp-title').textContent='Inspector error: '+String(err);
    }
  }
  if(msg.command==='setAnatomyError'){
    document.getElementById('insp-title').innerHTML=
      '<span style="color:#e74c3c;">&#x274C; Error loading '+_esc(msg.featureName)+': '+_esc(msg.message)+'</span>';
  }
});

// ── Bootstrap: render from embedded data immediately ──────────────────────────
(function(){
  try {
    var initData = ${dataJson};
    _data = initData;
    _renderMap(initData);
  } catch(e) {
    var el = document.getElementById('map-loading');
    if(el){ el.style.display=''; el.innerHTML='<span style="color:#e74c3c;">Init error: '+_esc(String(e))+'</span>'; }
  }
})();

// ── Dependency Map renderer ───────────────────────────────────────────────────
function _renderMap(data){
  var nodes=data.nodes||[];
  var edges=data.edges||[];
  var canvas=document.getElementById('map-canvas');
  var loading=document.getElementById('map-loading');

  if(nodes.length===0){
    if(!loading){
      loading=document.createElement('div');
      loading.id='map-loading';
      loading.style.cssText='padding:20px;color:#888;font-style:italic;';
      canvas.innerHTML='';
      canvas.appendChild(loading);
    }
    loading.style.display='';
    loading.innerHTML='<i>No architecture detected. Make sure your Flutter project has a <code>lib/features/</code> folder.</i>';
    return;
  }
  if(loading){loading.style.display='none';}

  var NW=186, NH=64, HG=18, VG=14, ZP=10, ZLH=24, ZONE_GAP=20;
  var features=nodes.filter(function(n){return n.group==='feature';});
  var globals=nodes.filter(function(n){return n.group==='global_provider';});
  var nodeById={};
  nodes.forEach(function(n){ nodeById[n.id]=n; });

  // ── Compute dependency counts ─────────────────────────────────────────────
  var outCount={}, inCount={}, globUsage={};
  nodes.forEach(function(n){ outCount[n.id]=0; inCount[n.id]=0; globUsage[n.id]=0; });
  edges.forEach(function(e){
    outCount[e.from]=(outCount[e.from]||0)+1;
    inCount[e.to]=(inCount[e.to]||0)+1;
    var toNode=nodeById[e.to];
    if(toNode&&toNode.group==='global_provider'){
      globUsage[e.to]=(globUsage[e.to]||0)+1;
    }
  });

  // ── Sort: features by total connections desc, then alpha ──────────────────
  features.sort(function(a,b){
    var ca=(outCount[a.id]||0)+(inCount[a.id]||0);
    var cb=(outCount[b.id]||0)+(inCount[b.id]||0);
    if(cb!==ca)return cb-ca;
    return a.label.localeCompare(b.label);
  });
  // Sort globals: most used first, then alpha
  globals.sort(function(a,b){
    var ua=globUsage[a.id]||0, ub=globUsage[b.id]||0;
    if(ub!==ua)return ub-ua;
    return a.label.localeCompare(b.label);
  });

  // ── Layout ────────────────────────────────────────────────────────────────
  var FEAT_COLS=Math.min(4, features.length||1);
  var GLOB_COLS=Math.min(5, globals.length||1);
  var pos={};

  features.forEach(function(n,i){
    var col=i%FEAT_COLS, row=Math.floor(i/FEAT_COLS);
    pos[n.id]={x:ZP+col*(NW+HG), y:ZLH+ZP+row*(NH+VG)};
  });

  var featRows=Math.ceil(features.length/FEAT_COLS)||1;
  var featZoneH=ZLH+ZP+featRows*(NH+VG)+ZP;
  var FEAT_ZONE_W=ZP+FEAT_COLS*(NW+HG)-HG+ZP;

  var globZoneY=features.length>0 ? featZoneH+ZONE_GAP : 0;
  globals.forEach(function(n,i){
    var col=i%GLOB_COLS, row=Math.floor(i/GLOB_COLS);
    pos[n.id]={x:ZP+col*(NW+HG), y:globZoneY+ZLH+ZP+row*(NH+VG)};
  });

  var globRows=Math.ceil(globals.length/GLOB_COLS)||0;
  var globZoneH=globals.length>0 ? ZLH+ZP+globRows*(NH+VG)+ZP : 0;
  var GLOB_ZONE_W=globals.length>0 ? ZP+GLOB_COLS*(NW+HG)-HG+ZP : 0;

  var totalW=Math.max(FEAT_ZONE_W, GLOB_ZONE_W, 300)+10;
  var totalH=(globals.length>0 ? globZoneY+globZoneH : featZoneH)+10;

  // ── Zone background divs ──────────────────────────────────────────────────
  var zoneHtml='';
  if(features.length>0){
    zoneHtml+='<div class="zone-bg zone-feat" style="left:0;top:0;width:'+FEAT_ZONE_W+'px;height:'+featZoneH+'px;"></div>'
      +'<div class="zone-label zone-lbl-feat" style="left:8px;top:6px;">Features ('+features.length+')</div>';
  }
  if(globals.length>0){
    zoneHtml+='<div class="zone-bg zone-glob" style="left:0;top:'+globZoneY+'px;width:'+GLOB_ZONE_W+'px;height:'+globZoneH+'px;"></div>'
      +'<div class="zone-label zone-lbl-glob" style="left:8px;top:'+(globZoneY+6)+'px;">Global Providers ('+globals.length+') · sorted by usage</div>';
  }

  // ── SVG edges ─────────────────────────────────────────────────────────────
  var svgDefs='<defs>'
    +'<marker id="marr-feat" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#3498db"/></marker>'
    +'<marker id="marr-glob" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#e67e22"/></marker>'
    +'<marker id="marr-rev" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#9b59b6"/></marker>'
    +'</defs>';
  var svgPaths='';

  edges.forEach(function(e){
    var fp=pos[e.from],tp=pos[e.to];
    if(!fp||!tp)return;
    var fromNode=nodeById[e.from],toNode=nodeById[e.to];
    var fromIsGlob=fromNode&&fromNode.group==='global_provider';
    var toIsGlob=toNode&&toNode.group==='global_provider';
    var stroke,dash,marker,sw;
    if(!fromIsGlob&&!toIsGlob){stroke='#3498db';dash='';marker='marr-feat';sw='2';}
    else if(!fromIsGlob&&toIsGlob){stroke='#e67e22';dash='stroke-dasharray="5 3"';marker='marr-glob';sw='1.5';}
    else{stroke='#9b59b6';dash='stroke-dasharray="3 4"';marker='marr-rev';sw='1.3';}

    var x1,y1,x2,y2;
    if(fp.x+NW<=tp.x){x1=fp.x+NW;y1=fp.y+NH/2;x2=tp.x;y2=tp.y+NH/2;}
    else if(tp.x+NW<=fp.x){x1=fp.x;y1=fp.y+NH/2;x2=tp.x+NW;y2=tp.y+NH/2;}
    else if(fp.y+NH<=tp.y){x1=fp.x+NW/2;y1=fp.y+NH;x2=tp.x+NW/2;y2=tp.y;}
    else{x1=fp.x+NW/2;y1=fp.y;x2=tp.x+NW/2;y2=tp.y+NH;}
    var cpx=(x1+x2)/2;

    svgPaths+='<path class="edge-path" data-from="'+_esc(e.from)+'" data-to="'+_esc(e.to)+'"'
      +' d="M '+x1+' '+y1+' C '+cpx+' '+y1+','+cpx+' '+y2+','+x2+' '+y2+'"'
      +' stroke="'+stroke+'" stroke-width="'+sw+'" fill="none" '+dash
      +' marker-end="url(#'+marker+')" opacity="0.72"/>';
  });

  var svgEl='<svg style="position:absolute;left:0;top:0;width:'+totalW+'px;height:'+totalH+'px;z-index:2;pointer-events:none;overflow:visible;">'
    +svgDefs+svgPaths+'</svg>';

  // ── Node divs ─────────────────────────────────────────────────────────────
  var nodesHtml='';
  nodes.forEach(function(n){
    var p=pos[n.id];
    if(!p)return;
    var isGlob=(n.group==='global_provider');
    var bg,border;
    if(isGlob){bg='#3d1a00';border='#e67e22';}
    else if((outCount[n.id]||0)+(inCount[n.id]||0)>0){bg='#0f2540';border='#3498db';}
    else{bg='#0f2a1a';border='#2ecc71';}

    var countersHtml='';
    if(isGlob){
      var usages=globUsage[n.id]||0;
      if(usages>0)countersHtml='<div class="gnode-counters"><span class="use-cnt">\xd7'+usages+' used</span></div>';
      else countersHtml='<div class="gnode-sub">Global Provider</div>';
    } else {
      var parts=[];
      if((outCount[n.id]||0)>0)parts.push('<span class="dep-out">→'+(outCount[n.id])+'</span>');
      if((inCount[n.id]||0)>0)parts.push('<span class="dep-in">←'+(inCount[n.id])+'</span>');
      countersHtml=parts.length>0
        ?'<div class="gnode-counters">'+parts.join('')+'</div>'
        :'<div class="gnode-sub">Feature</div>';
    }
    nodesHtml+='<div class="gnode" data-nid="'+_esc(n.id)+'"'
      +' style="left:'+p.x+'px;top:'+p.y+'px;width:'+NW+'px;height:'+NH+'px;z-index:3;'
      +'background:'+bg+';border:2px solid '+border+';">'
      +'<div class="gnode-label">'+_esc(n.label)+'</div>'
      +countersHtml
      +'</div>';
  });

  canvas.innerHTML='<div style="position:relative;width:'+totalW+'px;height:'+totalH+'px;">'
    +zoneHtml+svgEl+nodesHtml+'</div>';

  // ── Sidebar ───────────────────────────────────────────────────────────────
  var fl=document.getElementById('feat-list');
  fl.innerHTML='';
  function _addSbGroup(list, label){
    if(list.length===0)return;
    var gl=document.createElement('div');
    gl.className='sb-group-label';
    gl.textContent=label+' ('+list.length+')';
    fl.appendChild(gl);
    list.forEach(function(n){
      var isGlob=(n.group==='global_provider');
      var bg=isGlob?'#3d1a00':((outCount[n.id]||0)+(inCount[n.id]||0)>0?'#0f2540':'#0f2a1a');
      var div=document.createElement('div');
      div.className='sb-node-item';
      div.setAttribute('data-label',n.label.toLowerCase());
      div.style.cssText='padding:3px 6px;border-radius:3px;background:'+bg+';color:#fff;font-size:0.72rem;cursor:pointer;font-family:monospace;';
      div.textContent=n.label;
      div.addEventListener('click',function(){_selectNode(n,data);});
      fl.appendChild(div);
    });
  }
  _addSbGroup(features,'Features');
  _addSbGroup(globals,'Global Providers');

  var searchEl=document.getElementById('map-search');
  if(searchEl){
    searchEl.value='';
    searchEl.oninput=function(){
      var q=this.value.trim().toLowerCase();
      document.querySelectorAll('.sb-node-item').forEach(function(el){
        var lbl=el.getAttribute('data-label')||'';
        el.style.display=(q===''||lbl.includes(q))?'':'none';
      });
    };
  }

  // ── Interaction: hover highlight ──────────────────────────────────────────
  canvas.querySelectorAll('.gnode').forEach(function(el){
    el.addEventListener('click',function(ev){
      ev.stopPropagation();
      var id=el.getAttribute('data-nid');
      var node=nodes.find(function(n){return n.id===id;});
      if(node)_selectNode(node,data);
    });
    el.addEventListener('mouseenter',function(){
      _highlightMapNode(el.getAttribute('data-nid'),edges);
    });
    el.addEventListener('mouseleave',_clearMapHighlight);
  });

  mapZoomReset();
}

function _highlightMapNode(nodeId,edges){
  var related=new Set([nodeId]);
  edges.forEach(function(e){
    if(e.from===nodeId)related.add(e.to);
    if(e.to===nodeId)related.add(e.from);
  });
  document.querySelectorAll('.gnode').forEach(function(el){
    var id=el.getAttribute('data-nid');
    el.classList.remove('dimmed','lit');
    if(id===nodeId){el.classList.add('lit');}
    else if(!related.has(id)){el.classList.add('dimmed');}
  });
  document.querySelectorAll('.edge-path').forEach(function(path){
    var from=path.getAttribute('data-from');
    var to=path.getAttribute('data-to');
    path.classList.remove('dimmed','lit');
    if(from===nodeId||to===nodeId){path.classList.add('lit');}
    else{path.classList.add('dimmed');}
  });
}

function _clearMapHighlight(){
  document.querySelectorAll('.gnode').forEach(function(el){el.classList.remove('dimmed','lit');});
  document.querySelectorAll('.edge-path').forEach(function(path){path.classList.remove('dimmed','lit');});
}

function _selectNode(node,data){
  _selectedId=node.id;
  // Highlight
  document.querySelectorAll('.gnode').forEach(function(el){el.classList.remove('selected');});
  var el=document.querySelector('.gnode[data-nid="'+node.id+'"]');
  if(el)el.classList.add('selected');
  // Detail panel
  _showDetail(node,data);
  // Request anatomy with immediate loading feedback
  if(node.group!=='global_provider'){
    document.getElementById('insp-title').innerHTML=
      'Loading anatomy for <span style="color:#f1c40f;font-family:monospace;">'+_esc(node.id.toUpperCase())+'</span>\u2026';
    vscode.postMessage({command:'getAnatomy',featureName:node.id});
  }
}

function _showDetail(node,data){
  var isGlob=(node.group==='global_provider');
  var edges=data.edges||[];
  var out=edges.filter(function(e){return e.from===node.id;}).map(function(e){return e.to;});
  var inc=edges.filter(function(e){return e.to===node.id;}).map(function(e){return e.from;});

  var h='<div style="margin-bottom:6px;"><strong>Name:</strong> <span style="font-family:monospace;color:#f1c40f;">'+_esc(node.label)+'</span></div>'
    +'<div style="margin-bottom:8px;"><strong>Type:</strong> '+(isGlob?'<span style="color:#e67e22;">Global Provider</span>':'<span style="color:#3498db;">Feature</span>')+'</div>';
  if(out.length){
    h+='<div style="font-weight:bold;color:#f39c12;margin-bottom:3px;">Depends on:</div><ul style="margin:0 0 8px;padding-left:14px;">'
      +out.map(function(d){return '<li style="font-size:0.72rem;font-family:monospace;">'+_esc(d)+'</li>';}).join('')+'</ul>';
  }
  if(inc.length){
    h+='<div style="font-weight:bold;color:#3498db;margin-bottom:3px;">Used by:</div><ul style="margin:0;padding-left:14px;">'
      +inc.map(function(d){return '<li style="font-size:0.72rem;font-family:monospace;">'+_esc(d)+'</li>';}).join('')+'</ul>';
  }
  if(isGlob){
    var gp=(data.globalProviders||[]).find(function(p){return p.name===node.id;});
    if(gp){h+='<div style="margin-top:7px;border-top:1px solid #333;padding-top:6px;font-size:0.72rem;">'
      +'<div><strong>Type:</strong> '+_esc(gp.providerType)+'</div>'
      +'<div><strong>Returns:</strong> '+_esc(gp.returnType)+'</div>'
      +'<div style="color:#666;word-break:break-all;margin-top:2px;">'+_esc(gp.definedInFile||'')+'</div></div>';}
  } else {
    h+='<div style="margin-top:7px;"><button data-action="open-inspector" style="width:100%;font-size:0.72rem;padding:3px;">Open Inspector &#x1F52C;</button></div>';
  }
  document.getElementById('detail-panel').innerHTML=h;
}

// ── Anatomy renderer ──────────────────────────────────────────────────────────
function _renderAnatomy(anatomy){
  document.getElementById('insp-title').innerHTML=
    '3-Layer Inspector: <span style="color:#f1c40f;font-family:monospace;">'+_esc(anatomy.featureName.toUpperCase())+'</span>'
    +'<span style="font-size:0.7rem;color:#888;font-weight:normal;margin-left:10px;">Presentation &#x27A1; Domain &#x27A1; Data</span>';

  // Violations panel
  var vw=document.getElementById('violations-wrap');
  var viols=anatomy.layerViolations||[];
  if(viols.length>0){
    var vh='<div class="violations-panel"><div class="viol-title">Layer Violations ('+viols.length+')</div>';
    viols.forEach(function(v){
      vh+='<div class="viol-item '+v.severity+'">'+_esc(v.message)+'</div>';
    });
    vh+='</div>';
    vw.innerHTML=vh;vw.style.display='';
  } else {
    vw.innerHTML='';vw.style.display='none';
  }

  function buildLayer(layerData){
    if(!layerData||layerData.files.length===0){
      return '<div style="color:#444;text-align:center;padding:10px;font-size:0.72rem;font-style:italic;">No files detected</div>';
    }
    return layerData.files.map(function(file){
      var classHtml='';
      if(file.classes&&file.classes.length){
        classHtml='<div style="margin-top:2px;">'
          +file.classes.map(function(c){return '<span class="cbadge">'+_esc(c)+'</span>';}).join('')
          +'</div>';
      }
      var provHtml='';
      if(file.providers&&file.providers.length){
        provHtml=file.providers.map(function(p){
          var cid='prov-'+p.name.replace(/[^a-zA-Z0-9_]/g,'_');
          return '<div class="prov-card" id="'+cid+'"'
            +' data-pname="'+_esc(p.name)+'"'
            +' data-apath="'+_esc(p.absolutePath||'')+'"'
            +' data-deps=\\''+JSON.stringify(p.dependencies||[])+'\\''
            +' data-dep-details=\\''+JSON.stringify(p.dependencyDetails||[])+'\\'>'
            +'<div class="prov-name">'+_esc(p.name)+'</div>'
            +'<div class="prov-meta">'
            +'<span class="badge-t">'+_esc(p.providerType)+'</span>'
            +'<span class="badge-r">'+_esc(p.returnType)+'</span>'
            +'</div></div>';
        }).join('');
      }
      return '<div class="file-card">'
        +'<div class="fname" title="'+_esc(file.relativePath)+'">'+_esc(file.fileName)+'</div>'
        +classHtml+provHtml+'</div>';
    }).join('');
  }

  var presCount=anatomy.presentation.totalProviderCount;
  var domCount=anatomy.domain.totalProviderCount;
  var datCount=anatomy.data.totalProviderCount;
  var hasUseCases=anatomy.useCases&&anatomy.useCases.files.length>0;
  var ucCount=hasUseCases?anatomy.useCases.totalProviderCount:0;

  var flowBar='<div class="aflow">'
    +'<div style="text-align:center;flex:1;"><strong style="color:#d7bde2;">PRESENTATION</strong><div style="font-size:0.65rem;color:#777;">UI &amp; Controllers</div></div>'
    +'<div class="aflow-arrow">&#x27A1;</div>';
  if(hasUseCases){
    flowBar+='<div style="text-align:center;flex:1;"><strong style="color:#fef9e7;">USE CASES</strong><div style="font-size:0.65rem;color:#777;">Business Logic</div></div>'
      +'<div class="aflow-arrow">&#x27A1;</div>';
  }
  flowBar+='<div style="text-align:center;flex:1;"><strong style="color:#fdebd0;">DOMAIN</strong><div style="font-size:0.65rem;color:#777;">Entities &amp; Repos</div></div>'
    +'<div class="aflow-arrow">&#x27A1;</div>'
    +'<div style="text-align:center;flex:1;"><strong style="color:#d1f2eb;">DATA</strong><div style="font-size:0.65rem;color:#777;">Repos &amp; Sources</div></div>'
    +'</div>';

  var ucCol=hasUseCases
    ?'<div class="layer-col uc">'
        +'<div class="layer-head uc"><span>Use Cases</span>'
          +'<span class="cbadge" style="background:rgba(241,196,15,.15);border-color:#f1c40f;color:#fef9e7;">'+ucCount+' prov</span></div>'
        +'<div class="layer-body">'+buildLayer(anatomy.useCases)+'</div>'
      +'</div>'
    :'';

  var html=flowBar
    +'<div class="layers-row">'
      +'<div class="layer-col pres">'
        +'<div class="layer-head pres"><span>Presentation</span>'
          +'<span class="cbadge" style="background:rgba(142,68,173,.15);border-color:#8e44ad;color:#d7bde2;">'+presCount+' prov</span></div>'
        +'<div class="layer-body">'+buildLayer(anatomy.presentation)+'</div>'
      +'</div>'
      +ucCol
      +'<div class="layer-col dom">'
        +'<div class="layer-head dom"><span>Domain</span>'
          +'<span class="cbadge" style="background:rgba(243,156,18,.15);border-color:#f39c12;color:#fdebd0;">'+domCount+' prov</span></div>'
        +'<div class="layer-body">'+buildLayer(anatomy.domain)+'</div>'
      +'</div>'
      +'<div class="layer-col dat">'
        +'<div class="layer-head dat"><span>Data</span>'
          +'<span class="cbadge" style="background:rgba(22,160,133,.15);border-color:#16a085;color:#d1f2eb;">'+datCount+' prov</span></div>'
        +'<div class="layer-body">'+buildLayer(anatomy.data)+'</div>'
      +'</div>'
    +'</div>';

  anatCanvas.innerHTML=html;
  anatCanvas.style.display='flex';
  anatCanvas.style.flexDirection='column';
  anatZoomReset();

  setTimeout(function(){
    document.querySelectorAll('.prov-card').forEach(function(card){
      card.addEventListener('mouseenter',function(){
        _hoveredProvId=card.id;
        _drawConnections(card.id);
      });
      card.addEventListener('mouseleave',function(){
        _clearConnections();
      });
      // Click to open file
      card.addEventListener('click',function(){
        var ap=card.getAttribute('data-apath');
        if(ap&&ap.length>0){
          vscode.postMessage({command:'openFile',filePath:ap});
        }
      });
    });
    document.querySelectorAll('.layer-body').forEach(function(lb){
      lb.addEventListener('scroll',_redrawConn);
    });
  },80);
}

// ── SVG connection drawing (fanned bezier curves) ─────────────────────────────
function _drawConnections(targetId){
  var svg=document.getElementById('conn-svg');
  if(!svg)return;
  svg.innerHTML=_arrowDefs(aSx);

  var targetCard=document.getElementById(targetId);
  if(!targetCard)return;

  var tName=targetCard.getAttribute('data-pname');
  var tDeps=JSON.parse(targetCard.getAttribute('data-deps')||'[]');
  var tDepsD=JSON.parse(targetCard.getAttribute('data-dep-details')||'[]');

  document.querySelectorAll('.prov-card').forEach(function(c){c.classList.remove('active-prov','dep-out','dep-in');});
  targetCard.classList.add('active-prov');

  var conns=[];

  // Outgoing
  tDeps.forEach(function(depName){
    var dc=document.querySelector('.prov-card[data-pname="'+depName+'"]');
    if(dc){
      dc.classList.add('dep-out');
      var detail=tDepsD.find(function(d){return d.name===depName;});
      conns.push({from:targetCard,to:dc,color:'#f39c12',label:(detail?detail.type:'watch')});
    }
  });

  // Incoming
  document.querySelectorAll('.prov-card').forEach(function(oc){
    if(oc===targetCard)return;
    var od=JSON.parse(oc.getAttribute('data-deps')||'[]');
    if(od.indexOf(tName)>=0){
      oc.classList.add('dep-in');
      var odd=JSON.parse(oc.getAttribute('data-dep-details')||'[]');
      var detail=odd.find(function(d){return d.name===tName;});
      conns.push({from:oc,to:targetCard,color:'#3498db',label:(detail?detail.type:'watch')});
    }
  });

  // Fan grouping
  var sCount={},eCount={};
  conns.forEach(function(c){
    sCount[c.from.id]=(sCount[c.from.id]||0)+1;
    eCount[c.to.id]=(eCount[c.to.id]||0)+1;
  });
  var sCur={},eCur={};
  Object.keys(sCount).forEach(function(id){sCur[id]=0;});
  Object.keys(eCount).forEach(function(id){eCur[id]=0;});

  conns.forEach(function(c){
    var si=sCur[c.from.id]++;
    var ei=eCur[c.to.id]++;
    _bezierArrow(c.from,c.to,c.color,svg,si,sCount[c.from.id],ei,eCount[c.to.id],c.label);
  });
}

function _bezierArrow(fromEl,toEl,color,svg,si,st,ei,et,label){
  var vp=anatVp.getBoundingClientRect();
  var fr=fromEl.getBoundingClientRect();
  var tr=toEl.getBoundingClientRect();

  function ux(v){return (v-aTx)/aSx;}
  function uy(v){return (v-aTy)/aSx;}

  var fy=uy(fr.top-vp.top)+(fr.height/aSx)*_fanY(si,st);
  var ty=uy(tr.top-vp.top)+(tr.height/aSx)*_fanY(ei,et);
  var fx_r=ux(fr.right-vp.left),fx_l=ux(fr.left-vp.left);
  var tx_r=ux(tr.right-vp.left),tx_l=ux(tr.left-vp.left);

  var x1,x2;
  if(fx_r<tx_l){x1=fx_r;x2=tx_l;}
  else if(tx_r<fx_l){x1=fx_l;x2=tx_r;}
  else{x1=fx_r;x2=tx_r;}

  var dx=Math.abs(x2-x1),cp=Math.max(50,Math.min(160,dx*.45));
  var isRev=(x2<x1);
  var flex=(si-(st-1)/2)*14;
  var c1x=x1+(isRev?-cp:cp),c1y=fy+flex;
  var c2x=x2-(isRev?-cp:cp),c2y=ty-flex;

  var d='M '+x1+' '+fy+' C '+c1x+' '+c1y+','+c2x+' '+c2y+','+x2+' '+ty;
  var path=document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d',d);
  path.setAttribute('class','conn-path');
  path.setAttribute('stroke-width',String(Math.max(1.1,1.8*aSx)));
  path.setAttribute('stroke',color);
  path.setAttribute('marker-end','url(#arr-'+color.replace('#','')+')');
  svg.appendChild(path);

  // Label at curve midpoint
  var mx=.125*x1+.375*c1x+.375*c2x+.125*x2;
  var my=.125*fy+.375*c1y+.375*c2y+.125*ty;
  var txt=document.createElementNS('http://www.w3.org/2000/svg','text');
  txt.setAttribute('x',mx);txt.setAttribute('y',my);
  txt.setAttribute('text-anchor','middle');txt.setAttribute('dominant-baseline','central');
  txt.setAttribute('fill','#fff');txt.setAttribute('font-size',String(Math.max(7,9*aSx))+'px');txt.setAttribute('font-weight','bold');
  txt.setAttribute('style','pointer-events:none;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;');
  txt.textContent=label;
  svg.appendChild(txt);
}

function _fanY(i,total){
  if(total<=1)return .5;
  return .15+.7*(i/(total-1));
}

function _arrowDefs(scale){
  var s=Math.max(.7,Math.min(2.2,scale||1));
  var markerW=(6*s).toFixed(2);
  var markerH=(6*s).toFixed(2);
  return '<defs>'
    +'<marker id="arr-f39c12" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="'+markerW+'" markerHeight="'+markerH+'" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f39c12"/></marker>'
    +'<marker id="arr-3498db" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="'+markerW+'" markerHeight="'+markerH+'" orient="auto-start-reverse"><path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#3498db"/></marker>'
    +'</defs>';
}

function _clearConnections(){
  _hoveredProvId=null;
  document.querySelectorAll('.prov-card').forEach(function(c){c.classList.remove('active-prov','dep-out','dep-in');});
  var svg=document.getElementById('conn-svg');
  if(svg)svg.innerHTML=_arrowDefs(aSx);
}

function _redrawConn(){
  if(_hoveredProvId){_drawConnections(_hoveredProvId);}
  else{var svg=document.getElementById('conn-svg');if(svg)svg.innerHTML=_arrowDefs(aSx);}
}

function _esc(s){
  if(!s)return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Static event bindings (replaces blocked onclick= attributes) ──────────────
document.getElementById('tbMap').addEventListener('click',function(){switchTab('map');});
document.getElementById('tbInsp').addEventListener('click',function(){switchTab('inspector');});
document.getElementById('mapZIn').addEventListener('click',function(e){mapZoomIn(e);});
document.getElementById('mapZOut').addEventListener('click',function(e){mapZoomOut(e);});
document.getElementById('mapZRst').addEventListener('click',function(e){mapZoomReset(e);});
document.getElementById('anatZIn').addEventListener('click',function(e){anatZoomIn(e);});
document.getElementById('anatZOut').addEventListener('click',function(e){anatZoomOut(e);});
document.getElementById('anatZRst').addEventListener('click',function(e){anatZoomReset(e);});
document.getElementById('detail-panel').addEventListener('click',function(e){
  if(e.target.closest('[data-action="open-inspector"]')){switchTab('inspector');}
});
</script>
</body>
</html>
`;
  }
}
