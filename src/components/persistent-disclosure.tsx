"use client";
import { useEffect, useId, useState, type ReactNode } from "react";

export function useDisclosurePreference(name: string, initiallyOpen = true) {
  const [open, setOpen] = useState(initiallyOpen);
  useEffect(() => {
    try { const saved = localStorage.getItem(`wish-together:disclosure:${name}`); if (saved === "open" || saved === "closed") setOpen(saved === "open"); } catch { /* Preferences are optional. */ }
  }, [name]);
  function change(next: boolean) {
    setOpen(next);
    try { localStorage.setItem(`wish-together:disclosure:${name}`, next ? "open" : "closed"); } catch { /* Keep the in-memory choice. */ }
  }
  return [open, change] as const;
}
export function PersistentDisclosure({ name, title, className = "", initiallyOpen = true, children }: { name: string; title: ReactNode; className?: string; initiallyOpen?: boolean; children: ReactNode }) {
  const [open, change] = useDisclosurePreference(name, initiallyOpen);
  const id = useId();
  return <section className={`persistent-disclosure ${className}`}><button className="disclosure-toggle" type="button" aria-expanded={open} aria-controls={id} onClick={() => change(!open)}><span>{title}</span><span aria-hidden="true">{open ? "−" : "+"}</span></button><div id={id} hidden={!open} className="disclosure-content">{children}</div></section>;
}
