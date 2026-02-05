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

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const date = timestamp * 1000;
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  
  return formatDate(timestamp);
}

export function countWords(content: string | null): number {
  if (!content) return 0;
  try {
    const blocks = JSON.parse(content);
    let text = "";
    
    const extractText = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;
      
      if (Array.isArray(obj)) {
        obj.forEach(extractText);
        return;
      }
      
      const record = obj as Record<string, unknown>;
      
      if (typeof record.text === "string") {
        text += " " + record.text;
      }
      
      if (record.content) {
        extractText(record.content);
      }
      if (record.children) {
        extractText(record.children);
      }
    };
    
    extractText(blocks);
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  } catch {
    return 0;
  }
}
