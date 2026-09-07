/**
 * Reusable Jest setup utilities.
 */

/**
 * Advances all fake timers and flushes pending promises.
 * Useful after triggering async operations with fake timers.
 */
export async function flushTimersAndPromises(): Promise<void> {
  jest.runOnlyPendingTimers();
  jest.advanceTimersByTime(0);
  // Flush microtasks
  await Promise.resolve();
  await Promise.resolve();
}

/**
 * Creates a promise that resolves after the specified milliseconds.
 * Only use with fake timers in tests.
 */
export function tick(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe wrapper to suppress specific console methods during a test.
 * Restores the original implementation after the callback completes.
 */
export async function suppressConsole(
  method: "log" | "warn" | "error",
  callback: () => Promise<void> | void,
): Promise<void> {
  const original = console[method];
  console[method] = jest.fn();
  try {
    await callback();
  } finally {
    console[method] = original;
  }
}
