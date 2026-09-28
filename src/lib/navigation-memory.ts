export type RememberedView='wishes'|'done'|'dashboard'|'map'|'life'|'pet'|'adventure';
export type LifeTab='timeline'|'dates'|'album'|'calendar';
export type NavigationState={view:RememberedView;filters:Record<'wishes'|'done',{status:string;category:string}>;lifeTab:LifeTab;calendarMonth:string;calendarDay:string;albumPage:number;timelineKind:string;timelineYear:string;timelineLimit:number;searchQuery:string;searchScroll:number};
export type NavigationMemory={state:NavigationState;positions:Record<string,number>};
export function defaultNavigation():NavigationState{return {view:'wishes',filters:{wishes:{status:'all',category:'all'},done:{status:'all',category:'all'}},lifeTab:'timeline',calendarMonth:'',calendarDay:'',albumPage:0,timelineKind:'all',timelineYear:'all',timelineLimit:40,searchQuery:'',searchScroll:0};}
export function navigationKey(user:string,space:string){return `wish-together:navigation:v1:${user}:${space}`;}
export function scrollKey(s:NavigationState){const filter=s.view==='wishes'||s.view==='done'?`${s.filters[s.view].status}:${s.filters[s.view].category}`:s.view==='life'?`${s.lifeTab}:${s.lifeTab==='calendar'?s.calendarMonth:s.lifeTab==='album'?s.albumPage:s.lifeTab==='timeline'?s.timelineKind+':'+s.timelineYear:''}`:'';return `${s.view}:${filter}`;}
export function readNavigation(storage:Pick<Storage,'getItem'>,key:string):NavigationMemory {
 const fallback={state:defaultNavigation(),positions:{}};
 try{const data=JSON.parse(storage.getItem(key)||'null');if(!data?.state)return fallback;const v=data.state,s=defaultNavigation();
 if(['wishes','done','dashboard','map','life','pet','adventure'].includes(v.view))s.view=v.view;
 for(const view of ['wishes','done'] as const){const f=v.filters?.[view];if(f){if(['all','wanted','planned','done'].includes(f.status))s.filters[view].status=view==='done'?'all':f.status;if(typeof f.category==='string')s.filters[view].category=f.category.slice(0,200);}}
 if(['timeline','dates','album','calendar'].includes(v.lifeTab))s.lifeTab=v.lifeTab;
 if(typeof v.calendarMonth==='string'&&/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(v.calendarMonth))s.calendarMonth=v.calendarMonth;
 if(typeof v.calendarDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.calendarDay)){const d=new Date(v.calendarDay+'T12:00:00Z');if(Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v.calendarDay&&v.calendarDay.startsWith(s.calendarMonth)&&s.calendarMonth)s.calendarDay=v.calendarDay;}
 if(s.calendarMonth&&!s.calendarDay)s.calendarDay=s.calendarMonth+'-01';
 if(Number.isInteger(v.albumPage)&&v.albumPage>=0&&v.albumPage<1000)s.albumPage=v.albumPage;
 if(['all','wish','memory','anniversary'].includes(v.timelineKind))s.timelineKind=v.timelineKind;
 if(v.timelineYear==='all'||/^\d{4}$/.test(v.timelineYear))s.timelineYear=v.timelineYear;
 if(Number.isInteger(v.timelineLimit)&&v.timelineLimit>=40&&v.timelineLimit<=10000)s.timelineLimit=v.timelineLimit;
 if(typeof v.searchQuery==='string')s.searchQuery=v.searchQuery.slice(0,500);
 if(Number.isFinite(v.searchScroll)&&v.searchScroll>=0)s.searchScroll=v.searchScroll;
 const positions=Object.fromEntries(Object.entries(data.positions||{}).filter(([,y])=>typeof y==='number'&&Number.isFinite(y)&&y>=0&&y<1e7).slice(-50)) as Record<string,number>;
 return {state:s,positions};
 }catch{return fallback;}
}
