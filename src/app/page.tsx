"use client";
import { PlaceSearch } from "@/components/place-search";
import "./wish-editor.css";
import "./mobile.css";
import { InstallApp } from "@/components/install-app";
import { coordinates, readDrafts, writeDraft, type Coordinates, type WishDraft } from "@/lib/wish-drafts";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Compass, Camera, Check, Filter, Heart, LayoutDashboard, Link2, ListPlus, Map, MapPin, PawPrint, MessageCircle, Palette, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { prepareBackgroundPhoto } from "@/lib/photo";
import { SharedPet } from "@/components/shared-pet";
import { LifeDashboard, DateAndRandom } from "@/components/life-dashboard";
import { WishExperience } from "@/components/wish-experience";
import { SpaceGate } from "@/components/space-gate";
import { RoamingPet } from "@/components/roaming-pet";
import { TaskMap } from "@/components/task-map";
import { Locale, messages } from "@/lib/messages";
import { supabase } from "@/lib/supabase";

import { THEMES, themeNames, themeBackground, type Theme } from "@/lib/themes";

const SoloAdventure = dynamic(() => import("@/components/adventure/solo-adventure").then(module => module.SoloAdventure), { loading: () => <div className="life-empty" role="status">🐾 …</div> });

type ChecklistItem = { id: string; label: string; completed: boolean; position: number };
type WishStatus = "wanted" | "planned" | "done";
type Wish = { location?: Coordinates | null; deletedAt?: string | null; id: string; title: string; note: string; url: string; address: string; category: string; status: WishStatus; plannedDate: string; completionNote: string; createdAt: string; checklist: ChecklistItem[] };
type View = "wishes" | "done" | "dashboard" | "map" | "life" | "pet" | "adventure";

