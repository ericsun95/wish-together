export type Coordinates = { latitude: number; longitude: number };
export function coordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Coordinates;
  return Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180 ? { latitude: p.latitude, longitude: p.longitude } : null;
}
export type WishDraft = {
  editingId: string | null; title: string; note: string; url: string; address: string;
  category: string; status: "wanted" | "planned" | "done"; plannedDate: string; completionNote: string;
  location: Coordinates | null; checklist: { id: string; label: string; completed: boolean; position: number }[];
};
export function readDrafts(storage: Pick<Storage, "getItem">, key: string): Record<string, WishDraft> {
  try {
    const parsed = JSON.parse(storage.getItem(key) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, v]) => {
      if (!v || typeof v !== "object") return false;
      const d = v as WishDraft;
      return id === (d.editingId || "new") && (d.editingId === null || typeof d.editingId === "string") &&
        [d.title, d.note, d.url, d.address, d.category, d.plannedDate, d.completionNote].every(x => typeof x === "string") &&
        ["wanted", "planned", "done"].includes(d.status) && Array.isArray(d.checklist) && d.checklist.every(i => i && typeof i.id === "string" && typeof i.label === "string" && typeof i.completed === "boolean" && Number.isFinite(i.position));
    }).map(([id, v]) => [id, { ...(v as WishDraft), location: coordinates((v as WishDraft).location) }]));
  } catch { return {}; }
}
export function writeDraft(storage: Pick<Storage, "getItem" | "setItem">, key: string, id: string, draft: WishDraft | null) {
  const drafts = readDrafts(storage, key);
  if (draft) drafts[id] = draft; else delete drafts[id];
  storage.setItem(key, JSON.stringify(drafts));
}
