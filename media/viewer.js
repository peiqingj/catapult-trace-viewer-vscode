(function () {
  'use strict';

  const statusElement = document.getElementById('status');
  const catapultSource = document.body.dataset.catapultSrc;
  const traceSource = document.body.dataset.traceSrc;
  const traceName = document.body.dataset.traceName || 'trace';
  let didStart = false;
  const loadErrors = [];

  window.addEventListener('error', event => {
    loadErrors.push(event.message || String(event.error || 'Unknown script error'));
  });

  window.addEventListener('unhandledrejection', event => {
    loadErrors.push(event.reason instanceof Error ? event.reason.message : String(event.reason));
  });

  function setStatus(message) {
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  function setReady() {
    document.body.classList.remove('error');
    document.body.classList.add('ready');
  }

  function fail(error) {
    const message = error instanceof Error ? error.message : String(error);
    document.body.classList.remove('ready');
    document.body.classList.add('error');
    setStatus(message);
    console.error(error);
  }

  function hasCatapult() {
    return Boolean(window.tr && window.tr.Model && window.tr.importer && window.tr.importer.Import);
  }

  function waitForWebComponentsBootstrap() {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();

      function check() {
        if (document.registerElement && window.CustomElements) {
          resolve();
          return;
        }

        if (Date.now() - startedAt > 5000) {
          reject(new Error('WebComponents V0 polyfill did not initialize document.registerElement.'));
          return;
        }

        window.setTimeout(check, 25);
      }

      check();
    });
  }

  async function loadCatapultBundle() {
    if (hasCatapult()) {
      return;
    }

    if (!catapultSource) {
      throw new Error('No Catapult viewer URI was provided.');
    }

    await waitForWebComponentsBootstrap();

    setStatus('Loading Catapult bundle...');
    const response = await fetch(catapultSource);
    if (!response.ok) {
      throw new Error(`Failed to load Catapult bundle: ${response.status} ${response.statusText}`);
    }

    const htmlText = await response.text();
    const importedDocument = new DOMParser().parseFromString(htmlText, 'text/html');
    const importRoot = document.createElement('div');
    importRoot.id = 'catapult-import-root';
    importRoot.hidden = true;
    document.body.appendChild(importRoot);

    const importNodes = [
      ...Array.from(importedDocument.head.childNodes),
      ...Array.from(importedDocument.body.childNodes)
    ];

    for (const node of importNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && node.localName === 'script') {
        await executeScript(node);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.localName === 'meta') {
        continue;
      } else {
        importRoot.appendChild(importNodeIntoCurrentDocument(node));
      }
    }

    if (window.CustomElements && typeof window.CustomElements.upgradeDocumentTree === 'function') {
      window.CustomElements.upgradeDocumentTree(document);
    }

    window.dispatchEvent(new CustomEvent('WebComponentsReady'));

    if (!hasCatapult()) {
      const detail = loadErrors.length ? ` Last loader error: ${loadErrors[loadErrors.length - 1]}` : '';
      throw new Error(`Catapult bundle executed, but window.tr was not initialized.${detail}`);
    }
  }

  function importNodeIntoCurrentDocument(node) {
    const nativeDocument = unwrapDomNode(document);
    const nativeNode = unwrapDomNode(node);

    try {
      return wrapDomNode(nativeDocument.importNode(nativeNode, true));
    } catch (error) {
      console.warn('Falling back to cloneNode for Catapult import node.', error);
      return wrapDomNode(nativeNode.cloneNode(true));
    }
  }

  function unwrapDomNode(node) {
    if (window.ShadowDOMPolyfill && typeof window.ShadowDOMPolyfill.unwrapIfNeeded === 'function') {
      return window.ShadowDOMPolyfill.unwrapIfNeeded(node);
    }

    if (typeof window.unwrap === 'function') {
      return window.unwrap(node);
    }

    return node;
  }

  function wrapDomNode(node) {
    if (window.ShadowDOMPolyfill && typeof window.ShadowDOMPolyfill.wrapIfNeeded === 'function') {
      return window.ShadowDOMPolyfill.wrapIfNeeded(node);
    }

    if (typeof window.wrap === 'function') {
      return window.wrap(node);
    }

    return node;
  }

  function executeScript(sourceScript) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const htmlImports = window.HTMLImports;
      const previousHtmlImportsCurrentScript = htmlImports && htmlImports.currentScript;
      const documentCurrentScriptDescriptor = Object.getOwnPropertyDescriptor(document, '_currentScript');
      let previousDocumentCurrentScript;
      let didSetDocumentCurrentScript = false;

      for (const attribute of Array.from(sourceScript.attributes)) {
        script.setAttribute(attribute.name, attribute.value);
      }

      script.text = sourceScript.textContent || '';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to execute Catapult script.'));

      try {
        setLegacyCurrentScript(script);
        document.head.appendChild(script);
        window.setTimeout(() => {
          restoreLegacyCurrentScript();
          resolve();
        }, 0);
      } catch (error) {
        restoreLegacyCurrentScript();
        reject(error);
      }

      function setLegacyCurrentScript(currentScript) {
        if (htmlImports) {
          htmlImports.currentScript = currentScript;
          return;
        }

        if (!documentCurrentScriptDescriptor || documentCurrentScriptDescriptor.writable || documentCurrentScriptDescriptor.set) {
          previousDocumentCurrentScript = document._currentScript;
          document._currentScript = currentScript;
          didSetDocumentCurrentScript = true;
        }
      }

      function restoreLegacyCurrentScript() {
        if (htmlImports) {
          if (previousHtmlImportsCurrentScript === undefined) {
            delete htmlImports.currentScript;
          } else {
            htmlImports.currentScript = previousHtmlImportsCurrentScript;
          }
        }

        if (didSetDocumentCurrentScript) {
          if (previousDocumentCurrentScript === undefined) {
            delete document._currentScript;
          } else {
            document._currentScript = previousDocumentCurrentScript;
          }
        }
      }
    });
  }

  function waitForCatapult() {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();

      function check() {
        if (hasCatapult()) {
          resolve();
          return;
        }

        if (Date.now() - startedAt > 15000) {
          const detail = loadErrors.length ? ` Last loader error: ${loadErrors[loadErrors.length - 1]}` : '';
          reject(new Error(`Catapult Trace Viewer did not finish loading.${detail}`));
          return;
        }

        window.setTimeout(check, 50);
      }

      if (window.HTMLImports && typeof window.HTMLImports.whenReady === 'function') {
        window.HTMLImports.whenReady(check);
      }

      window.addEventListener('WebComponentsReady', check, { once: true });
      window.addEventListener('load', check, { once: true });
      check();
    });
  }

  function appendElement(parent, child) {
    if (window.Polymer && window.Polymer.dom) {
      window.Polymer.dom(parent).appendChild(child);
      return;
    }

    parent.appendChild(child);
  }

  function createViewer() {
    const oldViewer = document.getElementById('trace-viewer');
    if (oldViewer) {
      oldViewer.remove();
    }

    const container = document.createElement('track-view-container');
    container.id = 'track_view_container';

    const viewer = document.createElement('tr-ui-timeline-view');
    viewer.id = 'trace-viewer';
    viewer.globalMode = true;
    viewer.track_view_container = container;

    appendElement(viewer, container);
    appendElement(document.body, viewer);

    return viewer;
  }

  async function loadTraceText() {
    if (!traceSource) {
      throw new Error('No trace file URI was provided.');
    }

    setStatus(`Loading ${traceName}...`);
    const response = await fetch(traceSource);
    if (!response.ok) {
      throw new Error(`Failed to load ${traceName}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  async function importTrace(viewer, traceText) {
    setStatus(`Importing ${traceName}...`);

    const importableTraceText = normalizeCpuProfileIds(traceText);

    const model = new window.tr.Model();
    const importer = new window.tr.importer.Import(model);
    await importer.importTracesWithProgressDialog([importableTraceText]);

    viewer.model = model;
    setReady();
  }

  function normalizeCpuProfileIds(traceText) {
    let trace;
    try {
      trace = JSON.parse(traceText);
    } catch (_error) {
      return traceText;
    }

    const events = getTraceEvents(trace);
    if (!events) {
      return traceText;
    }

    const profilePidsById = new Map();
    for (const event of events) {
      if (!isCpuProfileEvent(event)) {
        continue;
      }

      let pids = profilePidsById.get(event.id);
      if (!pids) {
        pids = new Set();
        profilePidsById.set(event.id, pids);
      }

      pids.add(event.pid);
    }

    const conflictingProfileIds = new Set();
    for (const [id, pids] of profilePidsById) {
      if (pids.size > 1) {
        conflictingProfileIds.add(id);
      }
    }

    if (conflictingProfileIds.size === 0) {
      return traceText;
    }

    let didNormalize = false;
    for (const event of events) {
      if (!isCpuProfileEvent(event) || !conflictingProfileIds.has(event.id)) {
        continue;
      }

      event.id = `${event.id}:pid${event.pid}`;
      didNormalize = true;
    }

    return didNormalize ? JSON.stringify(trace) : traceText;
  }

  function getTraceEvents(trace) {
    if (Array.isArray(trace)) {
      return trace;
    }

    if (trace && Array.isArray(trace.traceEvents)) {
      return trace.traceEvents;
    }

    return undefined;
  }

  function isCpuProfileEvent(event) {
    const data = event && event.args && event.args.data;
    if (!data || event.id === undefined || event.id === null) {
      return false;
    }

    return data.cpuProfile !== undefined || (event.name === 'Profile' && data.startTime !== undefined);
  }

  async function start() {
    if (didStart) {
      return;
    }

    didStart = true;
    setStatus('Loading Catapult Trace Viewer...');

    await loadCatapultBundle();
    await waitForCatapult();
    const viewer = createViewer();
    const traceText = await loadTraceText();
    await importTrace(viewer, traceText);
  }

  start().catch(fail);
})();