export function isUserOnline(lastSeenAt?: string | null, thresholdMinutes = 2) {
  if (!lastSeenAt) return false;
  const lastSeenTime = new Date(lastSeenAt).getTime();
  if (Number.isNaN(lastSeenTime)) return false;

  return Date.now() - lastSeenTime <= thresholdMinutes * 60 * 1000;
}
