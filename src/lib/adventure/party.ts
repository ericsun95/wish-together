import type { PetSpecies } from '../pet-catalog';
export type AdventurePet = { id: string; name: string; species: PetSpecies; appearance: string };
export type Party = { cat: AdventurePet; dog: AdventurePet };
export function selectParty(pets: AdventurePet[], ids: Partial<Record<'cat' | 'dog', string>>): Party | null {
  const pick = (species: 'cat' | 'dog') => pets.find(p => p.species === species && p.id === ids[species]) || pets.find(p => p.species === species);
  const cat = pick('cat'), dog = pick('dog');
  return cat && dog ? { cat, dog } : null;
}
