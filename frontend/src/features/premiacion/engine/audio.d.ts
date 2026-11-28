export interface CeremonyAudio {
  setEnabled(requested: boolean): Promise<boolean>;
  setPaused(requested: boolean): Promise<boolean>;
  cue(name: string, value?: number): void;
  stop(): void;
  destroy(): void;
}

export function createCeremonyAudio(options?: {
  openingMusic?: string;
  audioContext?: AudioContext | undefined;
}): CeremonyAudio;
