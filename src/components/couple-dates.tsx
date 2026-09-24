"use client";

import { useEffect, useState } from 'react';
import { CalendarHeart } from 'lucide-react';
import { anniversaryDays, dayNumber, localToday, nextPlannedWish, type Anniversary, type LifeWish } from '@/lib/life';

export function CoupleDates({ anniversaries, wishes, zh, onWish }: {
  anniversaries: Anniversary[];
  wishes: LifeWish[];
  zh: boolean;
  onWish: (wish: LifeWish) => void;
}) {
  const [today, setToday] = useState(localToday);
  useEffect(() => {
    const refresh = () => setToday(localToday());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const next = nextPlannedWish(wishes, today);
  const days = next ? dayNumber(next.plannedDate) - dayNumber(today) : 0;
  const countdown = days === 0 ? (zh ? '就是今天' : 'Today') : (zh ? `还有 ${days} 天` : `In ${days} days`);
  const anniversary = anniversaries.map(item => ({ ...item, days: anniversaryDays(item.event_date, item.repeats_yearly, today) })).filter(item => item.days >= 0).sort((a, b) => a.days - b.days)[0];
  if (!anniversary && !next) return null;
  return <div className="header-date-ribbon">
    {anniversary && <div className="header-anniversary">{anniversary.emoji} {anniversary.title} · {anniversary.days === 0 ? (zh ? '就是今天' : 'Today') : (zh ? `还有 ${anniversary.days} 天` : `In ${anniversary.days} days`)}</div>}
    {next && <button type="button" className="header-anniversary next-wish-date" onClick={() => onWish(next)} aria-label={zh ? `查看心愿安排：${next.title}` : `View wish plan: ${next.title}`}><CalendarHeart size={14} aria-hidden="true"/><span>{next.title} · {countdown}<time dateTime={next.plannedDate}>{next.plannedDate}</time></span></button>}
  </div>;
}
