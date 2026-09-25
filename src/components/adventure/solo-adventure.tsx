"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowLeftRight, Check, Compass, Expand, Home, Map, Pause, Play, RotateCcw, Star, X } from 'lucide-react';
import { action, announce, freshGame, gateOpen, interact, phase, restoreGame, route, stars, switchPet, tick, type Game, type Point } from '@/lib/adventure/game';
import { supabase } from '@/lib/supabase';
import { petImage } from '@/lib/pet-catalog';
import { selectParty, type AdventurePet } from '@/lib/adventure/party';
import type { View } from '@/lib/adventure/scene';
import './solo-adventure.css';

type Props = { spaceId: string | null; zh: boolean; onPets?: () => void };
type Screen = 'lobby' | 'playing' | 'paused' | 'won';
type RecordScore = { stars: number; seconds: number };
const copy = {
  zh: {
    title: '一起冒险', subtitle: '一人操作，两个默契的小伙伴。', chapter: '第一章 · 厨房秘密行动', name: '零食营救计划',
    story: '零食被收进了储藏间，扫地机器人还在巡逻。猫咪够得高，狗狗力气大——换着指挥它们，把零食带回小窝。',
    start: '开始冒险', resume: '继续上次冒险', fresh: '重新开一局', single: '单人 · 猫狗切换', duration: '约 3–5 分钟',
    cat: '猫咪', dog: '狗狗', catSkill: '爬上台面 · 叼走零食', dogSkill: '移动凳子 · 压住门垫',
    controls: '方向键 / WASD 移动 · E 互动 · Q 切换 · Esc 暂停。也可以点地面走过去，或用屏幕方向盘。',
    hints: '遇到机器人先停住，它只会留意正在移动的小伙伴。被发现会送回窝里，机关进度仍然保留。',
    local: '关卡进度和纪录保存在当前设备。', noSave: '当前浏览器无法保存进度；这局仍然可以正常玩。',
    goal: ['狗狗把小凳子移到台边的金色圆环', '切换猫咪，爬上台面按下电源', '狗狗踩住金色门垫，留在原地', '切换猫咪，穿过门去拿零食', '带着零食，让两个伙伴都回到小窝', '零食到家，任务完成！'],
    act: { grab: '抓住凳子', release: '放下凳子', climb: '爬上台面', down: '跳回地面', power: '按下电源', snack: '叼走零食', stay: '留在门垫上', hint: '看看提示', finished: '已完成' },
    events: {
      welcome: '先让狗狗走到橘色小凳子旁，抓住它，再移到台边的金色圆环。',
      grabbed: '抓住了！用方向控制一起移动，再按互动可放下；到圆环会自动停好。', released: '凳子放下了，需要时再抓住它。', docked: '位置刚好！切换猫咪，靠近凳子爬上台面。',
      climbed: '上来了。沿着台面向右走，找到金色电源按钮。', powered: '储藏间通电了，机器人也醒了！猫咪先跳下来，再切换狗狗去踩门垫。',
      down: '轻轻落地。随时切换伙伴，它会在原地等你。', snack: '零食到手！先让猫咪出门回窝，再带狗狗回家。', stay: '狗狗踩着，门就开着。现在切换猫咪去拿零食吧。',
      coin: '找到一枚小爪印！收集三枚可以多拿一颗星。', caught: '被机器人送回家了。机关还在，稍微停一下再出发。', won: '任务完成！最好的零食，要一起分享。',
      catTurn: '现在轮到猫咪。狗狗会留在原地等你。', dogTurn: '现在轮到狗狗。猫咪会留在原地等你。', resumed: '欢迎回来，继续你们的秘密行动。', blocked: '这里走不过去，换一条路线，或先打开门。',
      hint0: '橘色凳子在厨房中间偏左。狗狗靠近后抓住它，向上移到台边的圆环。', hint1: '猫咪靠近停好的凳子就能上台，再向右走到电源前。',
      hint2: '金色门垫在储藏间门的左侧。让狗狗站在中央，再切换猫咪。', hint3: '门开着时，让猫咪走进右侧储藏间，靠近零食罐按互动。', hint4: '狗狗先别离开门垫！猫咪拿着零食出来后，两只都回左下角的窝。',
    },
    pause: '休息一下', pauseNote: '机器人也暂停了，放心慢慢想。', leave: '保存并回大厅', continue: '继续行动', retry: '再来一局', won: '零食，救回来啦！',
    stats: ['完成任务', '收齐三枚爪印', '一次也没被发现'], time: '用时', catches: '被发现', best: '最佳纪录', footprints: '爪印', alert: '机器人注意值',
    switch: '切换伙伴', interact: '互动', map: '简洁地图', scene: '立体厨房', loading: '正在布置厨房…', error: '立体画面暂时无法使用，可以换成简洁地图继续玩。', fullscreen: '全屏', paused: '暂停',
    orient: '横屏玩，厨房看得更清楚', repeat: '重新开始会替换当前关卡进度，最佳纪录会保留。', cancel: '算了，继续这局', confirm: '重新开始',
  },
  en: {
    title: 'Little adventures', subtitle: 'One player. Two partners in mischief.', chapter: 'CHAPTER 01 · THE KITCHEN CAPER', name: 'Operation: Treat Rescue',
    story: 'The treats are locked in the pantry, and the robot vacuum is on patrol. The cat can climb. The dog can move things. Take turns leading them and bring the treats home.',
    start: 'Start adventure', resume: 'Continue adventure', fresh: 'Start a new run', single: 'Solo · switch pets', duration: 'About 3–5 minutes',
    cat: 'Cat', dog: 'Dog', catSkill: 'Climb counters · carry treats', dogSkill: 'Move the stool · hold the pad',
    controls: 'Arrows / WASD to move · E to interact · Q to switch · Esc to pause. Tap the floor to walk, or use the direction pad.',
    hints: 'Stop when the vacuum is looking: it only notices moving pets. Getting spotted sends your pet home, but keeps your puzzle progress.',
    local: 'Progress and records are saved on this device.', noSave: 'This browser cannot save progress. You can still play this run.',
    goal: ['Move the stool to the golden ring with the dog', 'Switch to the cat, climb up and turn on the power', 'Keep the dog on the golden pressure pad', 'Switch to the cat and fetch the pantry treats', 'Bring both pets and the treats back to their bed', 'Treats rescued. Mission complete!'],
    act: { grab: 'Grab stool', release: 'Let go', climb: 'Climb up', down: 'Jump down', power: 'Power on', snack: 'Take treats', stay: 'Stay on pad', hint: 'Get a hint', finished: 'Complete' },
    events: {
      welcome: 'Take the dog to the orange stool. Grab it, then move it onto the golden ring by the counter.', grabbed: 'Got it! Move with the direction controls. Interact again to let go; the stool parks automatically at the ring.', released: 'Stool released. Grab it again whenever you need.', docked: 'Perfect! Switch to the cat and climb up beside the stool.',
      climbed: 'You made it. Walk right along the counter to the golden power button.', powered: 'The pantry has power, and the vacuum is awake! Jump down, then switch to the dog and stand on the pad.',
      down: 'Soft landing. Your other pet will wait where you leave it.', snack: 'Treats secured! Bring the cat out first, then take both pets home.', stay: 'The dog is holding the gate open. Switch to the cat to fetch the treats.',
      coin: 'A paw token! Find all three for an extra star.', caught: 'The vacuum sent you home. Your puzzle progress is safe. Pause, then try again.', won: 'Mission complete! Good treats are made for sharing.',
      catTurn: 'Your turn, cat. The dog will wait here.', dogTurn: 'Your turn, dog. The cat will wait here.', resumed: 'Welcome back. Your secret mission awaits.', blocked: 'That route is blocked. Try another way or open the gate.',
      hint0: 'The orange stool is left of the kitchen island. Grab it with the dog and move it north to the ring.', hint1: 'Take the cat beside the parked stool, climb up, then walk right to the power button.',
      hint2: 'The golden pad is just left of the pantry gate. Put the dog in its centre, then switch to the cat.', hint3: 'With the gate open, walk the cat into the right-hand pantry and interact beside the treat jar.', hint4: 'Leave the dog on the pad until the cat gets out! Then bring both pets to the bed in the lower-left corner.',
    },
    pause: 'Take a breather', pauseNote: 'The vacuum is paused too. Take your time.', leave: 'Save & return to lobby', continue: 'Continue mission', retry: 'Play again', won: 'Treats, rescued!',
    stats: ['Complete the mission', 'Collect all three paw tokens', 'Never get spotted'], time: 'Time', catches: 'Spotted', best: 'Personal best', footprints: 'Paws', alert: 'Vacuum awareness',
    switch: 'Switch pet', interact: 'Interact', map: 'Simple map', scene: '3D kitchen', loading: 'Setting up the kitchen…', error: 'The 3D view is unavailable. Switch to the simple map to keep playing.', fullscreen: 'Fullscreen', paused: 'Pause',
    orient: 'Turn your phone sideways for a wider view', repeat: 'A new run replaces your current progress. Your best record stays.', cancel: 'Keep this run', confirm: 'Start over',
  },
};
const formatTime = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
const emptyInput = () => ({ x: 0, z: 0 });

