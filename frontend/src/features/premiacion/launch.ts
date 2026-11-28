// El navegador solo permite pantalla completa y sonido dentro del clic del
// usuario, así que se preparan ahí, antes de cualquier espera de red.
export interface PremiacionLaunch {
  audioContext?: AudioContext;
}

export function launchImmersive(): PremiacionLaunch {
  // Sin API de pantalla completa (p. ej. iPhone) el overlay llena la ventana
  document.documentElement.requestFullscreen?.().catch(() => undefined);
  const Context =
    window.AudioContext ||
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return {};
  const audioContext = new Context();
  audioContext.resume().catch(() => undefined);
  return { audioContext };
}

export function cancelImmersive({ audioContext }: PremiacionLaunch) {
  audioContext?.close().catch(() => undefined);
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => undefined);
  }
}
