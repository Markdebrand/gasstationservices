export default function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds)) return '';
  const s = Math.max(0, Math.round(seconds));
  if (s >= 3600) {
    const hours = Math.floor(s / 3600);
    const mins = Math.round((s % 3600) / 60);
    if (mins > 0) return `${hours} h ${mins} min`;
    return `${hours} h`;
  }
  if (s >= 60) {
    const mins = Math.ceil(s / 60);
    return `${mins} min`;
  }
  return `${s} s`;
}
