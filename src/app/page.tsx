"use client";
import { PlaceSearch } from "@/components/place-search";
import "./wish-editor.css";
import "./mobile.css";
import "./relaxed.css";
import "./everyday.css";
import "./timeline-batch.css";
import "./companion-calendar.css";
import { useNavigationMemory } from '@/components/navigation-memory';
import { navigationKey } from '@/lib/navigation-memory';
import { BatchToolbar } from '@/components/wish-batch';
import { batchChanges, type BatchAction } from '@/lib/wish-batch';
import { useWishSync, SyncStatus } from '@/components/wish-sync';
import { GlobalSearch } from '@/components/global-search';
import { ShareCard, type ShareContent } from '@/components/share-card';
import { ContentBackup } from '@/components/content-backup';
import { LayoutPreferences, useLayoutPreferences, sectionName, sections } from '@/components/layout-preferences';
import { LifeModal } from '@/components/life-ui';
import { Memories } from '@/components/memories';
import { rowWish, type SyncedWish } from '@/lib/wish-sync';
import { spaceRows } from '@/lib/space-export';
import { PersistentDisclosure, useDisclosurePreference } from "@/components/persistent-disclosure";
import { quickWish } from "@/lib/quick-wish";
import { InstallApp } from "@/components/install-app";
import { coordinates, readDrafts, writeDraft, type Coordinates, type WishDraft } from "@/lib/wish-drafts";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Compass, Camera, Check, Filter, Heart, LayoutDashboard, Link2, ListPlus, MapPin, PawPrint, MessageCircle, Palette, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { prepareBackgroundPhoto } from "@/lib/photo";
import { SharedPet } from "@/components/shared-pet";
import { LifeDashboard } from "@/components/life-dashboard";
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
type Wish = SyncedWish;
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

  const [trashOpen, setTrashOpen] = useState(false);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState<string | null>(null);
  const removeLock = useRef(false);
  const wishMutation = useRef(0);
  const [moreOpen, setMoreOpen] = useDisclosurePreference("navigation", true);
  const [completedName, setCompletedName] = useState("");
  useEffect(() => { if (!completedName) return; const timer = setTimeout(() => setCompletedName(""), 6000); return () => clearTimeout(timer); }, [completedName]);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [experienceId, setExperienceId] = useState<string | null>(null);

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
  const [baseVersion,setBaseVersion]=useState<number|null>(null);
  const navigationScope=draftUser&&(!supabase||spaceId)?navigationKey(draftUser,spaceId||'local'):null;
  const navigation=useNavigationMemory(navigationScope);
  const view=navigation.state.view;
  const filterView=view==='done'?'done':'wishes';
  const statusFilter=navigation.state.filters[filterView].status as 'all'|WishStatus;
  const categoryFilter=navigation.state.filters[filterView].category;
  const setView=(next:View)=>navigation.update({view:next});
  const setStatusFilter=(status:'all'|WishStatus)=>navigation.update({filters:{...navigation.state.filters,[filterView]:{...navigation.state.filters[filterView],status}}});
  const setCategoryFilter=(category:string)=>navigation.update({filters:{...navigation.state.filters,[filterView]:{...navigation.state.filters[filterView],category}}});
  const clearFilters=()=>navigation.update({filters:{...navigation.state.filters,[filterView]:{status:'all',category:'all'}}});
  const searchReturn=useRef(false);
  const editorOrigin=useRef<HTMLElement|null>(null);
  const [batchTarget,setBatchTarget]=useState<'active'|'removed'|null>(null),[selectedIds,setSelectedIds]=useState<string[]>([]),[batchBusy,setBatchBusy]=useState(false),[batchNotice,setBatchNotice]=useState('');
  const batchLock=useRef(false),currentNavigationScope=useRef(navigationScope);currentNavigationScope.current=navigationScope;
  useEffect(()=>{setSelectedIds([]);setBatchNotice('');if(view!=='wishes'&&view!=='done')setBatchTarget(null);},[view,statusFilter,categoryFilter,navigationScope,batchTarget]);
  useEffect(()=>{if(!adding)return;const scroll=window.scrollY,overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;if(editorOrigin.current?.isConnected)editorOrigin.current.focus({preventScroll:true});requestAnimationFrame(()=>window.scrollTo({top:scroll,behavior:'auto'}));};},[adding]);
  const sync=useWishSync(draftUser,spaceId,locale==='zh-CN');
  const displayedWishes=sync.overlay(allWishes), wishes=displayedWishes.filter(w=>!w.deletedAt), removedWishes=displayedWishes.filter(w=>w.deletedAt);
  const prefs=useLayoutPreferences();
  const [moreDialog,setMoreDialog]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false),[settingsOpen,setSettingsOpen]=useState(false),[backupOpen,setBackupOpen]=useState(false);
  const [share,setShare]=useState<ShareContent|null>(null),[memoryId,setMemoryId]=useState<string|null>(null),[inspected,setInspected]=useState<Wish|null>(null);
  const [partnerNotice,setPartnerNotice]=useState('');
  const versions=useRef<Record<string,number>>({});
  const loadedWishes=useRef(false);
  const cacheKey=draftUser&&spaceId?`wish-together:cache:v1:${draftUser}:${spaceId}`:null;
  useEffect(()=>{versions.current={};loadedWishes.current=false;setPartnerNotice('');setSearchOpen(false);setMoreDialog(false);setBackupOpen(false);setMemoryId(null);setShare(null);setInspected(null);searchReturn.current=false;setBatchTarget(null);if(cacheKey)setWishes(readWishes(cacheKey));},[cacheKey]);
  useEffect(()=>{if('serviceWorker' in navigator && process.env.NODE_ENV==='production')void navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH||''}/sw.js`,{scope:`${process.env.NEXT_PUBLIC_BASE_PATH||''}/`}).catch(()=>{});},[]);

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
      try {
      if(!navigator.onLine)return;
      const rows=await spaceRows('wishes',spaceId!);
      const items=await spaceRows('wish_checklist_items',spaceId!);
      if(!active||revision!==wishMutation.current||removeLock.current||wishSaveLock.current)return;
      const next=rows.map(row=>rowWish(row,items.filter(i=>i.wish_id===row.id).sort((a,b)=>Number(a.position)-Number(b.position)) as ChecklistItem[])).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      const changed=next.filter(w=>loadedWishes.current&&versions.current[w.id]!==w.version&&w.updatedBy&&w.updatedBy!==draftUser);
      if(changed.length)setPartnerNotice(locale==='zh-CN'?`对方更新了：${changed.map(w=>w.title).slice(0,3).join('、')}`:`Updated by your partner: ${changed.map(w=>w.title).slice(0,3).join(', ')}`);
      loadedWishes.current=true;
      setError(previous=>previous===messages[locale].wishLoadError?'':previous);
      versions.current=Object.fromEntries(next.map(w=>[w.id,w.version||1]));
      setWishes(next);
      if(cacheKey)try{localStorage.setItem(cacheKey,JSON.stringify(next));}catch{/* Keep loaded content if cache is full. */}
      }catch{if(active)setError(messages[locale].wishLoadError);}
    }
    void loadWishes();
    const timer = window.setInterval(loadWishes, 15000);
    window.addEventListener("life-changed", loadWishes);
    return ()=>{active=false;window.clearInterval(timer);window.removeEventListener("life-changed",loadWishes);};
  }, [spaceId, locale, draftUser, cacheKey]);

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
    if(activeSpace.current===nextSpaceId)return;
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
      writeDraft(localStorage, draftKey, editingId || "new", content ? { baseVersion, editingId, title, note, url, address, category, status, plannedDate, completionNote, location, checklist: checklistDraft } : null);
      setDraftError(false);
    } catch { setDraftError(true); }
  }, [adding, draftKey, editorScope, editingId, title, note, url, address, category, status, plannedDate, completionNote, location, checklistDraft, baseVersion]);
  useEffect(() => {
    if (adding && editorScope !== draftKey) setAdding(false);
  }, [draftKey, editorScope, adding]);
  useEffect(() => {
    if (!undoId) return;
    const timer = setTimeout(() => setUndoId(null), 12000);
    return () => clearTimeout(timer);
  }, [undoId]);
  function applyDraft(draft: WishDraft) {
    editorOrigin.current=document.activeElement as HTMLElement;
    setBaseVersion(draft.baseVersion ?? null); setEditingId(draft.editingId); setTitle(draft.title); setNote(draft.note); setUrl(draft.url);
    setAddress(draft.address); setLocation(draft.location); setCategory(draft.category); setStatus(draft.status);
    setPlannedDate(draft.plannedDate); setCompletionNote(draft.completionNote); setChecklistDraft(draft.checklist);
    setEditorScope(draftKey); setError(""); setAdding(true);
  }
  function finishEditor() {
    if (draftKey) { try { writeDraft(localStorage, draftKey, editingId || "new", null); } catch { /* Keep the recoverable draft if storage is unavailable. */ } }
    resetEditor();
  }
  function resetEditor() {
    setBaseVersion(null); setLocation(null); setTitle(""); setUrl(""); setAddress(""); setCategory(""); setNote(""); setStatus("wanted"); setPlannedDate(""); setCompletionNote("");
    setChecklistDraft([]); setEditingId(null); setError(""); setAdding(false);
    if(searchReturn.current){searchReturn.current=false;setSearchOpen(true);}
  }

  function openNewWishForDay(day?: string) {
    editorOrigin.current=document.activeElement as HTMLElement;
    const saved = draftKey ? readDrafts(localStorage, draftKey).new : null;
    if (saved) { applyDraft(saved); if(day)setError(locale==='zh-CN'?'已恢复之前的草稿；如需安排这天，请在日期栏选择 '+day:'Your previous draft was restored. To plan this day, choose '+day+' in the date field.'); return; }
    resetEditor();
    if(day){setStatus("planned");setPlannedDate(day);}
    setEditorScope(draftKey);
    setAdding(true);
  }

  function openNewWish(){openNewWishForDay();}

  function openEditWish(wish: Wish) {
    editorOrigin.current=document.activeElement as HTMLElement;
    if(sync.pending.some(p=>p.wish.id===wish.id)){setInspected(wish);return;}
    setBaseVersion(wish.version??null);
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
    const input = quickWish(title, url);
    if (input.error === "url") return setError(t.urlError);
    if (input.error) return setError(locale === "zh-CN" ? "写一句想做的事，或贴一个链接就好。" : "Add a wish or paste a link.");
    wishMutation.current++;
    wishSaveLock.current = true; setWishSaving(true); setError("");
    try {
    const saveScope = spaceId;
    const draft = checklistDraft.map((item) => ({ ...item, label: item.label.trim() })).filter((item) => item.label);
    let newWish: Wish;
    if (supabase && spaceId) {
      if(editingId&&baseVersion===null){setError(locale==='zh-CN'?'这个旧草稿没有版本记录。请保留文字后重新打开云端心愿，或另存为新心愿。':'This older draft has no version. Copy it to a new wish or reopen the cloud wish.');return;}
      if(draft.length>100||draft.some(i=>i.label.length>200)){setError(locale==='zh-CN'?'清单最多 100 项，每项最多 200 字。':'Up to 100 checklist items, 200 characters each.');return;}
      newWish={completedAt:status==='done'?(allWishes.find(w=>w.id===editingId)?.completedAt||new Date().toISOString()):null,id:editingId||crypto.randomUUID(),title:input.title,note:note.trim(),url:input.url,address:address.trim(),category:category.trim(),status,plannedDate:status==='planned'?plannedDate:'',completionNote:status==='done'?completionNote.trim():'',location,createdAt:allWishes.find(w=>w.id===editingId)?.createdAt||new Date().toISOString(),checklist:draft,version:baseVersion??undefined};
      await sync.enqueue(newWish,editingId?baseVersion:null);
      if(activeSpace.current!==saveScope)return;
      finishEditor();if(!editingId&&!(view==='life'&&navigation.state.lifeTab==='calendar'))setView(status==='done'?'done':'wishes');return;
    } else {
      if (editingId) {
        if (activeSpace.current !== saveScope) return;
        setWishes((current) => current.map((wish) => wish.id === editingId ? { ...wish, completedAt:status==='done'?(wish.status==='done'?wish.completedAt||null:new Date().toISOString()):null,location, title: input.title, note: note.trim(), url: input.url, address: address.trim(), category: category.trim(), status, plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "", checklist: draft } : wish));
        finishEditor();
        return;
      }
      newWish = { completedAt:status==='done'?new Date().toISOString():null,location, id: crypto.randomUUID(), title: input.title, note: note.trim(), url: input.url, address: address.trim(), category: category.trim(), status, plannedDate: status === "planned" ? plannedDate : "", completionNote: status === "done" ? completionNote.trim() : "", createdAt: new Date().toISOString(), checklist: draft };
    }
    if (activeSpace.current !== saveScope) return;
    setWishes((current) => [newWish, ...current]);
    finishEditor();
    if(!editingId&&!(view==='life'&&navigation.state.lifeTab==='calendar'))setView(status==='done'?'done':'wishes');
    } catch { setError(t.wishSaveError); }
    finally { wishMutation.current++; wishSaveLock.current = false; setWishSaving(false); }
  }

  async function saveAction(wish:Wish) {
    if(supabase){if(wish.version===undefined||sync.pending.some(p=>p.wish.id===wish.id))throw Error('Pending');await sync.enqueue(wish,wish.version);}
    else setWishes(all=>all.map(w=>w.id===wish.id?wish:w));
  }
  async function toggleWish(wish: Wish) {
    const nextStatus: WishStatus=wish.status==='done'?'wanted':'done';
    try{await saveAction({...wish,status:nextStatus,plannedDate:'',completedAt:nextStatus==='done'?new Date().toISOString():null});if(nextStatus==='done')setCompletedName(wish.title);}catch{setError(t.wishSaveError);}
  }
  async function toggleChecklist(wishId:string,item:ChecklistItem){const wish=wishes.find(w=>w.id===wishId);if(!wish)return;try{await saveAction({...wish,checklist:wish.checklist.map(i=>i.id===item.id?{...i,completed:!i.completed}:i)});}catch{setError(t.wishSaveError);}}
  async function setRemoved(id:string,removed:boolean){if(removeLock.current)return;const wish=displayedWishes.find(w=>w.id===id);if(!wish)return;removeLock.current=true;setRemoveBusy(id);try{await saveAction({...wish,deletedAt:removed?new Date().toISOString():null});setUndoId(removed?id:null);}catch{setError(t.wishSaveError);}finally{removeLock.current=false;setRemoveBusy(null);}}
  const batchPool=(batchTarget==='removed'?removedWishes:visible).filter(w=>!sync.pending.some(p=>p.wish.id===w.id)&&(!supabase||Number.isFinite(w.version)));
  const selected=selectedIds.filter(id=>batchPool.some(w=>w.id===id));
  function selectWish(id:string){setSelectedIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);}
  async function applyBatch(action:BatchAction,category:string){if(batchLock.current||!selected.length)return;const scope=currentNavigationScope.current;batchLock.current=true;setBatchBusy(true);setBatchNotice('');try{const changes=batchChanges(batchPool,selected,action,category,new Date().toISOString());if(supabase)await sync.enqueueMany(changes);else{const byId=new Map(changes.map(w=>[w.id,w]));const next=allWishes.map(w=>byId.get(w.id)||w);localStorage.setItem(WISHES_KEY,JSON.stringify(next));setWishes(next);}if(currentNavigationScope.current!==scope)return;setSelectedIds([]);setBatchNotice(locale==='zh-CN'?`${changes.length} 个心愿${supabase?'已保存在此设备，正在逐条同步；冲突会单独保留。':'已更新。'}`:`${changes.length} wishes ${supabase?'saved on this device and queued; conflicts are kept separately.':'updated.'}`);}catch{if(currentNavigationScope.current===scope)setError(locale==='zh-CN'?'批量操作未保存，选择已保留。请检查待同步内容或设备空间后重试。':'Batch changes were not saved. Your selection is kept; check pending changes or storage and retry.');}finally{batchLock.current=false;setBatchBusy(false);}}
  function batchToolbar(removed:boolean){return <BatchToolbar key={removed?'removed':'active'} count={selected.length} available={batchPool.length} removed={removed} busy={batchBusy} zh={locale==='zh-CN'} categories={categoryNames} onSelectAll={()=>setSelectedIds(batchPool.map(w=>w.id))} onClear={()=>setSelectedIds([])} onExit={()=>setBatchTarget(null)} onApply={applyBatch}/>;}
  function moreCommands(){return <>          {sections.filter(s=>!prefs.tabs.includes(s)).map(target=><button data-section-command type="button" key={target} aria-current={view===target?'page':undefined} onClick={()=>{setView(target);}}>{sectionName(target,locale==='zh-CN')}</button>)}
          <button data-section-command onClick={()=>{setBatchTarget('active');setTrashOpen(false);if(view!=='wishes'&&view!=='done')setView('wishes');}}>{locale==='zh-CN'?'批量整理心愿':'Organize wishes'}</button><button data-section-command onClick={()=>setSettingsOpen(true)}>{locale==='zh-CN'?'布局偏好':'Layout preferences'}</button><button data-section-command onClick={()=>setBackupOpen(true)}>{locale==='zh-CN'?'导出与备份':'Export & backup'}</button>
          <button data-section-command type="button" onClick={() => { setTrashOpen(v => !v);  }}>{locale === "zh-CN" ? "已删除心愿" : "Removed wishes"}</button><InstallApp zh={locale === "zh-CN"}/></>;}
  function toggleMore(){const panel=document.getElementById('extra-sections');if(window.scrollY>220&&(!panel||panel.getBoundingClientRect().bottom<180)){setMoreDialog(true);return;}setMoreOpen(!moreOpen);}
  function closeMemory(){setMemoryId(null);if(searchReturn.current){searchReturn.current=false;setSearchOpen(true);}}
  async function deleteWish(id: string) { await setRemoved(id, true); }

  return (
    <SpaceGate theme={theme} backgroundPhoto={backgroundPhoto} locale={locale} onLocaleChange={changeLocale} onSpaceChange={changeSpace} wishes={wishes} onWish={wish => setExperienceId(wish.id)}>
    <main className="app-shell" data-density={prefs.density} data-theme={theme} style={themeStyle}>
      <header className="topbar">
        <div className="brand"><Heart size={21} fill="currentColor" strokeWidth={1.5} /><span>{t.brand}</span></div>
        <div className="topbar-actions"><button className="icon-button" aria-label={locale==='zh-CN'?'搜索所有内容':'Search everything'} onClick={()=>setSearchOpen(true)}><Search size={18}/></button>
          <button type="button" className="icon-button appearance-button" title={t.appearance} aria-label={t.appearance} onClick={() => { setPhotoError(""); setPhotoDraft(null); setAppearanceOpen(true); }}><Palette size={18} /></button>
          <div className="locale-control" role="group" aria-label={t.language}>
            <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => changeLocale("zh-CN")}>中</button>
            <button type="button" aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
          </div>
        </div>
      </header>

      <section className="workspace">

        <div className="section-head relaxed-nav">
          <div className="tabs" role="tablist" aria-label={locale === "zh-CN" ? "主要栏目" : "Main sections"}>
            {prefs.tabs.map(target=><button key={target} role="tab" aria-selected={view===target} onClick={()=>{setView(target);}}>{sectionName(target,locale==='zh-CN')}</button>)}
          </div>
          <button type="button" className="secondary more-toggle" aria-expanded={moreOpen||moreDialog} aria-controls={moreDialog?'more-dialog-sections':'extra-sections'} onClick={toggleMore}>{locale === "zh-CN" ? "更多" : "More"}</button>
          <button className="primary" type="button" onClick={openNewWish}><Plus size={18}/>{locale === "zh-CN" ? "记一个" : "Add a wish"}</button>
        </div>
        {moreOpen && <nav className="extra-sections" id="extra-sections" aria-label={locale === "zh-CN" ? "更多栏目" : "More sections"}>
          {moreCommands()}
        </nav>}
        {!['wishes','map','pet'].includes(view) && <p className="current-section">{view === 'done' ? (locale === 'zh-CN' ? '做过的事，慢慢收藏。' : 'Things we did, memories to keep.') : view === 'life' ? (locale === 'zh-CN' ? '日历与回忆' : 'Calendar & memories') : view === 'adventure' ? (locale === 'zh-CN' ? '一起冒险' : 'Adventures') : t.dashboard}</p>}
        {batchTarget==='active'&&(view==='wishes'||view==='done')&&batchToolbar(false)}{batchNotice&&<p className="completion-notice" role="status">{batchNotice}</p>}
        <SyncStatus sync={sync} zh={locale==='zh-CN'} onInspect={setInspected}/>{partnerNotice&&<div className="partner-notice" role="status"><span>{partnerNotice}</span><button onClick={()=>setPartnerNotice('')} aria-label={locale==='zh-CN'?'关闭更新提示':'Dismiss update'}><X size={16}/></button></div>}
        {completedName && <p className="completion-notice" role="status">{locale === "zh-CN" ? `我们做过啦 · ${completedName}。以后也可以补照片和感想。` : `We did it · ${completedName}. Add memories whenever you like.`}</p>}

        {!adding && Object.entries(drafts).some(([id]) => id === "new" || wishes.some(w => w.id === id)) && <div className="draft-banner"><span>{locale === "zh-CN" ? "有未完成的草稿 · 仅此设备" : "Unfinished drafts · this device"}</span>{Object.entries(drafts).filter(([id]) => id === "new" || wishes.some(w => w.id === id)).map(([id, draft]) => <button type="button" key={id} onClick={() => applyDraft(draft)}>{locale === "zh-CN" ? "继续：" : "Continue: "}{draft.title || (locale === "zh-CN" ? "新心愿" : "New wish")}</button>)}</div>}
        {(view === "wishes" || view === "done") && wishes.length > 0 && <section className="optional-filters"><div className="filter-bar" aria-label={t.filters}>
          <Filter size={16} aria-hidden="true" />
          {view === "wishes" && <label><span>{t.status}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | WishStatus)}>
            <option value="all">{t.allStatuses}</option>
            <option value="wanted">{t.wantedStatus}</option>
            <option value="planned">{t.plannedStatus}</option>
          </select></label>}
          {categoryNames.length > 0 && <label><span>{t.category}</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">{t.allCategories}</option>
            {(categoryFilter!=='all'&&!categoryNames.includes(categoryFilter)?[categoryFilter,...categoryNames]:categoryNames).map(name=><option key={name} value={name}>{name}</option>)}
          </select></label>}
          {hasFilters && <button type="button" className="clear-filters" onClick={() => { clearFilters(); }}><X size={14} />{t.clearFilters}</button>}
        </div></section>}

        {view === "adventure" ? <SoloAdventure spaceId={spaceId} zh={locale==="zh-CN"} onPets={()=>setView("pet")}/> : view === "pet" ? (spaceId ? <SharedPet key={spaceId} spaceId={spaceId} zh={locale==="zh-CN"}/> : <p>{locale==="zh-CN"?"登录情侣空间后，就能一起养宠物。":"Sign in to raise your pet together."}</p>) : view === "life" ? <LifeDashboard key={navigationScope||'local'} spaceId={spaceId} zh={locale==='zh-CN'} wishes={wishes} onWish={wish=>spaceId?setExperienceId(wish.id):openEditWish(wish)} onNew={openNewWishForDay} onMemory={setMemoryId} onBackground={memoryBackground} navigation={navigation.state} onNavigate={navigation.update}/> : view === "map" ? <TaskMap onEdit={id => { const wish = wishes.find(w => w.id === id); if (wish) openEditWish(wish); }} wishes={wishes} zh={locale==="zh-CN"} onDetails={spaceId?setExperienceId:undefined}/> : view === "dashboard" ? <div className="dashboard-view">
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
            {hasFilters ? <button type="button" className="text-action" onClick={() => { clearFilters(); }}>{t.clearFilters}</button> : view === "wishes" && <p>{t.emptyBody}</p>}
            {!hasFilters && view === "wishes" && <button type="button" className="text-action" onClick={openNewWish}><Plus size={16} />{t.add}</button>}
          </div>
        ) : (
          <div className="wish-list">
            {visible.map((wish) => (
              <article className="wish-row" data-pending={sync.pending.some(p=>p.wish.id===wish.id)} key={wish.id}>
                <div className="wish-mark">{batchTarget==='active'?<input type="checkbox" aria-label={`${locale==='zh-CN'?'选择':'Select'} ${wish.title}`} checked={selected.includes(wish.id)} disabled={batchBusy||!batchPool.some(w=>w.id===wish.id)} onChange={()=>selectWish(wish.id)}/>:<Heart size={17}/>}</div>
                <div className="wish-content">
                  <h2>{wish.title}</h2>
                  {spaceId && <button type="button" className="text-action wish-discuss" onClick={()=>setExperienceId(wish.id)}><MessageCircle size={14}/>{wish.status==="done"?(locale==="zh-CN"?"留言 · 回忆照片":"Comments · Memories"):(locale==="zh-CN"?"聊聊 · 按需安排":"Chat · Optional plans")}</button>}
                  {wish.category && <span className="wish-category">{wish.category}</span>}
                  {wish.status === "planned" && <span className="wish-status">{t.plannedStatus}{wish.plannedDate ? ` · ${wish.plannedDate}` : ""}</span>}
                  {wish.note && <p>{wish.note}</p>}
                  {wish.status === "done" && wish.completionNote && <p className="completion-note">{wish.completionNote}</p>}
                  {wish.address && <p className="wish-meta"><MapPin size={14} />{wish.address}</p>}
                  {wish.url && <a href={wish.url} target="_blank" rel="noopener noreferrer"><Link2 size={14} />{new URL(wish.url).hostname}<ArrowUpRight size={14} /></a>}
                  {wish.checklist.length > 0 && <div className="wish-checklist">
                    {wish.checklist.map((item) => <label key={item.id}>
                      <input type="checkbox" checked={item.completed} disabled={sync.pending.some(p=>p.wish.id===wish.id)} onChange={() => void toggleChecklist(wish.id, item)} />
                      <span>{item.label}</span>
                    </label>)}
                  </div>}
                </div>
                <div className="row-actions"><button type="button" className="icon-button" aria-label={locale==='zh-CN'?'生成分享卡片':'Create share card'} title={locale==='zh-CN'?'分享卡片':'Share card'} onClick={()=>setShare({title:wish.title,note:wish.completionNote||wish.note,address:wish.address,date:wish.plannedDate})}><ArrowUpRight size={17}/></button>
                  <button type="button" className="icon-button" title={t.edit} aria-label={t.edit} onClick={() => openEditWish(wish)}><Pencil size={17} /></button>
                  <button type="button" className="icon-button" title={wish.status === "done" ? t.undo : t.markDone} aria-label={wish.status === "done" ? t.undo : t.markDone} disabled={sync.pending.some(p=>p.wish.id===wish.id)} onClick={() => void toggleWish(wish)}><Check size={18} /></button>
                  <button type="button" className="icon-button danger" title={t.delete} aria-label={t.delete} disabled={!!removeBusy||sync.pending.some(p=>p.wish.id===wish.id)} onClick={() => void deleteWish(wish.id)}><Trash2 size={17} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
        {error && !adding && <p className="form-error" role="alert">{error}</p>}

        {trashOpen && <section className="recovery-panel" aria-label={locale === "zh-CN" ? "恢复心愿" : "Restore wishes"}>{batchTarget==='removed'?batchToolbar(true):<button className="secondary" onClick={()=>setBatchTarget('removed')}>{locale==='zh-CN'?'批量恢复':'Restore multiple'}</button>}<p>{locale === "zh-CN" ? "删除的心愿和关联记录会保留，可随时恢复。" : "Removed wishes and their records are kept here for recovery."}</p>{!removedWishes.length && <p>{locale === "zh-CN" ? "没有已删除的心愿" : "No removed wishes"}</p>}{removedWishes.map(w => <div key={w.id}>{batchTarget==='removed'&&<input type="checkbox" aria-label={`${locale==='zh-CN'?'选择':'Select'} ${w.title}`} checked={selected.includes(w.id)} disabled={batchBusy||!batchPool.some(item=>item.id===w.id)} onChange={()=>selectWish(w.id)}/>}<span>{w.title}</span><button className="secondary" disabled={!!removeBusy||sync.pending.some(p=>p.wish.id===w.id)} onClick={() => void setRemoved(w.id, false)}>{locale === "zh-CN" ? "恢复" : "Restore"}</button></div>)}</section>}
        <p className="storage-note">{supabase ? t.sharedStorage : t.localOnly}</p>
      </section>

      {moreDialog&&<LifeModal title={locale==='zh-CN'?'更多栏目':'More sections'} onClose={()=>setMoreDialog(false)}><nav className="extra-sections more-dialog-sections" id="more-dialog-sections" onClick={event=>{if((event.target as HTMLElement).closest('[data-section-command]'))setMoreDialog(false);}}>{moreCommands()}</nav></LifeModal>}
      {searchOpen&&<GlobalSearch wishes={wishes} space={spaceId} zh={locale==='zh-CN'} query={navigation.state.searchQuery} onQueryChange={searchQuery=>navigation.update({searchQuery})} scroll={navigation.state.searchScroll} onScroll={searchScroll=>navigation.update({searchScroll})} onClose={()=>setSearchOpen(false)} onWish={w=>{searchReturn.current=true;setSearchOpen(false);openEditWish(w);}} onMemory={id=>{searchReturn.current=true;setSearchOpen(false);setMemoryId(id);}}/>}
      {settingsOpen&&<LayoutPreferences prefs={prefs} zh={locale==='zh-CN'} onClose={()=>setSettingsOpen(false)} onAppearance={()=>{setSettingsOpen(false);setAppearanceOpen(true);}}/>}
      {backupOpen&&<ContentBackup space={spaceId} wishes={displayedWishes} pending={sync.pending} zh={locale==='zh-CN'} onClose={()=>setBackupOpen(false)}/>}
      {share&&<ShareCard content={share} zh={locale==='zh-CN'} onClose={()=>{setShare(null);if(searchReturn.current){searchReturn.current=false;setSearchOpen(true);}}}/>}
      {memoryId&&spaceId&&<Memories key={`${spaceId}:${memoryId}`} spaceId={spaceId} wishes={wishes} zh={locale==='zh-CN'} initialMemoryId={memoryId} onInitialClose={closeMemory} onBackground={memoryBackground}/>}
      {inspected&&<LifeModal title={locale==='zh-CN'?'此设备上的版本':'Version on this device'} onClose={()=>{setInspected(null);if(searchReturn.current){searchReturn.current=false;setSearchOpen(true);}}}><div className="pending-preview"><p className="life-muted">{locale==='zh-CN'?'我的待同步内容':'My pending changes'}</p><h3>{inspected.title}</h3><p>{inspected.note}</p><p>{inspected.address}</p><p>{inspected.completionNote}</p><p>{inspected.plannedDate}</p>{inspected.checklist.map(i=><p key={i.id}>{i.completed?'✓':'○'} {i.label}</p>)}</div>{allWishes.filter(w=>w.id===inspected.id).map(cloud=><div className="pending-preview cloud-preview" key={cloud.id}><p className="life-muted">{locale==='zh-CN'?'最近载入的云端版本':'Last loaded cloud version'}</p><h3>{cloud.title}</h3><p>{cloud.note}</p><p>{cloud.address}</p><p>{cloud.completionNote}</p><p>{cloud.plannedDate}</p>{cloud.checklist.map(i=><p key={i.id}>{i.completed?'✓':'○'} {i.label}</p>)}</div>)}<button className="secondary" onClick={()=>{setShare({title:inspected.title,note:inspected.note,address:inspected.address});setInspected(null);}}>{locale==='zh-CN'?'生成卡片':'Create card'}</button></LifeModal>}
      {spaceId && experienceId && wishes.find(w=>w.id===experienceId) && <WishExperience key={`${spaceId}:${experienceId}`} spaceId={spaceId} wish={wishes.find(w=>w.id===experienceId)!} wishes={wishes} zh={locale==="zh-CN"} onClose={()=>setExperienceId(null)} onBackground={memoryBackground}/>}
      {undoId && <div className="undo-toast" role="status"><span>{locale === "zh-CN" ? "心愿已移到已删除列表" : "Wish moved to removed list"}</span><button disabled={!!removeBusy||sync.pending.some(p=>p.wish.id===undoId)} onClick={() => void setRemoved(undoId, false)}>{locale === "zh-CN" ? "撤销" : "Undo"}</button></div>}
      {adding && <div className="dialog-backdrop">
        <div className="dialog wish-editor-dialog" onKeyDown={event => {
          if(event.key==='Escape'&&!wishSaving){event.stopPropagation();resetEditor();return;}
          if (event.key !== "Tab") return;
          const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], summary')).filter(element => element.getClientRects().length > 0);
          const first = elements[0], last = elements[elements.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <div className="dialog-head"><h2 id="dialog-title">{editingId ? t.edit : t.add}</h2><button type="button" className="icon-button" aria-label={t.cancel} disabled={wishSaving} onClick={resetEditor}><X size={20} /></button></div>
          <form noValidate onSubmit={saveWish} aria-busy={wishSaving}>
            <fieldset className="wish-editor-body" disabled={wishSaving}>
            <p className="draft-state" role="status">{draftError ? (locale === "zh-CN" ? "设备存储不可用，草稿暂未保存" : "Device storage unavailable. Draft not saved.") : draftKey ? (locale === "zh-CN" ? "草稿自动保存在此设备，关闭后可继续编辑" : "Draft saved on this device. Close and continue later.") : (locale === "zh-CN" ? "正在准备草稿保存…" : "Preparing draft storage…")}</p><p className="wish-editor-intro">{locale === "zh-CN" ? "一句话或一个链接就能保存，其他都可以以后再加。" : "A thought or a link is enough. Everything else can wait."}</p>
            <label>{locale === "zh-CN" ? "想做什么？" : "What would you like to do?"}<input autoFocus placeholder={locale === "zh-CN" ? "写一句话，或贴一个链接" : "A thought or a link is enough"} value={title} onChange={(e) => { setTitle(e.target.value); setError(""); }} /></label>
            <section className="wish-extras"><h3>{locale === "zh-CN" ? "地点与计划 · 可选" : "Place & plans · optional"}</h3>
            <PlaceSearch value={address} onChange={value => { setAddress(value); setLocation(null); }} onSelect={setLocation} zh={locale === "zh-CN"}/>
            <label>{t.category} <span className="optional-label">{t.optional}</span><input list="wish-categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={locale === "zh-CN" ? "例如：旅行、美食、约会" : "Travel, food, date night…"}/><datalist id="wish-categories">{categoryNames.map(name => <option key={name} value={name}/>)}</datalist></label>
            <fieldset className="status-editor"><legend>{t.status}</legend><div className="segmented-control">
              {(["wanted", "planned", "done"] as WishStatus[]).map((option) => <button type="button" key={option} aria-pressed={status === option} onClick={() => setStatus(option)}>{option === "wanted" ? t.wantedStatus : option === "planned" ? t.plannedStatus : t.doneStatus}</button>)}
            </div></fieldset>
            {status === "planned" && <label>{t.plannedDate} <span className="optional-label">{t.optional}</span><input type="date" value={plannedDate} onInput={(e) => setPlannedDate(e.currentTarget.value)} onChange={(e) => setPlannedDate(e.target.value)} /></label>}
            {status === "done" && <label>{t.completionNote} <span className="optional-label">{t.optional}</span><textarea value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} rows={2} /></label>}
            <section className="wish-editor-notes"><h3>{locale === "zh-CN" ? "随手补充 · 可选" : "A little more · optional"}</h3>
            <label>{t.note}<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></label>
            <label>{t.pasteLink}<input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setError(""); }} placeholder="https://" /></label>
            <PersistentDisclosure name="wish-checklist" initiallyOpen={false} title={`${t.checklist} · ${t.optional}`}><fieldset className="checklist-editor" aria-label={t.checklist}>
              {checklistDraft.map((item, index) => <div key={item.id}>
                <input aria-label={`${t.checklistItem} ${index + 1}`} value={item.label} onChange={(event) => setChecklistDraft((items) => items.map((entry, itemIndex) => itemIndex === index ? { ...entry, label: event.target.value } : entry))} />
                <button type="button" className="icon-button" aria-label={t.removeChecklistItem} onClick={() => setChecklistDraft((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>
              </div>)}
              <button type="button" className="text-action" onClick={() => setChecklistDraft((items) => [...items, { id: crypto.randomUUID(), label: "", completed: false, position: items.length }])}><ListPlus size={16} />{t.checklistItem}</button>
            </fieldset></PersistentDisclosure>
            </section>
            </section>
            {error && <p className="form-error" role="alert">{error}</p>}{editingId&&baseVersion===null&&supabase&&<button type="button" onClick={()=>{setEditingId(null);setBaseVersion(null);}}>{locale==='zh-CN'?'另存为新心愿':'Save as a new wish'}</button>}
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
      {spaceId && view !== "adventure" && <RoamingPet key={spaceId} spaceId={spaceId} zh={locale === "zh-CN"} onOpenHome={() => { setView('pet'); }}/> }
    </main>
    </SpaceGate>
  );
}
