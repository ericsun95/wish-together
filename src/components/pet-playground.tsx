"use client";

import { useEffect, useRef, useState } from 'react';
import { PetIllustration as PetPortrait } from './pet-portrait';

import { petVariety, type PetSpecies } from '@/lib/pet-catalog';
import { Pet3D } from './pet-3d';

type Game = 'fetch' | 'stars' | 'hide';
const games: { id: Game; emoji: string; zh: string; en: string }[] = [
  { id: 'fetch', emoji: '🎾', zh: '丢球接回', en: 'Fetch' },
  { id: 'stars', emoji: '✨', zh: '追星星', en: 'Star chase' },
  { id: 'hide', emoji: '🌳', zh: '躲猫猫', en: 'Hide-and-seek' },
];

export function PetPlayground({ species, appearance, name, zh, busy, onComplete }: {
  species: PetSpecies; appearance?: string; name: string; zh: boolean; busy: boolean; onComplete: () => Promise<void>;
}) {
  const [game, setGame] = useState<Game>('fetch');
  const [score, setScore] = useState(0);
  const [moving, setMoving] = useState(false);
  const [position, setPosition] = useState(24);
  const [target, setTarget] = useState(75);
  const [message, setMessage] = useState('');
  const [searched, setSearched] = useState<number[]>([]);
  const [found, setFound] = useState(false);
  const hiding = useRef(0), finished = useRef(false), locked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starRef = useRef<HTMLButtonElement>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const goal = game === 'stars' ? 5 : game === 'fetch' ? 3 : 1;
  const complete = score >= goal;

  function reset(next: Game = game) {
    if (timer.current) clearTimeout(timer.current);
    finished.current = false; locked.current = false;
    hiding.current = Math.floor(Math.random() * 3);
    setGame(next); setScore(0); setMoving(false); setPosition(24); setTarget(75); setMessage(''); setSearched([]); setFound(false);
  }
  function reward(nextScore: number) {
    setScore(nextScore);
    if (nextScore >= goal && !finished.current) {
      finished.current = true;
      setMessage(zh ? `${name}：和你玩最开心了！♡` : `${name}: Playing with you is the best! ♡`);
      void onComplete();
    }
  }
  function throwBall() {
    if (locked.current || complete || busy) return;
    locked.current = true; setMoving(true); setMessage('');
    setPosition(target);
    timer.current = setTimeout(() => {
      locked.current = false; setMoving(false);
      setMessage(zh ? `${name}把球接回来啦！` : `${name} caught the ball!`);
      reward(score + 1); setTarget(target > 50 ? 22 : 78);
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 900);
  }
  function catchStar() {
    if (complete || busy) return;
    setPosition(target); setTarget(target > 50 ? 16 + Math.random() * 22 : 62 + Math.random() * 22);
    reward(score + 1);
    starRef.current?.focus();
  }
  function search(index: number) {
    if (complete || busy || searched.includes(index)) return;
    setSearched(current => [...current, index]);
    if (index === hiding.current) { setFound(true); setPosition(17 + index * 33); reward(1); }
    else setMessage(zh ? '咦，不在这里，再找找看！' : 'Not here… try another hiding spot!');
  }

  return <section className="pet-playground" aria-label={zh ? '宠物游乐场' : 'Pet playground'}>
    <div className="pet-playground-heading"><div><span className="eyebrow">LET’S PLAY TOGETHER</span><h3>{zh ? '今天，玩点什么？' : 'What shall we play today?'}</h3></div><span className="pet-game-score" aria-label={zh ? '本局进度' : 'Round progress'}>{score} / {goal}</span></div>
    <div className="pet-game-tabs" role="group" aria-label={zh ? '选择小游戏' : 'Choose a game'}>{games.map(item => <button type="button" key={item.id} disabled={busy} aria-pressed={game === item.id} onClick={() => reset(item.id)}><span>{item.emoji}</span>{zh ? item.zh : item.en}</button>)}</div>
    <p className="life-muted">{game === 'fetch' ? (zh ? '把球丢出去，让它接住 3 次！' : 'Throw the ball for 3 happy catches!') : game === 'stars' ? (zh ? '点亮 5 颗星星，带它一起追光。' : 'Tap 5 stars and chase their sparkle together.') : (zh ? '它躲到哪棵小树后面了？点点看。' : 'Which little tree is your pet hiding behind? Tap to peek.')}</p>
    <div className={`pet-play-field pet-game-${game}`}>
      {petVariety(species,appearance).model && (species === 'cat' || species === 'dog') && <Pet3D species={species} game={{game,position,target,score,found,searched,moving,complete}}><span className="pet-field-cloud" aria-hidden="true">☁</span><span className="pet-field-flower" aria-hidden="true">🌼</span>
      </Pet3D>}
      {game === 'hide' && <div className="pet-hiding-spots">{[0, 1, 2].map(index => <button type="button" key={index} aria-label={zh ? `查看第 ${index + 1} 棵树` : `Look behind tree ${index + 1}`} disabled={busy || complete || searched.includes(index)} onClick={() => search(index)}>{found && index === hiding.current ? '💛' : searched.includes(index) ? '🍃' : '🌳'}</button>)}</div>}
      {(game !== 'hide' || found) && <div className="pet-field-friend" style={{ left: `${position}%` }}><PetPortrait species={species} appearance={appearance} mood={moving ? 'walk' : complete ? 'happy' : 'play'}/></div>}
      {game === 'fetch' && moving && <span className="pet-field-ball" style={{ left: `${target}%` }} aria-hidden="true">🎾</span>}
      {game === 'stars' && !complete && <button ref={starRef} type="button" className="pet-field-star" style={{ left: `${target}%`, top: `${score % 2 ? 22 : 44}%` }} aria-label={zh ? '抓住星星' : 'Catch the star'} disabled={busy} onClick={catchStar}>⭐</button>}
      {complete && <div className="pet-game-celebration" aria-hidden="true">✦ ♡ ✦</div>}
    </div>
    <p className="pet-game-message" role="status">{message || (zh ? `${name}已经准备好啦！` : `${name} is ready to play!`)}</p>
    <div className="pet-game-controls">{complete ? <button type="button" className="secondary" disabled={busy} onClick={() => reset()}>{zh ? '再玩一局' : 'Play again'}</button> : game === 'fetch' ? <button type="button" className="primary" disabled={busy || moving} onClick={throwBall}>{moving ? (zh ? '接球中…' : 'Catching…') : (zh ? '🎾 丢出小球' : '🎾 Throw the ball')}</button> : <button type="button" className="text-action" disabled={busy} onClick={() => reset()}>{zh ? '重新开始' : 'Start over'}</button>}</div>
    <p className="life-muted">{zh ? '随时都能玩。每天首次完成小游戏可领取陪玩成长 +10；已领过也能继续玩。' : 'Play anytime. Your first completed game each day earns the daily play growth +10. Keep playing after collecting it.'}</p>
  </section>;
}
