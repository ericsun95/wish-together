export type PetSpecies = 'cat' | 'dog' | 'rabbit' | 'hamster';
export const MAX_PETS = 8;
export const PET_SPECIES: { id: PetSpecies; emoji: string; zh: string; en: string }[] = [
  { id: 'cat', emoji: '🐱', zh: '猫咪', en: 'Cats' },
  { id: 'dog', emoji: '🐶', zh: '狗狗', en: 'Dogs' },
  { id: 'rabbit', emoji: '🐰', zh: '兔兔', en: 'Rabbits' },
  { id: 'hamster', emoji: '🐹', zh: '仓鼠', en: 'Hamsters' },
];
export const PET_VARIETIES = [
  { id: 'silver', species: 'cat', zh: '你家的浅色猫咪', en: 'Your cream cat', image: 'personal-cat.webp', model: false },
  { id: 'classic', species: 'cat', zh: '虎斑猫', en: 'Tabby cat', image: 'cat.webp', model: true },
  { id: 'pom', species: 'dog', zh: '你家的白色狗狗', en: 'Your fluffy white dog', image: 'personal-dog.webp', model: false },
  { id: 'classic', species: 'dog', zh: '牧羊犬', en: 'Shepherd', image: 'dog.webp', model: true },
  { id: 'lop', species: 'rabbit', zh: '奶油垂耳兔', en: 'Cream lop rabbit', image: 'rabbit.webp', model: false },
  { id: 'golden', species: 'hamster', zh: '金丝熊', en: 'Golden hamster', image: 'hamster.webp', model: false },
] as const;
export function petVariety(species: PetSpecies, appearance?: string | null) {
  return PET_VARIETIES.find(p => p.species === species && p.id === (appearance || 'classic')) || PET_VARIETIES.find(p => p.species === species)!;
}
export function petImage(species: PetSpecies, appearance?: string | null) { return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/models/pets/${petVariety(species, appearance).image}`; }
export function petEmoji(species: PetSpecies) { return PET_SPECIES.find(p => p.id === species)?.emoji || '🐾'; }
