export type SharedWish={title:string;url:string;note:string;address:string;source:'xiaohongshu'|'web'|'text';links:string[]};
export const SHARE_LIMIT=16000;
export function safeShareUrl(value:string){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function isRedNote(value:string){try{const host=new URL(value).hostname.toLowerCase();return host==='xhslink.com'||host.endsWith('.xhslink.com')||host==='xiaohongshu.com'||host.endsWith('.xiaohongshu.com');}catch{return false;}}
export function shareIdentity(value:string){const safe=safeShareUrl(value);if(!safe)return '';const u=new URL(safe);if(isRedNote(safe)){const id=u.pathname.match(/\/(?:explore|discovery\/item)\/([a-f\d]{24})(?:\/|$)/i)?.[1];if(id)return `xhs:${id.toLowerCase()}`;return `${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/,'')}`;}u.hash='';return u.href;}
export function parseSharedWish(raw:string,preferredUrl=''):SharedWish{
 const text=raw.slice(0,SHARE_LIMIT).trim();
 const matches=text.match(/https?:\/\/[^\s<>"'\u3000，。！？、；）】》」』]+/gi)||[];
 const found=matches.map(x=>safeShareUrl(x.replace(/[，。！？、；：）】》」』\])},.!?;:]+$/g,'').split(/[，。！？、；）】》」』]/)[0])).filter(Boolean);
 const preferred=safeShareUrl(preferredUrl),links=[...new Set([...(preferred?[preferred]:[]),...found])];
 const url=preferred||links.find(isRedNote)||links[0]||'',red=isRedNote(url);
 let clean=text.replace(/https?:\/\/[^\s<>"'\u3000，。！？、；）】》」』]+/gi,'').replace(/(?:复制(?:本条|这条)?(?:信息|链接|文案)[，,\s]*打开[\s\S]*|打开【?小红书】?\s*(?:App|APP|app)[\s\S]*)$/,'').trim().replace(/^[，,\s]+|[，,\s]+$/g,'');
 // Only strip recognized share wrappers. Keep the supplied text as a note, never fetch or invent note content.
 let title=clean.split(/\r?\n/).find(line=>line.trim())?.trim()||'';
 if(red){const bracket=clean.match(/【([^\n]+?)】/);if(bracket&&/\|\s*小红书/.test(bracket[1]))title=bracket[1].replace(/\s+[-–—]\s+[^-–—|]+\|\s*小红书.*$/,'').replace(/\s*\|\s*小红书.*$/,'');else title=title.replace(/\s+\d*\s*[^\s]*发布了一篇小红书笔记[\s\S]*$/,'').replace(/发布了一篇小红书笔记[\s\S]*$/,'').replace(/\s*[😆💗]\s*\w+[😆💗\s]*$/u,'');}
 title=title.trim().replace(/^\d+\s+(?=【)/,'');
 if(!title||/^(?:小红书|分享|复制)/.test(title))title=red?'小红书里的一个心愿':url?new URL(url).hostname.replace(/^www\./,''):'';
 const address=clean.match(/(?:^|\n)\s*(?:📍\s*(?:(?:地址|地点|位置)\s*[:：]\s*)?|(?:地址|地点|位置)\s*[:：]\s*)([^\n]+)/)?.[1]?.trim()||'';
 return {title:title.slice(0,200),url,note:clean,address:address.slice(0,500),source:red?'xiaohongshu':url?'web':'text',links};
}
export function incomingShare(search:string){const p=new URLSearchParams(search);if(p.get('capture')!=='1'&&!['shared_title','shared_text','shared_url'].some(k=>p.has(k)))return null;const title=p.get('shared_title')||'',text=p.get('shared_text')||'',url=p.get('shared_url')||'';return [title,text,url].filter(Boolean).join('\n');}
