"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, Heart, LayoutDashboard, Link2, ListPlus, MapPin, Palette, Pencil, Plus, Trash2, X } from "lucide-react";
import { SpaceGate } from "@/components/space-gate";
import { Locale, messages } from "@/lib/messages";
import { supabase } from "@/lib/supabase";

type ChecklistItem = { id: string; label: string; completed: boolean; position: number };
type WishStatus = "wanted" | "planned" | "done";
type Wish = { id: string; title: string; note: string; url: string; address: string; category: string; status: WishStatus; plannedDate: string; completionNote: string; createdAt: string; checklist: ChecklistItem[] };
type View = "wishes" | "done" | "dashboard";
type Theme = "clean" | "coast" | "city" | "garden";

const WISHES_KEY = "wish-together:wishes";
const LOCALE_KEY = "wish-together:locale";
const THEME_KEY = "wish-together:theme";
const THEMES: Theme[] = ["clean", "coast", "city", "garden"];

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
    return saved.filter((wish: unknown) =>
      typeof wish === "object" && wish !== null &&
      typeof (wish as Record<string, unknown>).id === "string" && typeof (wish as Record<string, unknown>).title === "string" &&
      typeof (wish as Record<string, unknown>).note === "string"
    ).map((wish: Record<string, unknown>) => ({
      ...wish,
      url: typeof wish.url === "string" && validUrl(wish.url) ? wish.url : "",
      address: typeof wish.address === "string" ? wish.address : "",
      category: typeof wish.category === "string" ? wish.category : "",
      status: wish.status === "planned" || wish.status === "done" ? wish.status : wish.done === true ? "done" : "wanted",
      plannedDate: typeof wish.plannedDate === "string" ? wish.plannedDate : "",
      completionNote: typeof wish.completionNote === "string" ? wish.completionNote : "",
      createdAt: typeof wish.createdAt === "string" ? wish.createdAt : "",
      checklist: Array.isArray(wish.checklist) ? wish.checklist : [],
    })) as Wish[];
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
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("clean");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<WishStatus>("wanted");
  const [plannedDate, setPlannedDate] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [checklistDraft, setChecklistDraft] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_KEY);
    if (savedLocale === "en" || savedLocale === "zh-CN") {
      setLocale(savedLocale);
      document.documentElement.lang = savedLocale;
    }
    if (!supabase) {
      setWishes(readWishes(WISHES_KEY));
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (THEMES.includes(savedTheme as Theme)) setTheme(savedTheme as Theme);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !supabase) localStorage.setItem(WISHES_KEY, JSON.stringify(wishes));
  }, [ready, wishes]);

  useEffect(() => {
    if (!supabase || !spaceId) return;
    const client = supabase;
    async function loadWishes() {
      setError("");
      const { data: rows, error: wishError } = await client.from("wishes")
        .select("id, title, note, url, address, category, status, planned_date, completed_note, created_at").eq("space_id", spaceId).order("created_at", { ascending: false });
      if (wishError || !rows) return setError(messages[locale].wishLoadError);
      const ids = rows.map((row) => row.id);
      const { data: items, error: itemError } = ids.length
        ? await client.from("wish_checklist_items").select("id, wish_id, label, completed, position").in("wish_id", ids).order("position")
        : { data: [], error: null };
      if (itemError) return setError(messages[locale].wishLoadError);
      setWishes(rows.map((row) => ({
        id: row.id, title: row.title, note: row.note, url: row.url ?? "", address: row.address ?? "", category: row.category ?? "",
        status: row.status as WishStatus, plannedDate: row.planned_date ?? "", completionNote: row.completed_note ?? "", createdAt: row.created_at,
        checklist: (items ?? []).filter((item) => item.wish_id === row.id),
      })));
    }
    void loadWishes();
  }, [spaceId, locale]);

  useEffect(() => {
    if (!supabase || !spaceId) return;
    const client = supabase;
    async function loadTheme() {
      const { data } = await client.from("couple_spaces").select("theme").eq("id", spaceId).single();
      if (data && THEMES.includes(data.theme as Theme)) setTheme(data.theme as Theme);
    }
    void loadTheme();
  }, [spaceId]);

  const changeSpace = useCallback((nextSpaceId: string | null) => {
    setSpaceId(nextSpaceId);
    if (!supabase) setWishes(readWishes(WISHES_KEY));
    else if (!nextSpaceId) setWishes([]);
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next;
  }

  const t = messages[locale];
  const visible = wishes.filter((wish) => view !== "dashboard" && (wish.status === "done") === (view === "done"));
  const checklistTotal = wishes.reduce((total, wish) => total + wish.checklist.length, 0);
  const checklistDone = wishes.reduce((total, wish) => total + wish.checklist.filter((item) => item.completed).length, 0);
  const categories = Object.entries(wishes.reduce<Record<string, number>>((all, wish) => {
    if (wish.category) all[wish.category] = (all[wish.category] ?? 0) + 1;
    return all;
  }, {})).sort((a, b) => b[1] - a[1]);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const themeImage = (selected: Theme) => selected === "clean" ? undefined : `url("${basePath}/themes/${selected}.webp")`;
  const themeStyle = { "--theme-image": themeImage(theme) } as CSSProperties;

  function resetEditor() {
    setTitle(""); setUrl(""); setAddress(""); setCategory(""); setNote(""); setStatus("wanted"); setPlannedDate(""); setCompletionNote("");
    setChecklistDraft([]); setEditingId(null); setError(""); setAdding(false);
  }

  function openNewWish() {
    resetEditor();
    setAdding(true);
  }

  function openEditWish(wish: Wish) {
    setTitle(wish.title); setUrl(wish.url); setAddress(wish.address); setCategory(wish.category); setNote(wish.note);
    setStatus(wish.status); setPlannedDate(wish.plannedDate); setCompletionNote(wish.completionNote);
    setChecklistDraft(wish.checklist.map((item) => ({ ...item })));
    setEditingId(wish.id); setError(""); setAdding(true);
  }

  async function chooseTheme(nextTheme: Theme) {
    const previous = theme;
    setTheme(nextTheme);
    setError("");
    if (supabase && spaceId) {
      const { error: themeError } = await supabase.from("couple_spaces").update({ theme: nextTheme }).eq("id", spaceId);
      if (themeError) { setTheme(previous); setError(t.themeSaveError); return; }
    } else {
      localStorage.setItem(THEME_KEY, nextTheme);
    }
    setAppearanceOpen(false);
  }

  async function saveWish(event: React.FormEvent) {
    event.preventDefault();
    if (url.trim() && !validUrl(url.trim())) return setError(t.urlError);
    if (!title.trim()) return setError(t.titleError);
    const draft = checklistDraft.map((item) => ({ ...item, label: item.label.trim() })).filter((item) => item.label);
    let newWish: Wish;
    if (supabase && spaceId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setError(t.wishSaveError);
      if (editingId) {
        const { error: updateError } = await supabase.from("wishes").update({
          title: title.trim(), note: note.trim(), url: url.trim() || null,
          address: address.trim(), category: category.trim(), status, planned_date: status === "planned" ? plannedDate || null : null,
          completed_at: status === "done" ? new Date().toISOString() : null, completed_note: status === "done" ? completionNote.trim() : "",
        }).eq("id", editingId);
        if (updateError) return setError(t.wishSaveError);
        const { error: removeError } = await supabase.from("wish_checklist_items").delete().eq("wish_id", editingId);
        if (removeError) return setError(t.wishSaveError);
        const items = draft.map((item, position) => ({ id: item.id, wish_id: editingId, space_id: spaceId, label: item.label, completed: item.completed, position }));
        if (items.length && (await supabase.from("wish_checklist_items").insert(items)).error) return setError(t.wishSaveError);
        setWishes((current) => current.map((wish) => wish.id === editingId ? {
          ...wish, title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status,
          plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "",
          checklist: draft.map((item, position) => ({ ...item, position })),
        } : wish));
        resetEditor();
        return;
      }
      const { data, error: insertError } = await supabase.from("wishes").insert({
        space_id: spaceId, created_by: user.id, title: title.trim(), note: note.trim(),
        url: url.trim() || null, address: address.trim(), category: category.trim(), status,
        planned_date: status === "planned" ? plannedDate || null : null, completed_at: status === "done" ? new Date().toISOString() : null,
        completed_note: status === "done" ? completionNote.trim() : "",
      }).select("id").single();
      if (insertError || !data) return setError(t.wishSaveError);
      const items = draft.map((item, position) => ({ id: item.id, wish_id: data.id, space_id: spaceId, label: item.label, completed: item.completed, position }));
      if (items.length) {
        const { error: itemError } = await supabase.from("wish_checklist_items").insert(items);
        if (itemError) { await supabase.from("wishes").delete().eq("id", data.id); return setError(t.wishSaveError); }
      }
      newWish = { id: data.id, title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status, createdAt: new Date().toISOString(),
        plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "",
        checklist: draft.map((item, position) => ({ ...item, position })) };
    } else {
      if (editingId) {
        setWishes((current) => current.map((wish) => wish.id === editingId ? { ...wish, title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status, plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "", checklist: draft } : wish));
        resetEditor();
        return;
      }
      newWish = { id: crypto.randomUUID(), title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status, plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "", createdAt: new Date().toISOString(), checklist: draft };
    }
    setWishes((current) => [newWish, ...current]);
    resetEditor();
    setView("wishes");
  }

  async function toggleWish(wish: Wish) {
    const nextStatus: WishStatus = wish.status === "done" ? "wanted" : "done";
    if (supabase) await supabase.from("wishes").update({ status: nextStatus, planned_date: null, completed_at: nextStatus === "done" ? new Date().toISOString() : null }).eq("id", wish.id);
    setWishes((all) => all.map((item) => item.id === wish.id ? { ...item, status: nextStatus, plannedDate: "" } : item));
  }

  async function toggleChecklist(wishId: string, item: ChecklistItem) {
    if (supabase) await supabase.from("wish_checklist_items").update({ completed: !item.completed }).eq("id", item.id);
    setWishes((all) => all.map((wish) => wish.id === wishId ? { ...wish, checklist: wish.checklist.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry) } : wish));
  }

  async function deleteWish(id: string) {
    if (supabase) await supabase.from("wishes").delete().eq("id", id);
    setWishes((all) => all.filter((item) => item.id !== id));
  }

  return (
    <SpaceGate locale={locale} onLocaleChange={changeLocale} onSpaceChange={changeSpace}>
    <main className="app-shell" data-theme={theme} style={themeStyle}>
      <header className="topbar">
        <div className="brand"><Heart size={21} fill="currentColor" strokeWidth={1.5} /><span>{t.brand}</span></div>
        <div className="topbar-actions">
          <button type="button" className="icon-button appearance-button" title={t.appearance} aria-label={t.appearance} onClick={() => setAppearanceOpen(true)}><Palette size={18} /></button>
          <div className="locale-control" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => changeLocale("zh-CN")}>中</button>
            <button type="button" aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
          </div>
        </div>
      </header>

      <section className="workspace">
        <div className="section-head">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={view === "wishes"} onClick={() => setView("wishes")}>{t.wishes}<span>{wishes.filter((w) => w.status !== "done").length}</span></button>
            <button role="tab" aria-selected={view === "done"} onClick={() => setView("done")}>{t.done}<span>{wishes.filter((w) => w.status === "done").length}</span></button>
            <button role="tab" aria-selected={view === "dashboard"} onClick={() => setView("dashboard")}><LayoutDashboard size={15} />{t.dashboard}</button>
          </div>
          <button className="primary" type="button" onClick={openNewWish}><Plus size={18} />{t.add}</button>
        </div>

        {view === "dashboard" ? <div className="dashboard-view">
          <div className="metric-grid">
            <div><strong>{wishes.length}</strong><span>{t.totalWishes}</span></div>
            <div><strong>{wishes.filter((wish) => wish.status === "wanted").length}</strong><span>{t.wantedStatus}</span></div>
            <div><strong>{wishes.filter((wish) => wish.status === "planned").length}</strong><span>{t.plannedCount}</span></div>
            <div><strong>{wishes.filter((wish) => wish.status === "done").length}</strong><span>{t.completedCount}</span></div>
          </div>
          <div className="dashboard-sections">
            <section><h2>{t.checklistProgress}</h2><div className="progress-row"><strong>{checklistDone}/{checklistTotal}</strong><div><span style={{ width: `${checklistTotal ? checklistDone / checklistTotal * 100 : 0}%` }} /></div></div></section>
            <section><h2>{t.categoryBreakdown}</h2>{categories.length ? <div className="category-summary">{categories.map(([name, count]) => <div key={name}><span>{name}</span><strong>{count}</strong></div>)}</div> : <p>{t.noCategories}</p>}</section>
            <section className="recent-summary"><h2>{t.recentWishes}</h2>{wishes.length ? wishes.slice(0, 5).map((wish) => <div key={wish.id}><Heart size={14} /><span>{wish.title}</span><small>{wish.status === "wanted" ? t.wantedStatus : wish.status === "planned" ? t.plannedStatus : t.doneStatus}</small></div>) : <p>{t.noRecentWishes}</p>}</section>
          </div>
        </div> : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Heart size={25} /></div>
            <h1>{view === "done" ? t.completedEmpty : t.emptyTitle}</h1>
            {view === "wishes" && <p>{t.emptyBody}</p>}
            {view === "wishes" && <button type="button" className="text-action" onClick={openNewWish}><Plus size={16} />{t.add}</button>}
          </div>
        ) : (
          <div className="wish-list">
            {visible.map((wish) => (
              <article className="wish-row" key={wish.id}>
                <div className="wish-mark"><Heart size={17} /></div>
                <div className="wish-content">
                  <h2>{wish.title}</h2>
                  {wish.category && <span className="wish-category">{wish.category}</span>}
                  {wish.status === "planned" && <span className="wish-status">{t.plannedStatus}{wish.plannedDate ? ` · ${wish.plannedDate}` : ""}</span>}
                  {wish.note && <p>{wish.note}</p>}
                  {wish.status === "done" && wish.completionNote && <p className="completion-note">{wish.completionNote}</p>}
                  {wish.address && <p className="wish-meta"><MapPin size={14} />{wish.address}</p>}
                  {wish.url && <a href={wish.url} target="_blank" rel="noopener noreferrer"><Link2 size={14} />{new URL(wish.url).hostname}<ArrowUpRight size={14} /></a>}
                  {wish.checklist.length > 0 && <div className="wish-checklist">
                    {wish.checklist.map((item) => <label key={item.id}>
                      <input type="checkbox" checked={item.completed} onChange={() => void toggleChecklist(wish.id, item)} />
                      <span>{item.label}</span>
                    </label>)}
                  </div>}
                </div>
                <div className="row-actions">
                  <button type="button" className="icon-button" title={t.edit} aria-label={t.edit} onClick={() => openEditWish(wish)}><Pencil size={17} /></button>
                  <button type="button" className="icon-button" title={wish.status === "done" ? t.undo : t.markDone} aria-label={wish.status === "done" ? t.undo : t.markDone} onClick={() => void toggleWish(wish)}><Check size={18} /></button>
                  <button type="button" className="icon-button danger" title={t.delete} aria-label={t.delete} onClick={() => void deleteWish(wish.id)}><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="storage-note">{supabase ? t.sharedStorage : t.localOnly}</p>
      </section>

      {adding && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) resetEditor(); }}>
        <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="dialog-head"><h2 id="dialog-title">{editingId ? t.edit : t.add}</h2><button type="button" className="icon-button" aria-label={t.cancel} onClick={resetEditor}><X size={20} /></button></div>
          <form onSubmit={saveWish}>
            <label>{t.title}<input autoFocus required value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} /></label>
            <label>{t.pasteLink} <span className="optional-label">{t.optional}</span><input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://" /></label>
            <label>{t.address} <span className="optional-label">{t.optional}</span><input value={address} onChange={(e) => setAddress(e.target.value)} /></label>
            <label>{t.category} <span className="optional-label">{t.optional}</span><input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
            <label>{t.note}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></label>
            <fieldset className="status-editor"><legend>{t.status}</legend><div className="segmented-control">
              {(["wanted", "planned", "done"] as WishStatus[]).map((option) => <button type="button" key={option} aria-pressed={status === option} onClick={() => setStatus(option)}>{option === "wanted" ? t.wantedStatus : option === "planned" ? t.plannedStatus : t.doneStatus}</button>)}
            </div></fieldset>
            {status === "planned" && <label>{t.plannedDate} <span className="optional-label">{t.optional}</span><input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} /></label>}
            {status === "done" && <label>{t.completionNote} <span className="optional-label">{t.optional}</span><textarea value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} rows={2} /></label>}
            <fieldset className="checklist-editor"><legend>{t.checklist} <span className="optional-label">{t.optional}</span></legend>
              {checklistDraft.map((item, index) => <div key={item.id}>
                <input value={item.label} onChange={(event) => setChecklistDraft((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, label: event.target.value } : entry))} />
                <button type="button" className="icon-button" aria-label={t.removeChecklistItem} onClick={() => setChecklistDraft((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
              </div>)}
              <button type="button" className="text-action" onClick={() => setChecklistDraft((items) => [...items, { id: crypto.randomUUID(), label: "", completed: false, position: items.length }])}><ListPlus size={16} />{t.checklistItem}</button>
            </fieldset>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="dialog-actions"><button type="button" className="secondary" onClick={resetEditor}>{t.cancel}</button><button type="submit" className="primary">{editingId ? t.saveChanges : t.save}</button></div>
          </form>
        </div>
      </div>}
      {appearanceOpen && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAppearanceOpen(false); }}>
        <div className="dialog appearance-dialog" role="dialog" aria-modal="true" aria-labelledby="appearance-title">
          <div className="dialog-head"><div><h2 id="appearance-title">{t.appearanceTitle}</h2><p>{t.appearanceBody}</p></div><button type="button" className="icon-button" aria-label={t.cancel} onClick={() => setAppearanceOpen(false)}><X size={20} /></button></div>
          <div className="theme-grid">
            {THEMES.map((option) => <button type="button" key={option} className="theme-option" data-theme-option={option} aria-pressed={theme === option} onClick={() => void chooseTheme(option)}>
              <span className="theme-preview" style={{ backgroundImage: themeImage(option) }} />
              <span>{option === "clean" ? t.themeClean : option === "coast" ? t.themeCoast : option === "city" ? t.themeCity : t.themeGarden}</span>
              {theme === option && <Check size={16} />}
            </button>)}
          </div>
        </div>
      </div>}
    </main>
    </SpaceGate>
  );
}
