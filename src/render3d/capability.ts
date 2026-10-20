/**
 * WebGL2 Capability Detection and Context Loss Recovery for DRISHTI-CUAS.
 *
 * Implements Rule R10.1 & R10.2:
 * - Probes hardware WebGL2 availability without modifying DOM.
 * - Handles context loss events gracefully to restore 2D Canvas fallback.
 */

export interface WebGL2CapabilityResult {
  supported: boolean;
  reason?: string;
}

let cachedCapability: WebGL2CapabilityResult | null = null;

export function checkWebGL2Support(): WebGL2CapabilityResult {
  if (cachedCapability) {
    return cachedCapability;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, reason: 'Non-browser execution environment' };
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
      cachedCapability = {
        supported: false,
        reason: 'WebGL2 is not supported by your browser or GPU drivers.',
      };
      return cachedCapability;
    }

    cachedCapability = { supported: true };
    return cachedCapability;
  } catch (error) {
    cachedCapability = {
      supported: false,
      reason: error instanceof Error ? error.message : 'Unknown WebGL2 probe error',
    };
    return cachedCapability;
  }
}

export function isWebGL2Available(): boolean {
  return checkWebGL2Support().supported;
}

/**
 * Attaches a robust context-loss listener to the WebGL2 canvas.
 * When the GPU context is lost (e.g. driver reset or memory pressure),
 * preventDefault is called and the fallback callback is executed immediately.
 */
export function attachContextLossHandler(
  canvas: HTMLCanvasElement,
  onContextLost: (event: Event) => void
): () => void {
  const handleLost = (e: Event) => {
    e.preventDefault();
    console.warn('[Render3D] WebGL2 Context Lost. Initiating fallback to 2D Canvas baseline.');
    onContextLost(e);
  };

  canvas.addEventListener('webglcontextlost', handleLost, false);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleLost, false);
  };
}
