export type XhsPreview={title:string;description:string;image:string;url:string};
const HOSTS=new Set(['xhslink.com','www.xhslink.com','xiaohongshu.com','www.xiaohongshu.com']);
export function noteUrl(input:string){try{const u=new URL(input);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port||!HOSTS.has(u.hostname))return null;
 const short=u.hostname.endsWith('xhslink.com');if(short?!/^\/[a-zA-Z0-9/_-]{1,150}\/?$/.test(u.pathname):!/^\/(?:explore|discovery\/item)\/[a-f\d]{24}\/?$/i.test(u.pathname))return null;
 u.protocol='https:';u.hash='';return u.href;}catch{return null;}}
export function imageUrl(input:string){try{const u=new URL(input.startsWith('//')?'https:'+input:input);if(!['http:','https:'].includes(u.protocol)||u.port||u.username||u.password||!(/(^|\.)xhscdn\.com$/.test(u.hostname)||u.hostname==='ci.xiaohongshu.com'))return '';u.protocol='https:';return u.href;}catch{return '';}}
function decoded(text:string){return text.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,(_,code:string)=>{if(code[0]==='#'){const n=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}return ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '} as Record<string,string>)[code.toLowerCase()]||'';}).replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f]/g,' ').trim();}
export function metadata(html:string,url:string):XhsPreview|null{
 const values=new Map<string,string>();for(const tag of html.match(/<meta\b[^>]{0,20000}>/gi)||[]){const attrs=new Map<string,string>();for(const a of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g))attrs.set(a[1].toLowerCase(),decoded(a[2]??a[3]??a[4]??''));const name=(attrs.get('property')||attrs.get('name')||'').toLowerCase();if(!values.has(name))values.set(name,attrs.get('content')||'');}
 const title=(values.get('og:title')||values.get('twitter:title')||decoded(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'')).replace(/\s*[-|–]\s*小红书\s*$/,'').trim();
 if(!title||/^(?:小红书|REDnote|Xiaohongshu)(?:\s*[-|–].*)?$/i.test(title)||/安全验证|访问验证|Access Denied|Access Forbidden|页面不存在|笔记不存在|内容无法展示|请.*登录|登录.*小红书/i.test(title))return null;
 return {title:title.slice(0,300),description:(values.get('og:description')||values.get('description')||'').slice(0,600),image:imageUrl(values.get('og:image')||values.get('twitter:image')||''),url};
}
export async function fetchPreview(input:string,request:typeof fetch=fetch):Promise<XhsPreview|null>{
 let url=noteUrl(input);if(!url)throw new Error('unsupported_url');const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 try{for(let hop=0;hop<5;hop++){const response=await request(url,{redirect:'manual',signal:controller.signal,headers:{Accept:'text/html','User-Agent':'WishTogether-LinkPreview/1.0'}});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location)return null;url=noteUrl(new URL(location,url).href);if(!url)return null;continue;}
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html')){await response.body?.cancel();return null;}
  if(Number(response.headers.get('content-length'))>1500000){await response.body?.cancel();return null;}const reader=response.body?.getReader();if(!reader)return null;
  const decoder=new TextDecoder();let html='',size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1500000)return null;html+=decoder.decode(value,{stream:true});if(/<\/head>/i.test(html))break;}html+=decoder.decode();}finally{await reader.cancel();}
  return metadata(html,url);
 }return null;}finally{clearTimeout(timer);}
}
