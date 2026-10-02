/**
 * In-process event bus for observability: the pipeline, outbox and simulated world
 * publish here; the console's Server-Sent Events stream subscribes. A failing
 * listener can never break the pipeline.
 */
export function createBus(log) {
  const listeners = new Set();
  return {
    emit(type, data) {
      for (const listener of listeners) {
        try {
          listener(type, data);
        } catch (err) {
          log?.warn("bus listener failed", { type, error: err.message });
        }
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
