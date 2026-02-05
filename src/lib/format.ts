export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
