export type LifeWish = { id: string; title: string; category: string; status: string; plannedDate: string };
export type LifeMember = { user_id: string; role: string; display_name: string; avatar_url: string; custom_avatar?: string | null };
export type Anniversary = { id: string; title: string; event_date: string; repeats_yearly: boolean; emoji: string; note: string };
export type WishPlan = { wish_id: string; date_on: string | null; budget: number | null; currency: string; owner_task: string; partner_task: string };
export const REACTIONS = ['❤️','🥰','😂','👍','🎉','👀'];
export const DAY = 86400000;
export function localToday(now = new Date()) { return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`; }
export function dayNumber(date: string) { const [y,m,d] = date.split('-').map(Number); return Date.UTC(y,m-1,d)/DAY; }
export function daysTogether(start: string, today = localToday()) { return Math.max(0, dayNumber(today)-dayNumber(start)+1); }
export function anniversaryDays(date: string, repeat: boolean, today = localToday()) {
  if (!repeat) return dayNumber(date)-dayNumber(today);
  const [,m,d] = date.split('-').map(Number);
  const year = Math.max(Number(today.slice(0,4)), Number(date.slice(0,4)));
  const occurrence = (y:number) => Date.UTC(y,m-1,Math.min(d,new Date(Date.UTC(y,m,0)).getUTCDate()))/DAY;
  const next = occurrence(year) >= dayNumber(today) ? occurrence(year) : occurrence(year+1);
  return next-dayNumber(today);
}
export function pickWish(wishes: LifeWish[], category: string, previous?: string, random = Math.random) {
  const eligible = wishes.filter(w=>w.status !== 'done' && (category === '' || w.category === category));
  const pool = eligible.length > 1 ? eligible.filter(w=>w.id !== previous) : eligible;
  return pool[Math.floor(random()*pool.length)] ?? null;
}