const WISHES_KEY = "wish-together:wishes";
const LOCALE_KEY = "wish-together:locale";
const THEME_KEY = "wish-together:theme";


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
      location: coordinates(wish.location),
      deletedAt: typeof wish.deletedAt === "string" ? wish.deletedAt : null,
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
  const [allWishes, setWishes] = useState<Wish[]>([]);
  const wishes = allWishes.filter(wish => !wish.deletedAt);
  const removedWishes = allWishes.filter(wish => wish.deletedAt);
  const [trashOpen, setTrashOpen] = useState(false);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState<string | null>(null);
  const removeLock = useRef(false);
  const wishMutation = useRef(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [experienceId, setExperienceId] = useState<string | null>(null);
  const [view, setView] = useState<View>("wishes");
  const [statusFilter, setStatusFilter] = useState<"all" | WishStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [backgroundPhoto, setBackgroundPhoto] = useState<string | null>(null);
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const appearanceSaving = useRef(false);
  const activeSpace = useRef(spaceId);
  activeSpace.current = spaceId;
  const [theme, setTheme] = useState<Theme>("clean");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [draftUser, setDraftUser] = useState<string | null>(supabase ? null : "local");
  const draftKey = draftUser && (!supabase || spaceId) ? `wish-together:drafts:v1:${draftUser}:${spaceId || "local"}` : null;
  const [editorScope, setEditorScope] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, WishDraft>>({});
  const [draftError, setDraftError] = useState(false);
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
      setBackgroundPhoto(localStorage.getItem("wish-together:photo"));
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (THEMES.includes(savedTheme as Theme)) setTheme(savedTheme as Theme);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !supabase) localStorage.setItem(WISHES_KEY, JSON.stringify(allWishes));
  }, [ready, allWishes]);

  useEffect(() => {
    if (!supabase || !spaceId) return;
    const client = supabase;
    let active = true;
    async function loadWishes() {
      if (removeLock.current || wishSaveLock.current) return;
      const revision = wishMutation.current;
      const { data: rows, error: wishError } = await client.from("wishes")
        .select("id, title, note, url, address, category, status, planned_date, completed_note, created_at, latitude, longitude, deleted_at").eq("space_id", spaceId).order("created_at", { ascending: false });
      if (!active) return;
      if (wishError || !rows) return setError(messages[locale].wishLoadError);
      const ids = rows.map((row) => row.id);
      const { data: items, error: itemError } = ids.length
        ? await client.from("wish_checklist_items").select("id, wish_id, label, completed, position").in("wish_id", ids).order("position")
        : { data: [], error: null };
      if (!active) return;
      if (itemError) return setError(messages[locale].wishLoadError);
      if (revision !== wishMutation.current || removeLock.current || wishSaveLock.current) return;
      setWishes(rows.map((row) => ({
        id: row.id, location: coordinates(row), deletedAt: row.deleted_at, title: row.title, note: row.note, url: row.url ?? "", address: row.address ?? "", category: row.category ?? "",
        status: row.status as WishStatus, plannedDate: row.planned_date ?? "", completionNote: row.completed_note ?? "", createdAt: row.created_at,
        checklist: (items ?? []).filter((item) => item.wish_id === row.id),
      })));
    }
    void loadWishes();
    const timer = window.setInterval(loadWishes, 15000);
    window.addEventListener("life-changed", loadWishes);
    return ()=>{active=false;window.clearInterval(timer);window.removeEventListener("life-changed",loadWishes);};
  }, [spaceId, locale]);

  useEffect(() => {
    if (!supabase || !spaceId) return;
    const client = supabase;
    let active = true;
    let lastAppearance: string | null = null;
    setBackgroundPhoto(null);
    setPhotoDraft(null);
    async function loadTheme() {
      if (appearanceSaving.current) return;
      const { data } = await client.from("couple_spaces").select("theme, appearance_updated_at").eq("id", spaceId).single();
      if (!active || appearanceSaving.current || !data) return;
      if (THEMES.includes(data.theme as Theme)) setTheme(data.theme as Theme);
      if (lastAppearance !== data.appearance_updated_at) {
        const { data: photo, error } = await client.from("couple_spaces").select("background_photo").eq("id", spaceId).single();
        if (!active || appearanceSaving.current || error || !photo) return;
        setBackgroundPhoto(photo.background_photo ?? null);
        lastAppearance = data.appearance_updated_at;
      }
    }
    void loadTheme();
    const timer = window.setInterval(loadTheme, 15000);
    window.addEventListener("focus", loadTheme);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", loadTheme); };
  }, [spaceId]);

  const changeSpace = useCallback((nextSpaceId: string | null) => {
    setAdding(false); setUndoId(null); setTrashOpen(false);
    setSpaceId(nextSpaceId);
    setExperienceId(null);
    setPhotoDraft(null);
    setBackgroundPhoto(null);
    setAppearanceOpen(false);
    if (!supabase) setWishes(readWishes(WISHES_KEY));
    else setWishes([]);
  }, []);

  function changeLocale(next: Locale) {
    setLocale(next);
    localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next;
  }

  const t = messages[locale];
  const visible = wishes.filter((wish) => {
    if (view === "dashboard" || view === "map" || view === "life" || view === "pet" || view === "adventure") return false;
    if ((wish.status === "done") !== (view === "done")) return false;
    if (statusFilter !== "all" && wish.status !== statusFilter) return false;
    return categoryFilter === "all" || wish.category === categoryFilter;
  });
  const checklistTotal = wishes.reduce((total, wish) => total + wish.checklist.length, 0);
  const checklistDone = wishes.reduce((total, wish) => total + wish.checklist.filter((item) => item.completed).length, 0);
  const categories = Object.entries(wishes.reduce<Record<string, number>>((all, wish) => {
    if (wish.category) all[wish.category] = (all[wish.category] ?? 0) + 1;
    return all;
  }, {})).sort((a, b) => b[1] - a[1]);
  const categoryNames = categories.map(([name]) => name);
  const hasFilters = categoryFilter !== "all" || statusFilter !== "all";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const themeImage = (selected: Theme) => themeBackground(selected, basePath);
  const themeStyle = { "--theme-image": themeImage(theme) } as CSSProperties;

  const [wishSaving, setWishSaving] = useState(false);
  const wishSaveLock = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setDraftUser(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!adding) setDrafts(draftKey ? readDrafts(localStorage, draftKey) : {});
  }, [draftKey, adding]);
  useEffect(() => {
    if (!adding || !draftKey || editorScope !== draftKey) return;
    try {
      const content = editingId || title || note || url || address || category || plannedDate || completionNote || checklistDraft.length || status !== "wanted";
      writeDraft(localStorage, draftKey, editingId || "new", content ? { editingId, title, note, url, address, category, status, plannedDate, completionNote, location, checklist: checklistDraft } : null);
      setDraftError(false);
    } catch { setDraftError(true); }
  }, [adding, draftKey, editorScope, editingId, title, note, url, address, category, status, plannedDate, completionNote, location, checklistDraft]);
  useEffect(() => {
    if (adding && editorScope !== draftKey) setAdding(false);
  }, [draftKey, editorScope, adding]);
  useEffect(() => {
    if (!undoId) return;
    const timer = setTimeout(() => setUndoId(null), 12000);
    return () => clearTimeout(timer);
  }, [undoId]);
  function applyDraft(draft: WishDraft) {
    setEditingId(draft.editingId); setTitle(draft.title); setNote(draft.note); setUrl(draft.url);
    setAddress(draft.address); setLocation(draft.location); setCategory(draft.category); setStatus(draft.status);
    setPlannedDate(draft.plannedDate); setCompletionNote(draft.completionNote); setChecklistDraft(draft.checklist);
    setEditorScope(draftKey); setError(""); setAdding(true);
  }
  function finishEditor() {
    if (draftKey) { try { writeDraft(localStorage, draftKey, editingId || "new", null); } catch { /* Keep the recoverable draft if storage is unavailable. */ } }
    resetEditor();
  }
  function resetEditor() {
    setLocation(null); setTitle(""); setUrl(""); setAddress(""); setCategory(""); setNote(""); setStatus("wanted"); setPlannedDate(""); setCompletionNote("");
    setChecklistDraft([]); setEditingId(null); setError(""); setAdding(false);
  }

  function openNewWish() {
    const saved = draftKey ? readDrafts(localStorage, draftKey).new : null;
    if (saved) { applyDraft(saved); return; }
    resetEditor();
    setEditorScope(draftKey);
    setAdding(true);
  }

  function openEditWish(wish: Wish) {
    const saved = draftKey ? readDrafts(localStorage, draftKey)[wish.id] : null;
    if (saved) { applyDraft(saved); return; }
    setEditorScope(draftKey); setLocation(wish.location ?? null);
    setTitle(wish.title); setUrl(wish.url); setAddress(wish.address); setCategory(wish.category); setNote(wish.note);
    setStatus(wish.status); setPlannedDate(wish.plannedDate); setCompletionNote(wish.completionNote);
    setChecklistDraft(wish.checklist.map((item) => ({ ...item })));
    setEditingId(wish.id); setError(""); setAdding(true);
  }

  async function chooseTheme(nextTheme: Theme) {
    if (appearanceSaving.current) return;
    appearanceSaving.current = true;
    setPhotoBusy(true);
    setPhotoError("");
    const previous = theme;
    try {
    setTheme(nextTheme);
    setError("");
    if (supabase && spaceId) {
      const { error: themeError } = await supabase.from("couple_spaces").update({ theme: nextTheme }).eq("id", spaceId);
      if (themeError) { setTheme(previous); setPhotoError(t.themeSaveError); return; }
    } else {
      localStorage.setItem(THEME_KEY, nextTheme);
    }
    if (!photoDraft) setAppearanceOpen(false);
    } catch { setTheme(previous); setPhotoError(t.themeSaveError); }
    finally { appearanceSaving.current = false; setPhotoBusy(false); }
  }

  async function selectPhoto(file: File) {
    const currentSpace = spaceId;
    setPhotoBusy(true); setPhotoError("");
    try {
      const photo = await prepareBackgroundPhoto(file);
      if (activeSpace.current === currentSpace) setPhotoDraft(photo);
    } catch { setPhotoError(locale === "zh-CN" ? "请选择 15 MB 以内的 JPG、PNG 或 WebP 照片。" : "Choose a JPG, PNG or WebP photo under 15 MB."); }
    finally { setPhotoBusy(false); }
  }

  async function savePhoto(photo: string | null) {
    if (appearanceSaving.current) return;
    const currentSpace = spaceId;
    appearanceSaving.current = true;
    setPhotoBusy(true); setPhotoError("");
    try {
      if (supabase) {
        if (!currentSpace) throw new Error("space");
        const { error } = await supabase.from("couple_spaces").update({ background_photo: photo }).eq("id", currentSpace);
        if (error) throw error;
      } else if (photo) localStorage.setItem("wish-together:photo", photo);
      else localStorage.removeItem("wish-together:photo");
      if (activeSpace.current !== currentSpace) return;
      setBackgroundPhoto(photo); setPhotoDraft(null);
    } catch { setPhotoError(t.themeSaveError); }
    finally { appearanceSaving.current = false; setPhotoBusy(false); }
  }

  async function memoryBackground(photo: string) {
    if (!supabase || !spaceId) throw new Error("No shared space");
    const {error} = await supabase.from("couple_spaces").update({background_photo:photo}).eq("id",spaceId);
    if(error) throw error;
    setBackgroundPhoto(photo);
  }

  async function saveWish(event: React.FormEvent) {
    event.preventDefault();
    if (wishSaveLock.current) return;
    if (url.trim() && !validUrl(url.trim())) return setError(t.urlError);
    if (!title.trim()) return setError(t.titleError);
    wishMutation.current++;
    wishSaveLock.current = true; setWishSaving(true); setError("");
    try {
    const saveScope = spaceId;
    const draft = checklistDraft.map((item) => ({ ...item, label: item.label.trim() })).filter((item) => item.label);
    let newWish: Wish;
    if (supabase && spaceId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setError(t.wishSaveError);
      if (editingId) {
        const { error: updateError } = await supabase.from("wishes").update({
          title: title.trim(), note: note.trim(), url: url.trim() || null,
          address: address.trim(), latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, category: category.trim(), status, planned_date: status === "planned" ? plannedDate || null : null,
          completed_at: status === "done" ? new Date().toISOString() : null, completed_note: status === "done" ? completionNote.trim() : "",
        }).eq("id", editingId);
        if (updateError) return setError(t.wishSaveError);
        const { error: removeError } = await supabase.from("wish_checklist_items").delete().eq("wish_id", editingId);
        if (removeError) return setError(t.wishSaveError);
        const items = draft.map((item, position) => ({ id: item.id, wish_id: editingId, space_id: spaceId, label: item.label, completed: item.completed, position }));
        if (items.length && (await supabase.from("wish_checklist_items").insert(items)).error) return setError(t.wishSaveError);
        if (activeSpace.current !== saveScope) return;
        setWishes((current) => current.map((wish) => wish.id === editingId ? {
          ...wish, location, title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status,
          plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "",
          checklist: draft.map((item, position) => ({ ...item, position })),
        } : wish));
        finishEditor();
        return;
      }
      const { data, error: insertError } = await supabase.from("wishes").insert({
        space_id: spaceId, created_by: user.id, title: title.trim(), note: note.trim(),
        url: url.trim() || null, latitude: location?.latitude ?? null, longitude: location?.longitude ?? null, address: address.trim(), category: category.trim(), status,
        planned_date: status === "planned" ? plannedDate || null : null, completed_at: status === "done" ? new Date().toISOString() : null,
        completed_note: status === "done" ? completionNote.trim() : "",
      }).select("id").single();
      if (insertError || !data) return setError(t.wishSaveError);
      const items = draft.map((item, position) => ({ id: item.id, wish_id: data.id, space_id: spaceId, label: item.label, completed: item.completed, position }));
      if (items.length) {
        const { error: itemError } = await supabase.from("wish_checklist_items").insert(items);
        if (itemError) { await supabase.from("wishes").delete().eq("id", data.id); return setError(t.wishSaveError); }
      }
      newWish = { location, id: data.id, title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status, createdAt: new Date().toISOString(),
        plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "",
        checklist: draft.map((item, position) => ({ ...item, position })) };
    } else {
      if (editingId) {
        if (activeSpace.current !== saveScope) return;
        setWishes((current) => current.map((wish) => wish.id === editingId ? { ...wish, location, title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status, plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "", checklist: draft } : wish));
        finishEditor();
        return;
      }
      newWish = { location, id: crypto.randomUUID(), title: title.trim(), note: note.trim(), url: url.trim(), address: address.trim(), category: category.trim(), status, plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "", createdAt: new Date().toISOString(), checklist: draft };
    }
    if (activeSpace.current !== saveScope) return;
    setWishes((current) => [newWish, ...current]);
    finishEditor();
    setView("wishes");
    } catch { setError(t.wishSaveError); }
    finally { wishMutation.current++; wishSaveLock.current = false; setWishSaving(false); }
  }

  async function toggleWish(wish: Wish) {
    const nextStatus: WishStatus = wish.status === "done" ? "wanted" : "done";
    if (supabase) {
      const {error} = await supabase.from("wishes").update({ status: nextStatus, planned_date: null, completed_at: nextStatus === "done" ? new Date().toISOString() : null }).eq("id", wish.id);
      if(error) {setError(t.wishSaveError); return;}
    }
    setWishes((all) => all.map((item) => item.id === wish.id ? { ...item, status: nextStatus, plannedDate: "" } : item));
    if(nextStatus === "done" && spaceId) setExperienceId(wish.id);
  }

  async function toggleChecklist(wishId: string, item: ChecklistItem) {
    if (supabase) await supabase.from("wish_checklist_items").update({ completed: !item.completed }).eq("id", item.id);
    setWishes((all) => all.map((wish) => wish.id === wishId ? { ...wish, checklist: wish.checklist.map((entry) => entry.id === item.id ? { ...entry, completed: !entry.completed } : entry) } : wish));
  }

  async function setRemoved(id: string, removed: boolean) {
    if (removeLock.current) return;
    wishMutation.current++;
    removeLock.current = true; setRemoveBusy(id); setError("");
    const scope = spaceId, deletedAt = removed ? new Date().toISOString() : null;
    try {
      if (supabase) {
        const { data, error } = await supabase.from("wishes").update({ deleted_at: deletedAt }).eq("id", id).eq("space_id", scope).select("id").single();
        if (error || !data) throw error || new Error("Wish unavailable");
      }
      if (activeSpace.current !== scope) return;
      setWishes(all => all.map(w => w.id === id ? { ...w, deletedAt } : w));
      setUndoId(removed ? id : null);
    } catch { if (activeSpace.current === scope) setError(t.wishSaveError); }
    finally { wishMutation.current++; removeLock.current = false; setRemoveBusy(null); }
  }
  async function deleteWish(id: string) { await setRemoved(id, true); }

  return (
    <SpaceGate theme={theme} backgroundPhoto={backgroundPhoto} locale={locale} onLocaleChange={changeLocale} onSpaceChange={changeSpace} wishes={wishes} onWish={wish => setExperienceId(wish.id)}>
    <main className="app-shell" data-theme={theme} style={themeStyle}>
      <header className="topbar">
        <div className="brand"><Heart size={21} fill="currentColor" strokeWidth={1.5} /><span>{t.brand}</span></div>
        <div className="topbar-actions">
          <button type="button" className="icon-button appearance-button" title={t.appearance} aria-label={t.appearance} onClick={() => { setPhotoError(""); setPhotoDraft(null); setAppearanceOpen(true); }}><Palette size={18} /></button>
          <div className="locale-control" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => changeLocale("zh-CN")}>中</button>
            <button type="button" aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
          </div>
        </div>
      </header>

      <section className="workspace">
        {spaceId && view !== "life" && view !== "adventure" && <DateAndRandom spaceId={spaceId} zh={locale==="zh-CN"} wishes={wishes} onWish={wish=>setExperienceId(wish.id)}/>}
        <div className="section-head">
          <button type="button" className="mobile-menu secondary" aria-expanded={moreOpen} onClick={() => setMoreOpen(v => !v)}>{locale === "zh-CN" ? "全部栏目" : "All sections"}</button>
          <div className={`tabs ${moreOpen ? "mobile-expanded" : ""}`} role="tablist">
            <button role="tab" aria-selected={view === "wishes"} onClick={() => { setView("wishes"); setStatusFilter("all"); }}>{t.wishes}<span>{wishes.filter((w) => w.status !== "done").length}</span></button>
            <button role="tab" aria-selected={view === "done"} onClick={() => { setView("done"); setStatusFilter("all"); }}>{t.done}<span>{wishes.filter((w) => w.status === "done").length}</span></button>
            <button role="tab" aria-selected={view === "dashboard"} onClick={() => setView("dashboard")}><LayoutDashboard size={15} />{t.dashboard}</button>
            <button role="tab" aria-selected={view === "map"} onClick={() => setView("map")}><Map size={15} />{t.map}</button>
            <button role="tab" aria-selected={view === "life"} onClick={()=>setView("life")}><Heart size={15}/>{locale==="zh-CN"?"我们的日常":"Our life"}</button>
            <button role="tab" aria-selected={view === "pet"} onClick={()=>setView("pet")}><PawPrint size={15}/>{locale==="zh-CN"?"我们的小窝":"Our pet"}</button>
            <button role="tab" aria-selected={view === "adventure"} onClick={()=>setView("adventure")}><Compass size={15}/>{locale==="zh-CN"?"一起冒险":"Adventures"}</button>
          </div>
          <button className="primary" type="button" onClick={openNewWish}><Plus size={18} />{t.add}</button>
        </div>

        {!adding && Object.entries(drafts).some(([id]) => id === "new" || wishes.some(w => w.id === id)) && <div className="draft-banner"><span>{locale === "zh-CN" ? "有未完成的草稿 · 仅此设备" : "Unfinished drafts · this device"}</span>{Object.entries(drafts).filter(([id]) => id === "new" || wishes.some(w => w.id === id)).map(([id, draft]) => <button type="button" key={id} onClick={() => applyDraft(draft)}>{locale === "zh-CN" ? "继续：" : "Continue: "}{draft.title || (locale === "zh-CN" ? "新心愿" : "New wish")}</button>)}</div>}
        {(view === "wishes" || view === "done") && wishes.length > 0 && <div className="filter-bar" aria-label={t.filters}>
          <Filter size={16} aria-hidden="true" />
          {view === "wishes" && <label><span>{t.status}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | WishStatus)}>
            <option value="all">{t.allStatuses}</option>
            <option value="wanted">{t.wantedStatus}</option>
            <option value="planned">{t.plannedStatus}</option>
          </select></label>}
          {categoryNames.length > 0 && <label><span>{t.category}</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">{t.allCategories}</option>
            {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select></label>}
          {hasFilters && <button type="button" className="clear-filters" onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); }}><X size={14} />{t.clearFilters}</button>}
        </div>}

        {view === "adventure" ? <SoloAdventure spaceId={spaceId} zh={locale==="zh-CN"} onPets={()=>setView("pet")}/> : view === "pet" ? (spaceId ? <SharedPet key={spaceId} spaceId={spaceId} zh={locale==="zh-CN"}/> : <p>{locale==="zh-CN"?"登录情侣空间后，就能一起养宠物。":"Sign in to raise your pet together."}</p>) : view === "life" ? (spaceId ? <LifeDashboard spaceId={spaceId} zh={locale==="zh-CN"} wishes={wishes} onWish={wish=>setExperienceId(wish.id)} onBackground={memoryBackground}/> : <p>{locale==="zh-CN"?"登录情侣空间后，就能一起记录纪念日和回忆。":"Sign in to share your dates and memories."}</p>) : view === "map" ? <TaskMap onEdit={id => { const wish = wishes.find(w => w.id === id); if (wish) openEditWish(wish); }} wishes={wishes} zh={locale==="zh-CN"} onDetails={spaceId?setExperienceId:undefined}/> : view === "dashboard" ? <div className="dashboard-view">
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
            <h1>{hasFilters ? t.noFilterResults : view === "done" ? t.completedEmpty : t.emptyTitle}</h1>
            {hasFilters ? <button type="button" className="text-action" onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); }}>{t.clearFilters}</button> : view === "wishes" && <p>{t.emptyBody}</p>}
            {!hasFilters && view === "wishes" && <button type="button" className="text-action" onClick={openNewWish}><Plus size={16} />{t.add}</button>}
          </div>
        ) : (
          <div className="wish-list">
            {visible.map((wish) => (
              <article className="wish-row" key={wish.id}>
                <div className="wish-mark"><Heart size={17} /></div>
                <div className="wish-content">
                  <h2>{wish.title}</h2>
                  {spaceId && <button type="button" className="text-action wish-discuss" onClick={()=>setExperienceId(wish.id)}><MessageCircle size={14}/>{wish.status==="done"?(locale==="zh-CN"?"留言 · 回忆照片":"Comments · Memories"):(locale==="zh-CN"?"留言 · 约会安排":"Comments · Plan a date")}</button>}
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
                  <button type="button" className="icon-button danger" title={t.delete} aria-label={t.delete} disabled={!!removeBusy} onClick={() => void deleteWish(wish.id)}><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
        {error && !adding && <p className="form-error" role="alert">{error}</p>}
        <div className="wish-utilities"><button className="secondary" type="button" aria-expanded={trashOpen} onClick={() => setTrashOpen(v => !v)}><Trash2 size={15}/>{locale === "zh-CN" ? "已删除心愿" : "Removed wishes"} ({removedWishes.length})</button><InstallApp zh={locale === "zh-CN"}/></div>
        {trashOpen && <section className="recovery-panel" aria-label={locale === "zh-CN" ? "恢复心愿" : "Restore wishes"}><p>{locale === "zh-CN" ? "删除的心愿和关联记录会保留，可随时恢复。" : "Removed wishes and their records are kept here for recovery."}</p>{!removedWishes.length && <p>{locale === "zh-CN" ? "没有已删除的心愿" : "No removed wishes"}</p>}{removedWishes.map(w => <div key={w.id}><span>{w.title}</span><button className="secondary" disabled={!!removeBusy} onClick={() => void setRemoved(w.id, false)}>{locale === "zh-CN" ? "恢复" : "Restore"}</button></div>)}</section>}
        <p className="storage-note">{supabase ? t.sharedStorage : t.localOnly}</p>
      </section>

      {spaceId && experienceId && wishes.find(w=>w.id===experienceId) && <WishExperience key={`${spaceId}:${experienceId}`} spaceId={spaceId} wish={wishes.find(w=>w.id===experienceId)!} wishes={wishes} zh={locale==="zh-CN"} onClose={()=>setExperienceId(null)} onBackground={memoryBackground}/>}
      {undoId && <div className="undo-toast" role="status"><span>{locale === "zh-CN" ? "心愿已移到已删除列表" : "Wish moved to removed list"}</span><button disabled={!!removeBusy} onClick={() => void setRemoved(undoId, false)}>{locale === "zh-CN" ? "撤销" : "Undo"}</button></div>}
      {adding && <div className="dialog-backdrop">
        <div className="dialog wish-editor-dialog" onKeyDown={event => {
          if (event.key !== "Tab") return;
          const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], summary')).filter(element => element.getClientRects().length > 0);
          const first = elements[0], last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="dialog-head"><h2 id="dialog-title">{editingId ? t.edit : t.add}</h2><button type="button" className="icon-button" aria-label={t.cancel} disabled={wishSaving} onClick={resetEditor}><X size={20} /></button></div>
          <form onSubmit={saveWish} aria-busy={wishSaving}>
            <fieldset className="wish-editor-body" disabled={wishSaving}>
            <p className="draft-state" role="status">{draftError ? (locale === "zh-CN" ? "设备存储不可用，草稿暂未保存" : "Device storage unavailable. Draft not saved.") : draftKey ? (locale === "zh-CN" ? "草稿自动保存在此设备，关闭后可继续编辑" : "Draft saved on this device. Close and continue later.") : (locale === "zh-CN" ? "正在准备草稿保存…" : "Preparing draft storage…")}</p><p className="wish-editor-intro">{locale === "zh-CN" ? "先记下想做的事，地点和计划可以慢慢补充。" : "Start with your wish. Add a place and a plan whenever you’re ready."}</p>
            <label>{t.title}<input autoFocus required value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} /></label>
            <PlaceSearch value={address} onChange={value => { setAddress(value); setLocation(null); }} onSelect={setLocation} zh={locale === "zh-CN"}/>
            <label>{t.category} <span className="optional-label">{t.optional}</span><input list="wish-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={locale === "zh-CN" ? "例如：旅行、美食、约会" : "Travel, food, date night…"}/><datalist id="wish-categories">{categoryNames.map(name => <option key={name} value={name}/>)}</datalist></label>
            <fieldset className="status-editor"><legend>{t.status}</legend><div className="segmented-control">
              {(["wanted", "planned", "done"] as WishStatus[]).map((option) => <button type="button" key={option} aria-pressed={status === option} onClick={() => setStatus(option)}>{option === "wanted" ? t.wantedStatus : option === "planned" ? t.plannedStatus : t.doneStatus}</button>)}
            </div></fieldset>
            {status === "planned" && <label>{t.plannedDate} <span className="optional-label">{t.optional}</span><input type="date" value={plannedDate} onInput={(e) => setPlannedDate(e.currentTarget.value)} onChange={(e) => setPlannedDate(e.target.value)} /></label>}
            {status === "done" && <label>{t.completionNote} <span className="optional-label">{t.optional}</span><textarea value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} rows={2} /></label>}
            <details className="wish-editor-more" open={!!(note || url || checklistDraft.length)}><summary>{locale === "zh-CN" ? "备注、链接与准备清单" : "Notes, link & checklist"}</summary>
            <label>{t.note}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></label>
            <label>{t.pasteLink}<input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://" /></label>
            <fieldset className="checklist-editor"><legend>{t.checklist} <span className="optional-label">{t.optional}</span></legend>
              {checklistDraft.map((item, index) => <div key={item.id}>
                <input aria-label={`${t.checklistItem} ${index + 1}`} value={item.label} onChange={(event) => setChecklistDraft((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, label: event.target.value } : entry))} />
                <button type="button" className="icon-button" aria-label={t.removeChecklistItem} onClick={() => setChecklistDraft((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
              </div>)}
              <button type="button" className="text-action" onClick={() => setChecklistDraft((items) => [...items, { id: crypto.randomUUID(), label: "", completed: false, position: items.length }])}><ListPlus size={16} />{t.checklistItem}</button>
            </fieldset>
            </details>
            {error && <p className="form-error" role="alert">{error}</p>}
            </fieldset>
            <div className="dialog-actions"><button type="button" className="secondary" disabled={wishSaving} onClick={finishEditor}>{locale === "zh-CN" ? "放弃草稿" : "Discard draft"}</button><button type="button" className="secondary" disabled={wishSaving} onClick={resetEditor}>{locale === "zh-CN" ? "稍后继续" : "Keep draft"}</button><button type="submit" className="primary" disabled={wishSaving}>{wishSaving ? (locale === "zh-CN" ? "保存中…" : "Saving…") : editingId ? t.saveChanges : t.save}</button></div>
          </form>
        </div>
      </div>}
      {appearanceOpen && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAppearanceOpen(false); }}>
        <div className="dialog appearance-dialog" role="dialog" aria-modal="true" aria-labelledby="appearance-title">
          <div className="dialog-head"><div><h2 id="appearance-title">{t.appearanceTitle}</h2><p>{t.appearanceBody}</p></div><button type="button" className="icon-button" aria-label={t.cancel} onClick={() => setAppearanceOpen(false)}><X size={20} /></button></div>
          <div className="photo-upload-panel">
            <div><Camera size={22} /><h3>{locale === "zh-CN" ? "把我们的照片，变成背景" : "Your favorite memory, all around you"}</h3><p>{locale === "zh-CN" ? "选一张合照、一次旅行，或你们喜欢的风景。" : "A photo of you two, a trip, or somewhere you love."}</p></div>
            {(photoDraft || backgroundPhoto) && <img className="background-photo-preview" src={photoDraft || backgroundPhoto || ""} alt={locale === "zh-CN" ? "背景照片预览" : "Background photo preview"} />}
            <div className="photo-upload-actions"><label className="secondary photo-upload-label" aria-disabled={photoBusy}><Camera size={15} />{photoBusy ? (locale === "zh-CN" ? "处理中…" : "Working…") : (locale === "zh-CN" ? "选择照片" : "Choose a photo")}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void selectPhoto(file); }} /></label>
              {photoDraft && <button className="primary" type="button" disabled={photoBusy} onClick={() => void savePhoto(photoDraft)}>{locale === "zh-CN" ? "用作我们的背景" : "Use as our background"}</button>}
              {(photoDraft || backgroundPhoto) && <button className="secondary" type="button" disabled={photoBusy} onClick={() => photoDraft ? setPhotoDraft(null) : void savePhoto(null)}>{photoDraft ? t.cancel : (locale === "zh-CN" ? "移除照片" : "Remove photo")}</button>}
            </div><small>{locale === "zh-CN" ? "JPG / PNG / WebP · 最大 15 MB · 自动压缩" : "JPG / PNG / WebP · Up to 15 MB · Automatically compressed"}</small>
            {photoError && <p className="form-error" role="alert">{photoError}</p>}
          </div>
          <p className="life-muted">{locale === "zh-CN" ? "主题只改变配色，已上传的背景照片会保留。移除照片后显示主题背景。" : "Themes change the palette and keep your uploaded photo. Remove the photo to show the theme background."}</p><div className="theme-grid">
            {THEMES.map((option) => <button type="button" key={option} disabled={photoBusy} className="theme-option" data-theme-option={option} aria-pressed={theme === option} onClick={() => void chooseTheme(option)}>
              <span className="theme-preview" style={{ backgroundImage: themeImage(option) }} />
              <span>{themeNames[option][locale === "zh-CN" ? 0 : 1]}</span>
              {theme === option && <Check size={16} />}
            </button>)}
          </div>
        </div>
      </div>}
      {spaceId && view !== "adventure" && <RoamingPet key={spaceId} spaceId={spaceId} zh={locale === "zh-CN"} onOpenHome={() => { setView('pet'); requestAnimationFrame(()=>document.querySelector('.section-head')?.scrollIntoView({block:'start'})); }}/> }
    </main>
    </SpaceGate>
  );
}
