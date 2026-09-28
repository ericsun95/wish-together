export type PetPhase = 'morning' | 'day' | 'evening' | 'night';
export function petPhase(hour:number):PetPhase {
  return hour >= 22 || hour < 7 ? 'night' : hour < 11 ? 'morning' : hour < 18 ? 'day' : 'evening';
}
export const PET_RHYTHMS = {
  morning: {emoji:'☀',zh:'早安，伸个懒腰陪你开始今天',en:'A little stretch to start the day'},
  day: {emoji:'☁',zh:'晒晒太阳，走走停停',en:'A sunny spot and a little wandering'},
  evening: {emoji:'☾',zh:'天色慢慢暗了，靠近一点陪你',en:'Evening settles in. Staying close to you'},
  night: {emoji:'✧',zh:'夜深了，窝在这里做个好梦',en:'Curled up for a good night’s sleep'},
} as const;
