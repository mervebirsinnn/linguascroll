/** İlerleme bandındaki dokunma koordinatını video zamanına çeviren saf çekirdek. */
export function seekTimeFromTap(locationX: number, trackWidth: number, durationSeconds: number): number {
  if (!Number.isFinite(locationX) || !Number.isFinite(trackWidth) || !Number.isFinite(durationSeconds) || trackWidth <= 0 || durationSeconds <= 0) {
    return 0;
  }
  const clampedX = Math.min(Math.max(locationX, 0), trackWidth);
  return (clampedX / trackWidth) * durationSeconds;
}

export function formatVideoTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}
