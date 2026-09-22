"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Copy, Heart, LogIn, LogOut, Plus, RotateCcw, UserRoundPlus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { messages, type Locale } from "@/lib/messages";
import { supabase } from "@/lib/supabase";

type Member = { user_id: string; role: string; display_name?: string; avatar_url?: string };

type Space = { id: string; name: string; role: "owner" | "partner" };

function invitationToken(input: string) {
  let token = input.trim();
  try {
    token = new URL(token).searchParams.get("invite") ?? "";
  } catch {
    // A token may be pasted without the surrounding URL.
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token) ? token : null;
}

export function SpaceGate({ children, locale, onLocaleChange, onSpaceChange, backgroundPhoto, theme = "clean" }: {
  theme?: "clean" | "coast" | "city" | "garden";
  backgroundPhoto?: string | null;
  children: ReactNode;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onSpaceChange: (spaceId: string | null) => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [space, setSpace] = useState<Space | null>(null);
  const [spaceUserId, setSpaceUserId] = useState<string | null>(null);
  const [spaceReady, setSpaceReady] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [presenceReady, setPresenceReady] = useState(false);
  const [membersError, setMembersError] = useState(false);
  const attemptedInvite = useRef<string | null>(null);
  const t = messages[locale];

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const queryToken = new URLSearchParams(window.location.search).get("invite");
    if (queryToken) setInviteInput(queryToken);
    client.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadSpace = useCallback(async (userId: string) => {
    if (!supabase) return;
    setSpaceReady(false);
    const { data: membership, error: membershipError } = await supabase
      .from("space_members").select("space_id, role").eq("user_id", userId).maybeSingle();
    if (membershipError) {
      setError(messages[locale].spaceLoadError);
      setSpaceReady(true);
      return;
    }
    if (!membership) {
      setSpace(null);
      setSpaceReady(true);
      return;
    }
    const { data: details, error: detailsError } = await supabase
      .from("couple_spaces").select("id, name").eq("id", membership.space_id).single();
    if (detailsError || !details) {
      setError(messages[locale].spaceLoadError);
      setSpaceReady(true);
      return;
    }
    setSpace({ id: details.id, name: details.name, role: membership.role });
    setSpaceUserId(userId);
    setSpaceReady(true);
  }, [locale]);

  useEffect(() => {
    if (user) void loadSpace(user.id);
    else {
      setSpace(null);
      setSpaceReady(true);
    }
  }, [user, loadSpace]);

  useEffect(() => {
    if (authReady && spaceReady) onSpaceChange(space?.id ?? null);
  }, [authReady, spaceReady, space?.id, onSpaceChange]);

  useEffect(() => {
    if (!supabase || !user || !spaceReady || space) return;
    const token = invitationToken(inviteInput);
    if (!token || attemptedInvite.current === token) return;
    attemptedInvite.current = token;
    const client = supabase;

    const joiningUserId = user.id;
    async function acceptInvite() {
      setBusy(true); setError("");
      const { error: joinError } = await client.rpc("accept_space_invitation", { p_token: token });
      if (joinError) setError(messages[locale].inviteInvalid);
      else {
        window.history.replaceState({}, "", window.location.pathname);
        setInviteInput("");
        await loadSpace(joiningUserId);
      }
      setBusy(false);
    }

    void acceptInvite();
  }, [inviteInput, locale, loadSpace, space, spaceReady, user]);

  useEffect(() => {
    if (!supabase || !space?.id || !user?.id) return;
    const client = supabase;
    const spaceId = space.id;
    const userId = user.id;
    let active = true;
    setMembers([]);
    setOnlineIds([]);
    setPresenceReady(false);
    async function refreshMembers() {
      const { data, error } = await client.from("space_members")
        .select("user_id, role, display_name, avatar_url").eq("space_id", spaceId).order("joined_at");
      if (!active) return;
      setMembersError(Boolean(error));
      if (data) setMembers(data);
    }
    const metadata = user.user_metadata;
    const displayName = String(metadata.full_name || metadata.name || "").slice(0, 80);
    const rawAvatar = String(metadata.avatar_url || metadata.picture || "");
    const avatarUrl = rawAvatar.startsWith("https://") && rawAvatar.length <= 2048 ? rawAvatar : "";
    void client.from("space_members").update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("user_id", userId).eq("space_id", spaceId).then(() => refreshMembers());
    const timer = window.setInterval(refreshMembers, 15000);
    window.addEventListener("focus", refreshMembers);
    const channel = client.channel(`space-presence:${spaceId}`, {
      config: { presence: { key: userId } },
    });
    channel.on("presence", { event: "sync" }, () => {
      if (!active) return;
      setOnlineIds(Object.keys(channel.presenceState()));
      setPresenceReady(true);
      void refreshMembers();
    }).subscribe(async (status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") await channel.track({ online: true });
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setPresenceReady(false);
        setOnlineIds([]);
      }
    });
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshMembers);
      void client.removeChannel(channel);
    };
  }, [space?.id, user?.id]);

  async function signInWithGoogle() {
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const returnTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: returnTo,
        queryParams: { prompt: "select_account" },
      },
    });
    setBusy(false);
    if (authError) setError(t.signInError);
  }

  async function createSpace(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    setBusy(true); setError("");
    const { error: createError } = await supabase.rpc("create_couple_space", { p_name: spaceName.trim() });
    if (createError) setError(t.spaceActionError);
    else await loadSpace(user.id);
    setBusy(false);
  }

  async function joinSpace(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !user) return;
    const token = invitationToken(inviteInput);
    if (!token) return setError(t.inviteInvalid);
    setBusy(true); setError("");
    const { error: joinError } = await supabase.rpc("accept_space_invitation", { p_token: token });
    if (joinError) setError(t.inviteInvalid);
    else {
      window.history.replaceState({}, "", window.location.pathname);
      setInviteInput("");
      await loadSpace(user.id);
    }
    setBusy(false);
  }

  async function createInvite() {
    if (!supabase) return;
    setBusy(true); setError(""); setNotice("");
    const { data, error: inviteError } = await supabase.rpc("create_space_invitation");
    if (inviteError || typeof data !== "string") setError(t.spaceActionError);
    else setInviteToken(data);
    setBusy(false);
  }

  async function revokeInvites() {
    if (!supabase) return;
    setBusy(true); setError("");
    const { error: revokeError } = await supabase.rpc("revoke_space_invitations");
    if (revokeError) setError(t.spaceActionError);
    else { setInviteToken(""); setNotice(t.inviteRevoked); }
    setBusy(false);
  }

  if (!supabase) return <>{children}</>;

  const languageControl = <div className="locale-control" role="group" aria-label={t.language}>
    <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => onLocaleChange("zh-CN")}>中</button>
    <button type="button" aria-pressed={locale === "en"} onClick={() => onLocaleChange("en")}>EN</button>
  </div>;

  if (!authReady || (user && (!spaceReady || (space && spaceUserId !== user.id)))) return <main className="gate-shell"><p>{t.loading}</p></main>;

  if (!user) return <main className="gate-shell">
    <header className="topbar"><div className="brand"><Heart size={21} fill="currentColor" />{t.brand}</div>{languageControl}</header>
    <section className="gate-content">
      <div className="gate-heading"><LogIn size={27} /><h1>{t.signInTitle}</h1><p>{t.signInBody}</p></div>
      <button className="primary google-sign-in" disabled={busy} type="button" onClick={signInWithGoogle}>
        {t.continueWithGoogle}<ArrowRight size={16} />
      </button>
      {notice && <p className="gate-notice" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  </main>;

  if (!space) return <main className="gate-shell">
    <header className="topbar"><div className="brand"><Heart size={21} fill="currentColor" />{t.brand}</div>{languageControl}</header>
    <section className="gate-content setup-content">
      <div className="gate-heading"><UserRoundPlus size={27} /><h1>{t.spaceSetupTitle}</h1><p>{t.spaceSetupBody}</p></div>
      <form className="gate-form" onSubmit={createSpace}>
        <label>{t.spaceName}<input required maxLength={80} value={spaceName} onChange={(event) => setSpaceName(event.target.value)} /></label>
        <button className="primary" disabled={busy} type="submit"><Plus size={16} />{t.createSpace}</button>
      </form>
      <div className="gate-divider">{t.or}</div>
      <form className="gate-form" onSubmit={joinSpace}>
        <label>{t.inviteLink}<input required value={inviteInput} onChange={(event) => setInviteInput(event.target.value)} /></label>
        <button className="secondary" disabled={busy} type="submit">{t.joinSpace}<ArrowRight size={16} /></button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="quiet-command" type="button" onClick={() => void supabase?.auth.signOut()}><LogOut size={15} />{t.signOut}</button>
    </section>
  </main>;

  const inviteUrl = inviteToken ? `${window.location.origin}${window.location.pathname}?invite=${inviteToken}&v=${encodeURIComponent(process.env.NEXT_PUBLIC_APP_VERSION || "latest")}` : "";
  const zh = locale === "zh-CN";
  function partnerCard(member: Member | undefined, side: "owner" | "partner") {
    const isMe = member?.user_id === user?.id;
    const metadata = isMe ? user?.user_metadata : undefined;
    const name = member?.display_name || metadata?.full_name || metadata?.name || (zh ? (member ? "另一半" : "等你来") : (member ? "My love" : "Your person"));
    const avatar = member?.avatar_url || metadata?.avatar_url || metadata?.picture;
    const online = member && (isMe || onlineIds.includes(member.user_id));
    return <div className={`partner-card partner-${side}`}>
      <div className="partner-avatar">
        <span aria-hidden="true">{member ? String(name).slice(0, 1).toUpperCase() : <UserRoundPlus size={28} />}</span>
        {typeof avatar === "string" && avatar.startsWith("https://") && <img src={avatar} alt={String(name)} referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
        {member && <i className={online ? "avatar-status online" : "avatar-status"} aria-hidden="true" />}
      </div>
      <strong>{name}</strong>
      <span className="partner-status">{member ? `${isMe ? (zh ? "你 · " : "You · ") : ""}${online ? (zh ? "在线" : "Online") : presenceReady ? (zh ? "暂时离线" : "Offline") : (zh ? "连接中" : "Connecting")}` : (zh ? "留一个位置，给最特别的人" : "A little place, just for you")}</span>
    </div>;
  }
  const displayedMembers = members.length ? members : [{ user_id: user.id, role: space.role }];
  return <div className="couple-space" data-photo={Boolean(backgroundPhoto)} data-theme={backgroundPhoto ? "photo" : theme} style={{ "--couple-photo": backgroundPhoto ? `url("${backgroundPhoto}")` : theme === "clean" ? "none" : `url("${process.env.NEXT_PUBLIC_BASE_PATH || ""}/themes/${theme}.webp")` } as CSSProperties}>
    <section className="couple-header" aria-label={zh ? "我们的情侣空间" : "Our couple space"}>
      <div className="couple-toolbar"><span><Heart size={14} fill="currentColor" />{zh ? "只属于我们" : "JUST THE TWO OF US"}</span><div className="space-strip-actions">
        {space.role === "owner" && members.length < 2 && <button type="button" disabled={busy} onClick={createInvite}><UserRoundPlus size={15} />{t.createInvite}</button>}
        {space.role === "owner" && <button type="button" disabled={busy} onClick={revokeInvites} title={t.revokeInvites}><RotateCcw size={14} />{t.revokeInvites}</button>}
        <button type="button" title={user.email} onClick={() => void supabase?.auth.signOut()}><LogOut size={14} />{t.signOut}</button>
      </div></div>
      <div className="couple-portrait" aria-live="polite">
        {partnerCard(displayedMembers.find((member) => member.role === "owner"), "owner")}
        <div className="couple-center"><div className="couple-heart"><span /><Heart size={25} fill="currentColor" /><span /></div><p>{zh ? "我们的故事，慢慢写" : "Our story, one wish at a time"}</p><h1>{space.name}</h1><span className="couple-caption">{membersError ? (zh ? "暂时无法加载另一半的信息" : "Partner details unavailable") : members.length === 2 ? (zh ? "两个人，一个小世界" : "Two hearts. One little world.") : (zh ? "从一个心愿，开始我们的日常" : "Make room for a little magic.")}</span></div>
        {partnerCard(displayedMembers.find((member) => member.role === "partner"), "partner")}
      </div>
    </section>
    {inviteUrl && <div className="invite-strip"><label>{t.inviteLink}<input readOnly value={inviteUrl} onFocus={(event) => event.target.select()} /></label><button type="button" title={t.copyLink} aria-label={t.copyLink} onClick={async () => { try { await navigator.clipboard.writeText(inviteUrl); setNotice(t.linkCopied); } catch { setNotice(t.selectLink); } }}><Copy size={17} /></button></div>}
    {(error || notice) && <div className="space-feedback" role="status">{error || notice}</div>}
    {children}
  </div>;
}
