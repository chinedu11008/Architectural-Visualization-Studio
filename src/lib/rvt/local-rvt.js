import { MAX_BROWSER_RVT_PARSE_BYTES } from '../local-assets';

function createWorker() {
  return new Worker(new URL('./rvt.worker.js', import.meta.url), {
    type: 'module',
    name: 'lumen-field-rvt-parser',
  });
}

export function convertRvtFile(file, { onProgress, workerFactory = createWorker } = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return Promise.reject(new Error('Choose a valid Revit project file.'));
  }
  if (file.size > MAX_BROWSER_RVT_PARSE_BYTES) {
    return Promise.reject(new Error(
      `Direct RVT parsing is limited to 64 MiB to protect browser memory. This file is ${(file.size / (1024 * 1024)).toFixed(1)} MiB.`,
    ));
  }

  return file.arrayBuffer().then((buffer) => new Promise((resolve, reject) => {
    const worker = workerFactory();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      callback(value);
    };

    worker.onmessage = ({ data }) => {
      if (data?.type === 'progress') {
        onProgress?.(data.message);
      } else if (data?.type === 'complete') {
        if (!(data.ifcBuffer instanceof ArrayBuffer)) {
          finish(reject, new Error('The local RVT parser returned no IFC model.'));
          return;
        }
        finish(resolve, {
          ifcBytes: new Uint8Array(data.ifcBuffer),
          diagnostics: data.diagnostics || null,
        });
      } else if (data?.type === 'error') {
        finish(reject, new Error(data.message || 'The RVT file could not be parsed.'));
      }
    };
    worker.onerror = (event) => {
      finish(reject, new Error(event.message || 'The local RVT parser stopped unexpectedly.'));
    };
    worker.postMessage({ type: 'convert', buffer }, [buffer]);
  }));
}
