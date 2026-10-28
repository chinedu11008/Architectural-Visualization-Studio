import init, {
  modelToIfcStep,
  openRvtBytesWithDiagnosticsMode,
} from './pkg/rvt.js';
import wasmUrl from './pkg/rvt_bg-DEN9BM9G.wasm?url';

let initialized;

async function initializeParser() {
  if (!initialized) initialized = init({ module_or_path: wasmUrl });
  return initialized;
}

function summarizeDiagnostics(diagnostics) {
  const exported = diagnostics?.exported || {};
  return {
    revitVersion: diagnostics?.input?.revit_version ?? null,
    support: diagnostics?.input?.release_support?.status || null,
    confidence: diagnostics?.confidence?.level || null,
    elementCount: exported.building_elements ?? 0,
    geometryCount: exported.building_elements_with_geometry ?? 0,
    warningCount: diagnostics?.warnings?.length ?? 0,
    boundingBoxCount: exported.bounding_box_bodies ?? 0,
    geometryGapConditions: (diagnostics?.skipped || []).reduce(
      (total, item) => total + (Number(item?.count) || 0),
      0,
    ),
  };
}

self.addEventListener('message', async ({ data }) => {
  if (data?.type !== 'convert' || !(data.buffer instanceof ArrayBuffer)) return;

  try {
    self.postMessage({ type: 'progress', message: 'Starting the bundled RVT parser…' });
    await initializeParser();

    self.postMessage({ type: 'progress', message: 'Reading Revit elements locally…' });
    const parsed = openRvtBytesWithDiagnosticsMode(new Uint8Array(data.buffer), 'geometry');

    self.postMessage({ type: 'progress', message: 'Preparing IFC geometry for the viewer…' });
    const stepText = modelToIfcStep(parsed.model);
    if (!stepText.startsWith('ISO-10303-21;') || !stepText.includes('END-ISO-10303-21;')) {
      throw new Error('The local parser did not produce a complete IFC4 file.');
    }

    const ifcBytes = new TextEncoder().encode(stepText);
    self.postMessage({
      type: 'complete',
      ifcBuffer: ifcBytes.buffer,
      diagnostics: summarizeDiagnostics(parsed.diagnostics),
    }, [ifcBytes.buffer]);
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
