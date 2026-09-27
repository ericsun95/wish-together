export function quickWish(titleInput: string, linkInput: string) {
  const title = titleInput.trim(), explicit = linkInput.trim();
  const isLink = /^https?:\/\//i.test(title);
  const link = explicit || (isLink ? title : "");
  let hostname = "";
  if (link) {
    try { const parsed = new URL(link); if (!["https:", "http:"].includes(parsed.protocol)) throw Error(); hostname = parsed.hostname.replace(/^www\./, ""); }
    catch { return { title, url: link, error: "url" as const }; }
  }
  return { title: (!title || isLink) ? hostname : title, url: link, error: !title && !link ? "empty" as const : null };
}
