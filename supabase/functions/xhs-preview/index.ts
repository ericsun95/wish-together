import {fetchPreview,noteUrl,type XhsPreview} from './preview.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const cache=new Map<string,{until:number;value:XhsPreview|null}>(),rates=new Map<string,{until:number;count:number}>();
function json(value:unknown,status=200){return new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const auth=req.headers.get('Authorization')||'';if(!/^Bearer\s+\S+$/.test(auth))return json({error:'unauthorized'},401);
 const base=Deno.env.get('SUPABASE_URL')!,apikey=Deno.env.get('SUPABASE_ANON_KEY')!;
 try{
  const userResult=await fetch(`${base}/auth/v1/user`,{headers:{Authorization:auth,apikey},signal:AbortSignal.timeout(5000)});if(!userResult.ok)return json({error:'unauthorized'},401);const user=await userResult.json();if(!user.id)return json({error:'unauthorized'},401);
  // Bound request size before parsing, even when Content-Length is omitted.
  if(Number(req.headers.get('content-length'))>12000)return json({error:'too_large'},413);const reader=req.body?.getReader();if(!reader)return json({error:'invalid_request'},400);let text='',bytes=0;const decoder=new TextDecoder();try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>12000)return json({error:'too_large'},413);text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel();}
  const body=JSON.parse(text);if(typeof body.url!=='string'||body.url.length>8000||!noteUrl(body.url)||typeof body.spaceId!=='string'||!/^[a-f\d-]{36}$/i.test(body.spaceId))return json({error:'invalid_request'},400);
  const member=await fetch(`${base}/rest/v1/space_members?select=space_id&space_id=eq.${encodeURIComponent(body.spaceId)}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,{headers:{Authorization:auth,apikey},signal:AbortSignal.timeout(5000)});if(!member.ok||!(await member.json()).length)return json({error:'forbidden'},403);
  const now=Date.now();for(const [key,item]of cache)if(item.until<now)cache.delete(key);for(const [key,item]of rates)if(item.until<now)rates.delete(key);
  const key=`${user.id}:${body.spaceId}:${body.url}`,known=cache.get(key);if(known)return json({preview:known.value});
  const rate=rates.get(user.id)||{until:now+300000,count:0};if(rate.count>=30)return json({error:'try_later'},429);rate.count++;rates.set(user.id,rate);if(rates.size>500)rates.delete(rates.keys().next().value!);
  let preview:XhsPreview|null=null;try{preview=await fetchPreview(body.url);}catch{/* Public pages may deny requests. Keep the original link usable. */}
  if(cache.size>=200)cache.delete(cache.keys().next().value!);cache.set(key,{until:now+(preview?1800000:60000),value:preview});return json({preview});
 }catch{return json({error:'preview_unavailable'},503);}
});
