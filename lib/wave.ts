/** Deterministic speech-shaped waveform. Same bars on every machine, every run. */
export function makeWaveform(n: number, seed = 1, gaps: number[] = []): number[] {
  return Array.from({ length: n }, (_, i) => {
    const noise = Math.abs(Math.sin((i + seed * 37) * 12.9898) * 43758.5453) % 1;
    const gap = gaps.includes(i) ? 0.18 : 1;
    const arc = 0.55 + 0.45 * Math.sin((i / n) * Math.PI);
    return Math.max(0.08, Math.min(1, (0.3 + noise * 0.7) * arc * gap));
  });
}
