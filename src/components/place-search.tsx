"use client";
import { useEffect, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { coordinates, type Coordinates } from "@/lib/wish-drafts";
import { getGoogleMapsUrl } from "@/lib/maps";

type Place = { name: string; address: string; location: Coordinates | null };
export function PlaceSearch({ value, onChange, zh, onSelect }: { value: string; onChange: (value: string) => void; zh: boolean; onSelect?: (location: Coordinates | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const cache = useRef(new Map<string, Place[]>());
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  async function search() {
    const text = query.trim();
    if (!text || state === "loading") return;
    const cached = cache.current.get(text.toLowerCase());
    if (cached) { setResults(cached); setState("ready"); return; }
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setState("loading"); setResults([]);
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`, { signal: controller.signal });
      if (!response.ok) throw new Error("Search unavailable");
      const data = await response.json();
      if (!Array.isArray(data.features)) throw new Error("Invalid response");
      const places: Place[] = data.features.flatMap((feature: { properties?: Record<string, unknown>; geometry?: { coordinates?: number[] } }) => {
        const p = feature?.properties;
        if (!p) return [];
        const parts = [p.name, [p.housenumber, p.street].filter(v => typeof v === "string").join(" "), p.city, p.state, p.country].filter((v): v is string => typeof v === "string" && !!v.trim());
        const address = [...new Set(parts)].join(", ");
        return address ? [{ name: typeof p.name === "string" ? p.name : parts[0], address, location: coordinates({ longitude: feature.geometry?.coordinates?.[0], latitude: feature.geometry?.coordinates?.[1] }) }] : [];
      });
      if (request.current !== controller) return;
      const unique = places.filter((place, index) => places.findIndex(p => p.address === place.address) === index);
      if (cache.current.size >= 30) cache.current.clear();
      cache.current.set(text.toLowerCase(), unique);
      setResults(unique); setState("ready");
    } catch { if (request.current === controller) setState("error"); }
    finally { clearTimeout(timeout); }
  }
  return <div className="place-search">
    <label>{zh ? "地点或地址" : "Place or address"}<input value={value} onChange={e => onChange(e.target.value)} placeholder={zh ? "手动填写，或在下方搜索地点" : "Enter an address, or search below"} /></label>
    <div className="place-search-box">
      <label className="place-search-query"><Search size={16} aria-hidden="true"/><input aria-label={zh ? "搜索地点" : "Search places"} value={query} placeholder={zh ? "店名 / 景点 + 城市" : "Place name + city"} onChange={e => { request.current?.abort(); request.current = null; setQuery(e.target.value); setState("idle"); setResults([]); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void search(); } }}/></label>
      <button type="button" className="secondary" disabled={!query.trim() || state === "loading"} onClick={() => void search()}>{state === "loading" ? (zh ? "搜索中…" : "Searching…") : (zh ? "搜索" : "Search")}</button>
    </div>
    <div aria-live="polite">
      {state === "error" && <p className="place-search-hint">{zh ? "搜索暂时不可用，可以手动输入地址，或去 Google Maps 查找。" : "Search is unavailable. Enter the address manually or try Google Maps."}</p>}
      {state === "ready" && !results.length && <p className="place-search-hint">{zh ? "没有找到地点，试试加上城市名或手动输入。" : "No places found. Add a city name or enter the address manually."}</p>}
      {!!results.length && <ul className="place-results">{results.map(place => <li key={place.address}><button type="button" onClick={() => { onChange(place.address); onSelect?.(place.location); setResults([]); setState("idle"); }}><MapPin size={17}/><span><strong>{place.name}</strong><small>{place.address}</small></span><span>{zh ? "选择" : "Use"}</span></button></li>)}</ul>}
    </div>
    <div className="place-search-credit"><span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · Photon</span>{(query.trim() || value.trim()) && <a href={getGoogleMapsUrl(query.trim() || value)} target="_blank" rel="noreferrer">Google Maps ↗</a>}</div>
  </div>;
}
