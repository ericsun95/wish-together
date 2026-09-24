export function keepPetOnScreen(x: number, y: number, width: number, height: number, size = 96) {
  return { x: Math.max(8, Math.min(x, Math.max(8, width - size - 8))), y: Math.max(8, Math.min(y, Math.max(8, height - size - 8))) };
}
