import { describe, expect, it, vi } from 'vitest';
import { convertRvtFile } from '../rvt/local-rvt';

function createWorkerFactory(messages) {
  const worker = {
    postMessage: vi.fn(() => {
      queueMicrotask(() => messages.forEach((data) => worker.onmessage({ data })));
    }),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
  };
  return { worker, factory: () => worker };
}

describe('local RVT conversion bridge', () => {
  it('forwards progress and returns IFC bytes plus parser diagnostics', async () => {
    const ifcBuffer = new Uint8Array([1, 2, 3]).buffer;
    const { worker, factory } = createWorkerFactory([
      { type: 'progress', message: 'Reading Revit elements locally…' },
      { type: 'complete', ifcBuffer, diagnostics: { revitVersion: 2019 } },
    ]);
    const onProgress = vi.fn();

    const result = await convertRvtFile(new Blob(['model']), { workerFactory: factory, onProgress });

    expect([...result.ifcBytes]).toEqual([1, 2, 3]);
    expect(result.diagnostics).toEqual({ revitVersion: 2019 });
    expect(onProgress).toHaveBeenCalledWith('Reading Revit elements locally…');
    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'convert', buffer: expect.any(ArrayBuffer) }),
      [expect.any(ArrayBuffer)],
    );
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('reports parser errors and terminates the worker', async () => {
    const { worker, factory } = createWorkerFactory([
      { type: 'error', message: 'Unsupported Revit file.' },
    ]);

    await expect(convertRvtFile(new Blob(['model']), { workerFactory: factory }))
      .rejects.toThrow('Unsupported Revit file.');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejects files above the browser parser cap before starting a worker', async () => {
    const factory = vi.fn();
    const file = { size: 64 * 1024 * 1024 + 1, arrayBuffer: vi.fn() };

    await expect(convertRvtFile(file, { workerFactory: factory }))
      .rejects.toThrow('limited to 64 MiB');
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    expect(factory).not.toHaveBeenCalled();
  });
});
