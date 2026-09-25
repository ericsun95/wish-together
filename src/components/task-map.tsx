"use client";
import { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, ChevronRight, MapPin, Navigation, Search, X } from 'lucide-react';
import { getGoogleMapsUrl, getMapQuery, getMapSource, isGoogleMapsUrl } from '@/lib/maps';
import './task-map.css';
export type MapTask = {id:string;title:string;address:string;url:string;category:string;status:'wanted'|'planned'|'done';plannedDate:string};
function MapEmbed({query,title,zh,external}:{query:string;title:string;zh:boolean;external:string}) {
  const [loaded,setLoaded]=useState(false),[slow,setSlow]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{setLoaded(false);setSlow(false);const timer=setTimeout(()=>setSlow(true),10000);return()=>clearTimeout(timer);},[attempt]);
  return <div className="tm-canvas"><iframe key={attempt} title={title} src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=${zh?'zh-CN':'en'}`} referrerPolicy="no-referrer-when-downgrade" allowFullScreen onLoad={()=>setLoaded(true)} onError={()=>setSlow(true)}/>{!loaded&&<div className="tm-loading" role="status"><MapPin size={25}/><p>{slow?(zh?'地图加载较慢，可重新加载或直接打开地图。':'The map is taking longer to load. Retry or open it directly.'):(zh?'正在加载地点地图…':'Loading the location map…')}</p>{slow&&<div><button type="button" onClick={()=>setAttempt(v=>v+1)}>{zh?'重新加载':'Retry'}</button><a href={external} target="_blank" rel="noopener noreferrer">{zh?'打开 Google Maps':'Open Google Maps'}<ArrowUpRight size={14}/></a></div>}</div>}</div>;
}
export function TaskMap({wishes,zh,onDetails}:{wishes:MapTask[];zh:boolean;onDetails?:(id:string)=>void}) {
  const [selected,setSelected]=useState(''),[filter,setFilter]=useState('all'),[category,setCategory]=useState('all'),[text,setText]=useState('');
  const [search,setSearch]=useState(''),[destination,setDestination]=useState('');
  const places=wishes.filter(w=>getMapSource(w.address,w.url));
  const statuses={wanted:zh?'想去':'Want to go',planned:zh?'已计划':'Planned',done:zh?'已完成':'Completed'};
  const categories=Array.from(new Set(places.map(w=>w.category).filter(Boolean))).sort();
  const filtered=places.filter(w=>(filter==='all'||w.status===filter)&&(category==='all'||w.category===category)&&`${w.title} ${w.address} ${w.category}`.toLocaleLowerCase().includes(text.trim().toLocaleLowerCase()));
  const active=filtered.find(w=>w.id===selected)||filtered[0];
  const source=active?getMapSource(active.address,active.url):'';
  const query=destination||(active?getMapQuery(source,active.title):'');
  const external=destination?getGoogleMapsUrl(destination):getGoogleMapsUrl(source,active?.title);
  const address=(w:MapTask)=>w.address&&!isGoogleMapsUrl(w.address)?w.address:zh?'通过 Google Maps 地点链接定位':'Location from Google Maps link';
  function choose(id:string){setSelected(id);setDestination('');setSearch('');}
  function reset(){setFilter('all');setCategory('all');setText('');setDestination('');setSearch('');}
  return <section className="task-map" aria-label={zh?'任务地图':'Task map'}>
    <header className="tm-header"><div><span className="tm-eyebrow">{zh?'一起出发':'PLACES TO EXPERIENCE'}</span><h1>{zh?'愿望地图':'Your places'}</h1><p>{zh?'把想去的地方，变成下一次出发。':'Turn the places on your list into your next outing.'}</p></div><div className="tm-total"><MapPin size={18}/><strong>{places.length}</strong><span>{zh?'个地点':'places'}</span></div></header>
    <div className="tm-shell"><aside className="tm-sidebar" aria-label={zh?'地点列表':'Places'}>
      <div className="tm-sidebar-head"><h2>{zh?'我的地点':'Saved places'}</h2><span>{filtered.length} / {places.length}</span></div>
      <label className="tm-find"><Search size={16}/><input aria-label={zh?'筛选任务地点':'Filter saved places'} value={text} onChange={e=>{setText(e.target.value);setDestination('');}} placeholder={zh?'搜索任务、地址或分类':'Search tasks, addresses, categories'}/>{text&&<button type="button" aria-label={zh?'清除搜索':'Clear search'} onClick={()=>setText('')}><X size={14}/></button>}</label>
      <div className="tm-status-filters" role="group" aria-label={zh?'按任务状态筛选':'Filter by status'}>{(['all','wanted','planned','done'] as const).map(value=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>{setFilter(value);setDestination('');}}>{value==='all'?(zh?'全部':'All'):statuses[value]}</button>)}</div>
      {!!categories.length&&<label className="tm-category"><span>{zh?'分类':'Category'}</span><select value={category} onChange={e=>{setCategory(e.target.value);setDestination('');}}><option value="all">{zh?'全部分类':'All categories'}</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label>}
      <ul className="tm-places">{filtered.map(wish=><li key={wish.id}><button type="button" className="tm-place" aria-pressed={!destination&&active?.id===wish.id} onClick={()=>choose(wish.id)}><span className={`tm-place-icon status-${wish.status}`}>{wish.status==='done'?<Check size={17}/>:<MapPin size={17}/>}</span><span className="tm-place-copy"><span className="tm-place-title">{wish.title}</span><span className="tm-address">{address(wish)}</span><span className="tm-meta"><span className={`tm-badge status-${wish.status}`}>{statuses[wish.status]}</span>{wish.category&&<span>{wish.category}</span>}{wish.plannedDate&&<span><CalendarDays size={11}/>{wish.plannedDate}</span>}</span></span><ChevronRight size={14} className="tm-chevron"/></button></li>)}</ul>
      {!filtered.length&&<div className="tm-list-empty"><MapPin size={26}/><strong>{places.length?(zh?'没有匹配的地点':'No matching places'):(zh?'还没有保存地点':'No places saved yet')}</strong><p>{places.length?(zh?'换个关键词，或清除筛选。':'Try another search or clear your filters.'):(zh?'为任务添加地址或 Google Maps 链接，就会出现在这里。':'Add an address or Google Maps link to a task to see it here.')}</p>{places.length>0&&<button type="button" onClick={reset}>{zh?'清除筛选':'Clear filters'}</button>}</div>}
      <footer className="tm-sidebar-foot">{wishes.length-places.length>0?(zh?`${wishes.length-places.length} 个任务还未添加地点`:`${wishes.length-places.length} ${wishes.length-places.length===1?'task':'tasks'} without a location`):(zh?'选择地点，在右侧查看地图':'Select a place to view it on the map')}</footer>
    </aside><div className="tm-content">
      <form className="tm-map-search" onSubmit={e=>{e.preventDefault();if(search.trim())setDestination(getMapQuery(search));}}><Search size={17}/><input aria-label={zh?'在地图上查找地点':'Find a place on the map'} placeholder={zh?'查找地址、商家或地点':'Find an address, business or place'} value={search} onChange={e=>setSearch(e.target.value)}/><button type="submit" disabled={!search.trim()}>{zh?'查找':'Find'}</button></form>
      {destination&&<div className="tm-search-note"><span>{zh?'正在查看搜索地点':'Viewing search result'} · {destination}</span><button type="button" onClick={()=>{setDestination('');setSearch('');}}>{zh?'返回任务地点':'Back to saved places'}<X size={13}/></button></div>}
      {query?<><MapEmbed key={`${query}:${zh}`} query={query} title={`${zh?'任务地点地图':'Task location map'}: ${destination||active?.title}`} zh={zh} external={external}/><div className="tm-detail"><div className="tm-detail-text"><span className="tm-eyebrow">{destination?(zh?'地点搜索':'SEARCH RESULT'):(active?.category||(zh?'已保存地点':'SAVED PLACE'))}</span><h2>{destination||active?.title}</h2><p><MapPin size={14}/>{destination||(active?address(active):'')}</p></div><div className="tm-detail-actions">{!destination&&active&&onDetails&&<button type="button" onClick={()=>onDetails(active.id)}>{zh?'任务详情':'Task details'}<ChevronRight size={14}/></button>}<a href={external} target="_blank" rel="noopener noreferrer"><Navigation size={15}/>{zh?'打开地图':'Open Maps'}<ArrowUpRight size={14}/></a></div></div><p className="tm-provider">{zh?'地图由 Google Maps 提供；地点按地址或名称匹配，请核对后出发。':'Map by Google Maps. Locations are matched by address or name; verify before travelling.'}</p></>:<div className="tm-map-empty"><div><MapPin size={30}/></div><h2>{zh?'下一站，想去哪里？':'Where to next?'}</h2><p>{zh?'选择一个任务地点，或搜索你想去的地方。':'Select a saved place or search for somewhere new.'}</p></div>}
    </div></div>
  </section>;
}
