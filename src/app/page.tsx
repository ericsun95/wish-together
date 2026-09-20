"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Check, Heart, Link2, Plus, Trash2, X } from "lucide-react";
import { SpaceGate } from "@/components/space-gate";
import { Locale, messages } from "@/lib/messages";
import { supabase } from "@/lib/supabase";

type Wish = { id: string; title: string; note: string; url: string; done: boolean };
type View = "wishes" | "done";

const WISHES_KEY = "wish-together:wishes";
const LOCALE_KEY = "wish-together:locale";

function validUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function readWishes(key: string): Wish[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((wish): wish is Wish =>
      typeof wish === "object" && wish !== null &&
      typeof wish.id === "string" && typeof wish.title === "string" &&
      typeof wish.note === "string" && typeof wish.url === "string" &&
      typeof wish.done === "boolean" && validUrl(wish.url)
    );
  } catch {
    return [];
  }
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("wishes");
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_KEY);
    if (savedLocale === "en" || savedLocale === "zh-CN") {
      setLocale(savedLocale);
      document.documentElement.lang = savedLocale;
    }
    if (!supabase) setWishes(readWishes(WISHES_KEY));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && (!supabase || spaceId)) {
      localStorage.setItem(spaceId ? `${WISHES_KEY}:${spaceId}` : WISHES_KEY, JSON.stringify(wishes));
    }
  }, [ready, wishes, spaceId]);

  const changeSpace = useCallback((nextSpaceId: string | null) => {
    setSpaceId(nextSpaceId);
    setWishes(nextSpaceId ? readWishes(`${WISHES_KEY}:${nextSpaceId}`) : []);
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next;
  }

  const t = messages[locale];
  const visible = wishes.filter((wish) => wish.done === (view === "done"));

  function saveWish(event: React.FormEvent) {
    event.preventDefault();
    if (!validUrl(url.trim())) return setError(t.urlError);
    if (!title.trim()) return setError(t.titleError);
    setWishes((current) => [{ id: crypto.randomUUID(), title: title.trim(), note: note.trim(), url: url.trim(), done: false }, ...current]);
    setUrl("");
    setTitle("");
    setNote("");
    setError("");
    setAdding(false);
    setView("wishes");
  }

  return (
    <SpaceGate locale={locale} onLocaleChange={changeLocale} onSpaceChange={changeSpace}>
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Heart size={21} fill="currentColor" strokeWidth={1.5} /><span>{t.brand}</span></div>
        <div className="locale-control" role="group" aria-label={t.language}>
          <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => changeLocale("zh-CN")}>中</button>
          <button type="button" aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
        </div>
      </header>

      <section className="workspace">
        <div className="section-head">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={view === "wishes"} onClick={() => setView("wishes")}>{t.wishes}<span>{wishes.filter((w) => !w.done).length}</span></button>
            <button role="tab" aria-selected={view === "done"} onClick={() => setView("done")}>{t.done}<span>{wishes.filter((w) => w.done).length}</span></button>
          </div>
          <button className="primary" type="button" onClick={() => setAdding(true)}><Plus size={18} />{t.add}</button>
        </div>

        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Link2 size={25} /></div>
            <h1>{view === "done" ? t.completedEmpty : t.emptyTitle}</h1>
            {view === "wishes" && <p>{t.emptyBody}</p>}
            {view === "wishes" && <button type="button" className="text-action" onClick={() => setAdding(true)}><Plus size={16} />{t.add}</button>}
          </div>
        ) : (
          <div className="wish-list">
            {visible.map((wish) => (
              <article className="wish-row" key={wish.id}>
                <div className="wish-mark"><Heart size={17} /></div>
                <div className="wish-content">
                  <h2>{wish.title}</h2>
                  {wish.note && <p>{wish.note}</p>}
                  <a href={wish.url} target="_blank" rel="noopener noreferrer"><Link2 size={14} />{new URL(wish.url).hostname}<ArrowUpRight size={14} /></a>
                </div>
                <div className="row-actions">
                  <button type="button" className="icon-button" title={wish.done ? t.undo : t.markDone} aria-label={wish.done ? t.undo : t.markDone} onClick={() => setWishes((all) => all.map((item) => item.id === wish.id ? { ...item, done: !item.done } : item))}><Check size={18} /></button>
                  <button type="button" className="icon-button danger" title={t.delete} aria-label={t.delete} onClick={() => setWishes((all) => all.filter((item) => item.id !== wish.id))}><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="storage-note">{t.localOnly}</p>
      </section>

      {adding && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAdding(false); }}>
        <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="dialog-head"><h2 id="dialog-title">{t.add}</h2><button type="button" className="icon-button" aria-label={t.cancel} onClick={() => setAdding(false)}><X size={20} /></button></div>
          <form onSubmit={saveWish}>
            <label>{t.pasteLink}<input autoFocus type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://" /></label>
            <label>{t.title}<input value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} /></label>
            <label>{t.note}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="dialog-actions"><button type="button" className="secondary" onClick={() => setAdding(false)}>{t.cancel}</button><button type="submit" className="primary">{t.save}</button></div>
          </form>
        </div>
      </div>}
    </main>
    </SpaceGate>
  );
}
