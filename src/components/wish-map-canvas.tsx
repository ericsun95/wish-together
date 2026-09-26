"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { coordinates } from "@/lib/wish-drafts";
import type { MapTask } from "./task-map";

export function WishMapCanvas({ wishes, selected, onSelect, zh }: { wishes: MapTask[]; selected?: string; onSelect: (id: string) => void; zh: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect); select.current = onSelect;
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const pins = wishes.filter(w => coordinates(w.location));
  const signature = JSON.stringify(pins.map(w => [w.id, w.title, w.status, w.location]));
  useEffect(() => {
    if (!host.current) return;
    const instance = L.map(host.current, { scrollWheelZoom: false }).setView([25, 10], 2);
    map.current = instance;
    const tile = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(instance);
    tile.on("tileerror", () => setFailed(true));
    layers.current = L.layerGroup().addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize()); observer.observe(host.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; layers.current = null; };
  }, [retry]);
  useEffect(() => {
    const instance = map.current, group = layers.current;
    if (!instance || !group) return;
    group.clearLayers();
    const current: MapTask[] = JSON.parse(signature).map(([id, title, status, location]: [string,string,MapTask["status"],MapTask["location"]]) => ({ id, title, status, location } as MapTask));
    const bounds = L.latLngBounds([]);
    // Group identical coordinates so every wish remains selectable at shared venues.
    const groups = new Map<string, MapTask[]>();
    for (const wish of current) {
      const key = `${wish.location!.latitude},${wish.location!.longitude}`;
      groups.set(key, [...(groups.get(key) || []), wish]);
    }
    for (const samePlace of groups.values()) {
      const first = samePlace[0], point: L.LatLngTuple = [first.location!.latitude, first.location!.longitude];
      bounds.extend(point);
      const marker = L.marker(point, { title: samePlace.map(w => w.title).join(" · "), icon: L.divIcon({ className: "wish-map-pin", html: `<span>${samePlace.length > 1 ? samePlace.length : "♥"}</span>`, iconSize: [34, 40], iconAnchor: [17, 36] }) }).addTo(group);
      const content = document.createElement("div"); content.className = "wish-map-popup";
      samePlace.forEach(wish => { const button = document.createElement("button"); button.type = "button"; button.textContent = wish.title; button.addEventListener("click", () => select.current(wish.id)); content.append(button); });
      marker.getElement()?.setAttribute("aria-label", samePlace.map(w => w.title).join(" · "));
      marker.bindPopup(content);
      marker.on("click", () => select.current(first.id));
    }
    if (bounds.isValid()) instance.fitBounds(bounds.pad(0.18), { maxZoom: 14, animate: false });
  }, [signature, retry]);
  useEffect(() => {
    const chosen = wishes.find(w => w.id === selected);
    if (chosen?.location && map.current) map.current.setView([chosen.location.latitude, chosen.location.longitude], Math.max(map.current.getZoom(), 13), { animate: false });
  }, [selected, signature, retry]);
  function showAll() { if (!pins.length || !map.current) return; map.current.fitBounds(L.latLngBounds(pins.map(w => [w.location!.latitude,w.location!.longitude] as L.LatLngTuple)).pad(.18), {maxZoom:14}); }
  return <div className="wish-map-wrap"><div ref={host} className="wish-map-canvas" aria-label={zh ? "心愿地点地图" : "Wish locations map"}/><button type="button" className="map-fit secondary" disabled={!pins.length} onClick={showAll}>{zh ? `查看全部 ${pins.length} 个标记` : `Show all ${pins.length} pins`}</button>{!pins.length && <p className="map-hint">{zh ? "在心愿编辑中搜索并选择地点，即可显示标记。" : "Search and select a place in the wish editor to add a pin."}</p>}{failed && <div className="map-tile-error" role="status">{zh ? "底图加载失败，地点列表仍可使用。" : "Map tiles unavailable. Your places are still listed."}<button onClick={() => { setFailed(false); setRetry(v => v + 1); }}>{zh ? "重试" : "Retry"}</button></div>}</div>;
}
