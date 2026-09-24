import { Pet3D } from './pet-3d';
import type { PetMood } from '@/lib/pet-play';
export function PetIllustration({ species, happy = false, mood = 'idle' }: { species: 'cat' | 'dog'; happy?: boolean; mood?: 'idle' | 'walk' | 'happy' | 'sleep' | 'play' }) {
  return <svg viewBox="0 0 280 240" className={`pet-portrait ${happy ? 'pet-happy' : ''} pet-mood-${mood}`} aria-hidden="true">
    <ellipse cx="140" cy="221" rx="79" ry="10" fill="currentColor" opacity=".08"/>
    <path className="pet-tail" d="M183 186Q246 160 232 198Q220 216 184 207" fill="none" stroke="#d89964" strokeWidth="18" strokeLinecap="round"/>
    <ellipse cx="141" cy="175" rx="63" ry="49" fill="#eeb880"/>
    <ellipse cx="142" cy="185" rx="37" ry="30" fill="#fff1d9"/>
    {species === 'cat' ? <><path d="M72 93L66 28L119 60M166 60L215 28L211 96" fill="#eeb880" stroke="#eeb880" strokeWidth="10" strokeLinejoin="round"/><path d="M79 74L77 46L102 64M182 65L204 46L202 76" fill="#ec9691"/></> : <><ellipse cx="74" cy="99" rx="26" ry="53" transform="rotate(17 74 99)" fill="#b7764b"/><ellipse cx="208" cy="99" rx="26" ry="53" transform="rotate(-17 208 99)" fill="#b7764b"/></>}
    <ellipse cx="141" cy="107" rx="76" ry="65" fill="#efbd86"/>
    <ellipse cx="141" cy="129" rx="40" ry="29" fill="#fff1d9"/>
    <path d="M130 116Q141 109 152 116L141 126Z" fill="#805c4c" stroke="#805c4c" strokeWidth="4" strokeLinejoin="round"/>
    <path d="M141 125V132M125 132Q132 145 141 132Q151 145 158 132" fill="none" stroke="#805c4c" strokeWidth="3.5" strokeLinecap="round"/>
    {mood === 'sleep' ? <path d="M100 101Q106 109 113 101M169 101Q176 109 182 101" fill="none" stroke="#684b3f" strokeWidth="4" strokeLinecap="round"/> : <g className="pet-eyes"><ellipse cx="107" cy="102" rx="5" ry="7" fill="#684b3f"/><ellipse cx="175" cy="102" rx="5" ry="7" fill="#684b3f"/><circle cx="109" cy="100" r="1.6" fill="white"/><circle cx="177" cy="100" r="1.6" fill="white"/></g>}
    <ellipse cx="98" cy="120" rx="13" ry="7" fill="#e9958b" opacity=".6"/><ellipse cx="184" cy="120" rx="13" ry="7" fill="#e9958b" opacity=".6"/>
    {species === 'cat' && <path d="M87 128L55 122M86 138L53 143M195 128L225 122M196 138L228 143" stroke="#b7764b" strokeWidth="2.5" strokeLinecap="round"/>}
    <ellipse className="pet-paw pet-paw-left" cx="109" cy="211" rx="23" ry="12" fill="#fff1d9"/><ellipse className="pet-paw pet-paw-right" cx="175" cy="211" rx="23" ry="12" fill="#fff1d9"/>
    <path d="M120 164Q142 173 162 164" stroke="var(--accent)" strokeWidth="7" fill="none"/><circle cx="142" cy="173" r="8" fill="#f4ce6c"/>
    <path d="M239 51C225 36 209 57 239 75C269 57 253 36 239 51Z" fill="var(--accent)" opacity=".65"/>
  </svg>;
}


export function PetPortrait({species,happy=false,mood="idle",heading=-.35}: {species:"cat"|"dog";happy?:boolean;mood?:PetMood;heading?:number}) { return <Pet3D species={species} mood={happy?"happy":mood} heading={heading}><PetIllustration species={species} mood={mood==="sleep"?"sleep":"idle"} happy={happy}/></Pet3D>; }