export function SoloAdventure(props: Props) { return <AdventureFamily key={props.spaceId || 'local'} {...props}/>; }
function AdventureFamily(props: Props) {
  const [pets, setPets] = useState<AdventurePet[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let disposed = false, request = 0;
    async function load() {
      const id = ++request;
      if (!props.spaceId || !supabase) { setPets([]); setStatus('ready'); return; }
      try {
        const { data, error } = await supabase.from('space_pets').select('id,name,species,appearance').eq('space_id', props.spaceId).order('slot');
        if (disposed || id !== request) return;
        if (error) throw error;
        setPets(previous => JSON.stringify(previous) === JSON.stringify(data) ? previous : (data || []) as AdventurePet[]); setStatus('ready');
      } catch { if (!disposed && id === request) setStatus('error'); }
    }
    void load(); window.addEventListener('focus', load); window.addEventListener('pet-updated', load);
    return () => { disposed = true; window.removeEventListener('focus', load); window.removeEventListener('pet-updated', load); };
  }, [props.spaceId, retry]);
  if (status !== 'ready') return <div className="life-empty" role="status">{status === 'loading' ? (props.zh ? '正在接你们的小伙伴…' : 'Finding your pets…') : <>{props.zh ? '暂时无法加载宠物。' : 'Could not load your pets.'}<button type="button" onClick={() => {setStatus('loading');setRetry(v => v+1);}}>{props.zh ? '重试' : 'Retry'}</button></>}</div>;
  return <Adventure {...props} pets={pets}/>;
}
export function Adventure({ spaceId, zh, onPets, pets }: Props & { pets: AdventurePet[] }) {
  const t = copy[zh ? 'zh' : 'en'];
  const [ids, setIds] = useState<Partial<Record<'cat' | 'dog', string>>>({});
  const partyKey = `wish-together:adventure:party:v1:${spaceId || 'local'}`;
  useEffect(() => { try { const value = JSON.parse(localStorage.getItem(partyKey) || '{}'); if (value && typeof value === 'object') setIds({cat:typeof value.cat === 'string' ? value.cat : undefined,dog:typeof value.dog === 'string' ? value.dog : undefined}); } catch { /* Default to the first adopted cat and dog. */ } }, [partyKey]);
  const party = useMemo(() => selectParty(pets, ids), [pets, ids]);
  function choose(species: 'cat' | 'dog', id: string) { const next = {...ids, [species]:id}; setIds(next); try { localStorage.setItem(partyKey, JSON.stringify(next)); } catch { setSaveOk(false); } }
  const chosen = (species: 'cat' | 'dog') => pets.find(p=>p.species===species && p.id===ids[species]) || pets.find(p=>p.species===species);
  const image = (species: 'cat' | 'dog') => { const pet = chosen(species); return pet ? petImage(species, pet.appearance) : undefined; };
  const key = `wish-together:adventure:kitchen:v1:${spaceId || 'local'}`;
  const game = useRef<Game>(freshGame());
  const [snapshot, setSnapshot] = useState<Game>(() => freshGame());
  const [screen, setScreen] = useState<Screen>('lobby');
  const screenRef = useRef(screen); screenRef.current = screen;
  const [hasSave, setHasSave] = useState(false), [record, setRecord] = useState<RecordScore | null>(null);
  const [saveOk, setSaveOk] = useState(true), [mapOnly, setMapOnly] = useState(false), [loaded, setLoaded] = useState(false), [error, setError] = useState(false), [confirmReset, setConfirmReset] = useState(false);
  const input = useRef(emptyInput()), keys = useRef(new Set<string>()), path = useRef<Point[]>([]), view = useRef<View | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null), frame = useRef(0), dialog = useRef<HTMLDivElement>(null), launch = useRef<HTMLButtonElement>(null);
  const running = screen !== 'lobby';
  const storageReady = useRef(false), hasStarted = useRef(false);
  const sync = useCallback(() => setSnapshot(structuredClone(game.current)), []);
  const clearInput = useCallback(() => { input.current = emptyInput(); keys.current.clear(); path.current = []; }, []);
  const persist = useCallback(() => {
    if (!storageReady.current || !hasStarted.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(game.current)); setHasSave(!game.current.won);
      if (game.current.won) {
        const score = { stars: stars(game.current), seconds: Math.floor(game.current.elapsed) };
        setRecord(previous => {
          const best = !previous || score.stars > previous.stars || score.stars === previous.stars && score.seconds < previous.seconds ? score : previous;
          try { localStorage.setItem(`${key}:best`, JSON.stringify(best)); } catch { /* The completed run is still available above. */ }
          return best;
        });
      }
    } catch { setSaveOk(false); }
  }, [key]);
  useEffect(() => {
    try {
      const saved = restoreGame(localStorage.getItem(key)); if (saved) { hasStarted.current = true; game.current = saved; setHasSave(!saved.won); sync(); }
      const best = JSON.parse(localStorage.getItem(`${key}:best`) || 'null');
      if (best && Number.isInteger(best.stars) && best.stars >= 1 && best.stars <= 3 && Number.isFinite(best.seconds) && best.seconds >= 0) setRecord(best);
    } catch { setSaveOk(false); }
    storageReady.current = true;
    return () => { persist(); storageReady.current = false; };
  }, [key, persist, sync]);
  useEffect(() => { if (!party) { clearInput(); setScreen('lobby'); } }, [party, clearInput]);
  function start(reset = false) {
    if (!party) return;
    hasStarted.current = true;
    if (reset || game.current.won) game.current = freshGame();
    clearInput(); sync(); setConfirmReset(false); setScreen('playing');
  }
  const pause = useCallback(() => { clearInput(); if (screenRef.current === 'playing') { setScreen('paused'); persist(); sync(); } }, [clearInput, persist, sync]);
  const changePet = useCallback(() => { clearInput(); switchPet(game.current); sync(); persist(); }, [clearInput, persist, sync]);
  const act = useCallback(() => { path.current = []; interact(game.current); sync(); persist(); }, [persist, sync]);
  function leave() { clearInput(); persist(); setScreen('lobby'); setConfirmReset(false); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); requestAnimationFrame(() => launch.current?.focus()); }

  useEffect(() => {
    if (!running || !party) return;
    const abort = new AbortController(); let engine: View | null = null, disposed = false, last = 0, uiTime = 0, saveTime = 0, stuckTime = 0;
    const node = canvas.current!; setLoaded(false); setError(false);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => { const box = node.getBoundingClientRect(); engine?.resize(Math.max(1, box.width), Math.max(1, box.height)); };
    const observer = new ResizeObserver(resize); observer.observe(node);
    const lost = (event: Event) => { event.preventDefault(); pause(); setError(true); };
    node.addEventListener('webglcontextlost', lost);
    void import('@/lib/adventure/scene').then(module => disposed ? null : module.createScene(node, zh, mapOnly, abort.signal, party)).then(result => {
      if (!result) return;
      if (disposed) { result.dispose(); return; } engine = result; view.current = result; resize(); setLoaded(true);
      function draw(now: number) {
        if (disposed) return;
        const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
        if (screenRef.current === 'playing' && !document.hidden) {
          const held = keys.current;
          const movement = { x: input.current.x + Number(held.has('d') || held.has('arrowright')) - Number(held.has('a') || held.has('arrowleft')), z: input.current.z + Number(held.has('s') || held.has('arrowdown')) - Number(held.has('w') || held.has('arrowup')) };
          const state = game.current, pet = state.pets[state.active], before = { x: pet.x, z: pet.z };
          if (movement.x || movement.z) path.current = [];
          else if (path.current.length) {
            while (path.current.length && Math.hypot(path.current[0].x - pet.x, path.current[0].z - pet.z) < .15) path.current.shift();
            const point = path.current[0]; if (point) { const d = Math.hypot(point.x - pet.x, point.z - pet.z); movement.x = (point.x - pet.x) / d; movement.z = (point.z - pet.z) / d; }
          }
          const eventId = state.eventId; tick(state, movement, dt);
          if (path.current.length && Math.hypot(pet.x - before.x, pet.z - before.z) < .001) stuckTime += dt; else stuckTime = 0;
          if (stuckTime > .6) { path.current = []; announce(state, 'blocked'); stuckTime = 0; }
          uiTime += dt; saveTime += dt;
          if (state.eventId !== eventId || uiTime > .12) { sync(); uiTime = 0; }
          if (saveTime > 2 || state.won) { persist(); saveTime = 0; }
          if (state.won) { clearInput(); setScreen('won'); }
        }
        engine?.render(game.current, screenRef.current === 'playing' ? dt : 0, reduced.matches);
        frame.current = requestAnimationFrame(draw);
      }
      frame.current = requestAnimationFrame(draw);
    }).catch(() => { if (!disposed) { setError(true); pause(); } });
    return () => { disposed = true; abort.abort(); cancelAnimationFrame(frame.current); observer.disconnect(); node.removeEventListener('webglcontextlost', lost); engine?.dispose(); view.current = null; clearInput(); };
  }, [running, zh, mapOnly, party, clearInput, pause, persist, sync]);

  useEffect(() => {
    if (!running) return;
    const visibility = () => { if (document.hidden) pause(); };
    const down = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const buttons = Array.from((dialog.current?.querySelector('.adventure-modal') || dialog.current)?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]') || []).filter(el => el.offsetParent !== null);
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        return;
      }
      const name = event.key.toLowerCase();
      if (name === 'escape' || name === 'p') { event.preventDefault(); if (screenRef.current === 'playing') pause(); else if (screenRef.current === 'paused' && !confirmReset && !error) setScreen('playing'); return; }
      if (screenRef.current !== 'playing' || !loaded) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(name)) { event.preventDefault(); keys.current.add(name); }
      if (!event.repeat && name === 'q') { event.preventDefault(); changePet(); }
      if (!event.repeat && name === 'e') { event.preventDefault(); act(); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); };
  }, [running, loaded, pause, changePet, act, confirmReset, error]);
  useEffect(() => { if (!running) return; dialog.current?.focus(); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, [running]);
  useEffect(() => { if (screen === 'paused' || screen === 'won') requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>('.adventure-modal button')?.focus()); }, [screen]);
  function pointerWalk(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (screen !== 'playing' || !loaded) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = view.current?.pick((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, game.current.pets[game.current.active].y > 0);
    if (!point) return;
    path.current = game.current.grab ? [point] : route(game.current, point);
    if (!path.current.length) { announce(game.current, 'blocked'); sync(); }
  }
  function direction(event: ReactPointerEvent<HTMLButtonElement>, x: number, z: number) {
    if (screen !== 'playing') return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); path.current = []; input.current = { x, z };
  }
  const active = snapshot.active, currentPhase = phase(snapshot);
  const message = t.events[snapshot.event as keyof typeof t.events] || t.goal[currentPhase];
  const ability = t.act[action(snapshot) as keyof typeof t.act];
  return <section className="adventure-module" aria-label={t.title}>
    <div className="adventure-lobby">
      <div className="adventure-intro"><span className="adventure-kicker">LITTLE PAWS · BIG PLANS</span><h2>{t.title}</h2><p>{t.subtitle}</p></div>
      <div className="adventure-chapter">
        <div className="adventure-chapter-art" aria-hidden="true"><div className="adventure-art-window"/><span className="adventure-art-cookie">🍪</span>{image('cat') && <img className="adventure-art-cat" src={image('cat')} alt=""/>}{image('dog') && <img className="adventure-art-dog" src={image('dog')} alt=""/>}<span className="adventure-art-number">01</span></div>
        <div className="adventure-chapter-copy"><span className="adventure-kicker">{t.chapter}</span><h3>{t.name}</h3><p>{t.story}</p><div className="adventure-tags"><span>{t.single}</span><span>{t.duration}</span></div>
          <div className="adventure-lobby-actions"><button ref={launch} disabled={!party} type="button" className="adventure-primary" onClick={() => start(!hasSave)}><Play size={17}/>{hasSave ? t.resume : t.start}</button>{hasSave && <button type="button" className="adventure-text" onClick={() => setConfirmReset(true)}>{t.fresh}</button>}</div>
          {record && <p className="adventure-record">{'★'.repeat(record.stars)} · {t.best} {formatTime(record.seconds)}</p>}
        </div>
      </div>
      {!party && <p className="adventure-party-note" role="status">{zh ? '这一关需要一只已领养的猫咪和一只狗狗。先到宠物小屋接齐伙伴吧。' : 'This chapter needs an adopted cat and dog. Visit your pets to complete the team.'}{onPets && <button type="button" className="adventure-text" onClick={onPets}>{zh ? '去宠物小屋 →' : 'Visit your pets →'}</button>}</p>}
      <div className="adventure-pet-cards">{(['cat', 'dog'] as const).map(species => <div key={species}>{image(species) && <img src={image(species)} alt=""/>}<div><strong>{chosen(species)?.name || t[species]}</strong>{pets.filter(p=>p.species===species).length > 1 && <label className="adventure-pet-select">{zh ? `出场${t[species]}` : `Choose ${t[species]}`}<select value={chosen(species)?.id} onChange={e=>choose(species,e.target.value)}>{pets.filter(p=>p.species===species).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}<p>{species === 'cat' ? t.catSkill : t.dogSkill}</p></div></div>)}</div>
      <p className="adventure-help">{t.controls}</p><p className="adventure-help">{t.hints}</p><small className="adventure-local">{saveOk ? t.local : t.noSave}</small>
      {confirmReset && !running && <div className="adventure-reset-note" role="alert"><p>{t.repeat}</p><button type="button" className="adventure-primary" onClick={() => start(true)}>{t.confirm}</button><button type="button" className="adventure-text" onClick={() => setConfirmReset(false)}>{t.cancel}</button></div>}
    </div>
    {running && party && <div ref={dialog} className="adventure-game" role="dialog" aria-modal="true" aria-labelledby="adventure-title" tabIndex={-1}>
      <header className="adventure-game-head"><div><span className="adventure-kicker">{t.chapter}</span><h2 id="adventure-title">{t.name}</h2></div><div className="adventure-tools"><button type="button" title={mapOnly ? t.scene : t.map} aria-label={mapOnly ? t.scene : t.map} onClick={() => { clearInput(); setMapOnly(v => !v); }}><Map size={19}/></button><button type="button" title={t.fullscreen} aria-label={t.fullscreen} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void dialog.current?.requestFullscreen?.().catch(() => {}); }}><Expand size={19}/></button><button type="button" title={t.paused} aria-label={t.paused} onClick={pause}><Pause size={19}/></button><button type="button" title={t.leave} aria-label={t.leave} onClick={leave}><X size={19}/></button></div></header>
      <div className="adventure-objective"><span className="adventure-step">{Math.min(5, currentPhase + 1)}/5</span><strong>{t.goal[currentPhase]}</strong><div className="adventure-counters"><span aria-label={t.footprints}>✦ {snapshot.coins.filter(Boolean).length}/3</span><time>{formatTime(snapshot.elapsed)}</time></div></div>
      <div className="adventure-viewport"><canvas key={String(mapOnly)} ref={canvas} onPointerDown={pointerWalk} aria-label={zh ? '厨房关卡。点击地面移动，或使用下方方向控制。' : 'Kitchen level. Tap the floor to walk, or use the direction controls.'}/>
        {!loaded && !error && <div className="adventure-loading" role="status"><Compass size={28}/>{t.loading}</div>}
        <div className="adventure-awareness" aria-label={t.alert}><span>◉</span><meter min={0} max={100} value={snapshot.alert} aria-label={t.alert}/></div>
        <span className="adventure-orient">{t.orient}</span>
        {snapshot.powered && <div className={`adventure-gate-status ${gateOpen(snapshot) ? 'is-open' : ''}`}>{zh ? (gateOpen(snapshot) ? '门已打开 · 狗狗守住' : '门关闭 · 需要狗狗踩垫') : (gateOpen(snapshot) ? 'Gate open · dog is holding' : 'Gate shut · dog needs the pad')}</div>}
      </div>
      <div className="adventure-bottom"><p className="adventure-message" role="status" aria-live="polite">{message}</p><div className="adventure-controls">
        <div className="adventure-direction" role="group" aria-label={zh ? '移动方向' : 'Movement'}>{([{ x: 0, z: -1, icon: ArrowUp, name: zh ? '向上移动' : 'Move up', cls: 'up' }, { x: -1, z: 0, icon: ArrowLeft, name: zh ? '向左移动' : 'Move left', cls: 'left' }, { x: 0, z: 1, icon: ArrowDown, name: zh ? '向下移动' : 'Move down', cls: 'down' }, { x: 1, z: 0, icon: ArrowRight, name: zh ? '向右移动' : 'Move right', cls: 'right' }]).map(({ x, z, icon: Icon, name, cls }) => <button type="button" key={cls} className={cls} aria-label={name} disabled={!loaded || screen !== 'playing'} onPointerDown={e => direction(e, x, z)} onPointerUp={() => { input.current = emptyInput(); }} onPointerCancel={() => { input.current = emptyInput(); }} onLostPointerCapture={() => { input.current = emptyInput(); }} onClick={e => { if (e.detail === 0) { for (let i = 0; i < 5; i++) tick(game.current, { x, z }, .04); sync(); } }}><Icon size={23}/></button>)}</div>
        <button className="adventure-switch" type="button" onClick={changePet} disabled={!loaded || screen !== 'playing'}><img src={image(active)} alt=""/><span><strong>{party?.[active].name || t[active]}</strong><small>{t.switch} <kbd>Q</kbd></small></span><ArrowLeftRight size={19}/></button>
        <button className="adventure-action" type="button" onClick={act} disabled={!loaded || screen !== 'playing'}><span>{ability}</span><kbd>E</kbd></button>
      </div></div>
      {(screen === 'paused' || screen === 'won' || error) && <div className="adventure-modal-backdrop"><div className="adventure-modal">
        {screen === 'won' ? <><div className="adventure-stars" aria-label={`${stars(snapshot)} / 3`}>{[1, 2, 3].map(n => <Star key={n} size={36} fill={n <= stars(snapshot) ? 'currentColor' : 'none'} className={n <= stars(snapshot) ? 'earned' : ''}/>)}</div><h3>{t.won}</h3><ul className="adventure-results">{[true, snapshot.coins.every(Boolean), snapshot.catches === 0].map((done, i) => <li key={i}><Check size={17} style={{ opacity: done ? 1 : .18 }}/>{t.stats[i]}</li>)}</ul><p>{t.time} {formatTime(snapshot.elapsed)} · {t.catches} {snapshot.catches}</p><button type="button" className="adventure-primary" onClick={() => start(true)}><RotateCcw size={16}/>{t.retry}</button><button type="button" className="adventure-text" onClick={leave}><Home size={16}/>{t.leave}</button></>
          : <><span className="adventure-modal-paw">🐾</span><h3>{t.pause}</h3><p>{error ? t.error : confirmReset ? t.repeat : t.pauseNote}</p>
            {error ? <button type="button" className="adventure-primary" onClick={() => { setMapOnly(true); setError(false); setScreen('playing'); }}>{t.map}</button> : confirmReset ? <><button type="button" className="adventure-primary" onClick={() => start(true)}>{t.confirm}</button><button type="button" className="adventure-text" onClick={() => setConfirmReset(false)}>{t.cancel}</button></> : <><button type="button" className="adventure-primary" onClick={() => { clearInput(); setScreen('playing'); }}><Play size={17}/>{t.continue}</button><button type="button" className="adventure-text" onClick={() => setConfirmReset(true)}><RotateCcw size={16}/>{t.fresh}</button></>}
            <button type="button" className="adventure-text" onClick={leave}><Home size={16}/>{t.leave}</button><small>{saveOk ? t.local : t.noSave}</small>
          </>}
      </div></div>}
    </div>}
  </section>;
}
