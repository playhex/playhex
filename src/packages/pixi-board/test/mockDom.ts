/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock window and ResizeObserver unit tests because GameView use them,
// and we run tests with nodejs, which does not know about those variables.

(globalThis as any).window = {
    devicePixelRatio: 1,
};

(globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
