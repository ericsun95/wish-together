/** Decode and re-encode locally: bound payload size and strip photo metadata. */
export async function prepareBackgroundPhoto(file: File, maxEdge = 1600, maxLength = 1500000): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error("format");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("decode");
    context.fillStyle = "#faf7f3";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.65, 0.45, 0.25]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= maxLength) return data;
    }
    throw new Error("size");
  } finally { URL.revokeObjectURL(url); }
}

export async function prepareAlbumPhoto(file: File) {
  const data = await prepareBackgroundPhoto(file, 1440, 660000);
  const thumb = await prepareBackgroundPhoto(file, 320, 32000);
  const blob = await (await fetch(data)).blob();
  const thumbnail = await (await fetch(thumb)).blob();
  if (blob.size > 500000 || thumbnail.size > 24000) throw new Error("size");
  return { data, blob, thumbnail };
}
