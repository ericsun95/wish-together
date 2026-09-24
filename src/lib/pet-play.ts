export function keepPetOnScreen(x: number, y: number, width: number, height: number, size = 96) {
  return { x: Math.max(8, Math.min(x, Math.max(8, width - size - 8))), y: Math.max(8, Math.min(y, Math.max(8, height - size - 8))) };
}

export const PET_SIZE = 128;
export type PetMood = 'idle' | 'walk' | 'run' | 'happy' | 'sleep' | 'play' | 'sit' | 'jump' | 'roll' | 'wave' | 'groom' | 'spin' | 'held';
export const PET_POSES: { mood: PetMood; zh: string; en: string; emoji: string }[] = [
  { mood: 'sit', zh: '坐下', en: 'Sit', emoji: '🐾' },
  { mood: 'jump', zh: '跳一跳', en: 'Jump', emoji: '✨' },
  { mood: 'roll', zh: '打个滚', en: 'Roll', emoji: '🌀' },
  { mood: 'wave', zh: '握握手', en: 'Shake paws', emoji: '🤝' },
  { mood: 'groom', zh: '洗洗脸', en: 'Groom', emoji: '🫧' },
  { mood: 'spin', zh: '转个圈', en: 'Twirl', emoji: '💫' },
];
export type PetGameScene = { game: 'fetch' | 'stars' | 'hide'; position: number; target: number; score: number; found: boolean; searched: number[]; moving: boolean; complete: boolean };
export function fullScreenPetTarget(width: number, height: number, step: number, random = Math.random) {
  const rangeX = Math.max(0, width - PET_SIZE - 16), rangeY = Math.max(0, height - PET_SIZE - 16);
  const quadrant = ((step % 4) + 4) % 4;
  const x = (quadrant === 1 || quadrant === 2 ? .6 : .05) + random() * .35;
  const y = (quadrant >= 2 ? .6 : .05) + random() * .35;
  return keepPetOnScreen(8 + x * rangeX, 8 + y * rangeY, width, height, PET_SIZE);
}
