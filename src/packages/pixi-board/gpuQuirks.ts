/**
 * GPUs on which antialiasing makes the GPU freeze/crash when resizing canvas.
 * I.e Fairphone 3 (Adreno 506): go on /play-local, go fullscreen
 * and switch from mode tabletop to mode normal.
 */
const ANTIALIAS_BLACKLIST: RegExp[] = [
    /Adreno \(TM\) 506\b/i,
    /Adreno 506\b/i,
];

let gpuRenderer: null | string | undefined = undefined;

/**
 * Returns unmasked GPU renderer string, i.e "Adreno (TM) 506",
 * or null if not available.
 * Cached, creates a throwaway WebGL context only once.
 */
export const getGpuRenderer = (): null | string => {
    if (gpuRenderer !== undefined) {
        return gpuRenderer;
    }

    gpuRenderer = null;

    try {
        const gl = document.createElement('canvas').getContext('webgl');

        if (gl === null) {
            return gpuRenderer;
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

        // Firefox deprecated the extension, but returns unmasked renderer with gl.RENDERER
        gpuRenderer = String(gl.getParameter(debugInfo
            ? debugInfo.UNMASKED_RENDERER_WEBGL
            : gl.RENDERER,
        ));

        gl.getExtension('WEBGL_lose_context')?.loseContext();
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Could not detect GPU renderer', e);
    }

    return gpuRenderer;
};

export const isAntialiasSupported = (): boolean => {
    const renderer = getGpuRenderer();

    if (renderer === null) {
        return true;
    }

    return !ANTIALIAS_BLACKLIST.some(pattern => pattern.test(renderer));
};
