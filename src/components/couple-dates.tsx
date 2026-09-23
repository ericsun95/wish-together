"use client";

import { useEffect, useState } from 'react';
import { CalendarHeart, Heart } from 'lucide-react';
import { dayNumber, daysTogether, localToday, nextPlannedWish, type LifeWish } from '@/lib/life';

export function CoupleDates({ togetherSince, wishes, zh, onWish }: {
  togetherSince?: string | null;
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
  return <div className="couple-date-summary">
    <div className="couple-date-tile together-date">
      <span className="couple-date-label"><Heart size={14}/>{zh ? '我们的日子' : 'OUR DAYS TOGETHER'}</span>
      <strong>{togetherSince ? (zh ? `在一起第 ${daysTogether(togetherSince, today)} 天` : `${daysTogether(togetherSince, today)} days together`) : (zh ? '我们的故事，慢慢写' : 'Our story, one day at a time')}</strong>
      {togetherSince && <time dateTime={togetherSince}>{zh ? '从 ' : 'Since '}{togetherSince}</time>}
    </div>
    <button type="button" className="couple-date-tile next-wish-date" disabled={!next} onClick={() => { if (next) onWish(next); }}>
      <span className="couple-date-label"><CalendarHeart size={14}/>{zh ? '下一件想做的事' : 'OUR NEXT LITTLE PLAN'}</span>
      <strong>{next?.title || (zh ? '还没有安排日期' : 'No date planned yet')}</strong>
      <span className="couple-date-meta">{next ? <><time dateTime={next.plannedDate}>{next.plannedDate}</time><span>· {countdown}</span></> : (zh ? '给一个心愿定个日子吧' : 'Set a date for a wish')}</span>
    </button>
  </div>;
}
