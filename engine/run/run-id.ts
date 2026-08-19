export function createRunId(now = new Date()): string {
  const date = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `RUN-${date}-${crypto.randomUUID().slice(0, 8)}`;
}
