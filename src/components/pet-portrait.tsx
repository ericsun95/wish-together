import { Pet3D } from './pet-3d';
import type { PetMood } from '@/lib/pet-play';
export function PetIllustration({ species, happy = false, mood = 'idle' }: { species: 'cat' | 'dog'; happy?: boolean; mood?: 'idle' | 'walk' | 'happy' | 'sleep' | 'play' }) {
  return <img className={`pet-portrait pet-photo pet-mood-${mood} ${happy ? 'pet-happy' : ''}`} src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/models/pets/${species}.webp`} alt="" draggable={false}/>;
}


export function PetPortrait({species,happy=false,mood="idle",heading=-.6}: {species:"cat"|"dog";happy?:boolean;mood?:PetMood;heading?:number}) { return <Pet3D species={species} mood={happy?"happy":mood} heading={heading}><PetIllustration species={species} mood={mood==="sleep"?"sleep":"idle"} happy={happy}/></Pet3D>; }
