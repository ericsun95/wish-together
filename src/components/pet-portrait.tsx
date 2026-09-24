import { Pet3D } from './pet-3d';
import type { PetMood } from '@/lib/pet-play';
import { petImage, petVariety, type PetSpecies } from '@/lib/pet-catalog';
type Props = { species: PetSpecies; appearance?: string | null; happy?: boolean; mood?: PetMood; heading?: number; lightweight?: boolean };
export function PetIllustration({ species, appearance, happy = false, mood = 'idle' }: Props) {
  return <img className={`pet-portrait pet-photo pet-mood-${happy ? 'happy' : mood} ${happy ? 'pet-happy' : ''}`} src={petImage(species, appearance)} alt="" draggable={false}/>;
}
export function PetPortrait({ species, appearance, happy = false, mood = 'idle', heading = -.6, lightweight = false }: Props) {
  const portrait = <PetIllustration species={species} appearance={appearance} mood={mood} happy={happy}/>;
  return !lightweight && petVariety(species, appearance).model && (species === 'cat' || species === 'dog')
    ? <Pet3D species={species} mood={happy ? 'happy' : mood} heading={heading}>{portrait}</Pet3D>
    : <div className="pet-3d pet-sprite" data-renderer="sprite">{portrait}</div>;
}
