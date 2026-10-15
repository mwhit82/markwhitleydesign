/** Probe safely: privacy/driver restrictions can throw instead of returning null. */
export function supportsWebGL2(createCanvas: () => Pick<HTMLCanvasElement,'getContext'>): boolean {
  try {
    const context=createCanvas().getContext('webgl2') as WebGL2RenderingContext | null;
    if(!context)return false;
    try {context.getExtension('WEBGL_lose_context')?.loseContext();}catch { /* Probe succeeded; releasing it is best-effort. */ }
    return true;
  }catch{return false;}
}
