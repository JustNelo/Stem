export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface CreateTagPayload {
  name: string;
  color: string;
}

export const TAG_COLORS = [
  { name: "Rouge", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Ambre", value: "#f59e0b" },
  { name: "Vert", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Bleu", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#a855f7" },
  { name: "Rose", value: "#ec4899" },
  { name: "Gris", value: "#6b7280" },
];
