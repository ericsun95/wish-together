"use client";
import { useEffect, useState } from "react";
import { Download, Share, Copy } from "lucide-react";
type InstallPrompt = Event & { prompt: () => Promise<{ outcome: string }> };
export function InstallApp({zh}:{zh:boolean}) {
  const [prompt,setPrompt] = useState<InstallPrompt|null>(null), [help,setHelp]=useState(false), [installed,setInstalled]=useState(false), [siteUrl,setSiteUrl]=useState(""), [message,setMessage]=useState(""), [busy,setBusy]=useState(false);
  useEffect(()=>{
    setSiteUrl(window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/");
    const mode = window.matchMedia("(display-mode: standalone)");
    const sync = () => setInstalled(mode.matches || !!(navigator as Navigator & { standalone?:boolean }).standalone);
    sync(); mode.addEventListener("change",sync);
    const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);};
    const done=()=>{setInstalled(true);setPrompt(null);setHelp(false);};
    window.addEventListener("beforeinstallprompt",offer);window.addEventListener("appinstalled",done);
    return()=>{mode.removeEventListener("change",sync);window.removeEventListener("beforeinstallprompt",offer);window.removeEventListener("appinstalled",done);};
  },[]);
  if(installed)return null;
  async function install(){if(busy)return;if(!prompt){setHelp(v=>!v);return;}setBusy(true);try{await prompt.prompt();}catch{setHelp(true);}finally{setPrompt(null);setBusy(false);}}
  async function copy(){try{await navigator.clipboard.writeText(siteUrl);setMessage(zh?'网址已复制，可以去 Safari 粘贴打开。':'Link copied. Paste it into Safari.');}catch{setMessage(zh?'请长按下面的网址，选择复制。':'Press and hold the address below to copy it.');}}
  return <div className="install-app install-entry"><button type="button" className="secondary" aria-expanded={help} aria-controls="install-instructions" disabled={busy} onClick={()=>void install()}><Download size={15}/>{zh?"添加到主屏幕":"Add to home screen"}</button>{help&&<div id="install-instructions" className="install-instructions"><strong>{zh?'iPhone / iPad':'iPhone / iPad'}</strong><ol><li>{zh?'在 Safari 中打开这个网站。微信内打开时，可先复制下方网址，再到 Safari 粘贴。':'Open this site in Safari. If viewing it inside WeChat, copy the address below and paste it into Safari.'}</li><li><Share size={15} aria-hidden="true"/>{zh?'点浏览器的“分享”按钮（方框向上箭头）。':'Tap the browser’s Share button (square with an upward arrow).'}</li><li>{zh?'下滑选择“添加到主屏幕”，再点“添加”。如果出现“作为网页 App 打开”，保持开启。':'Scroll to Add to Home Screen, then tap Add. Keep Open as Web App enabled if shown.'}</li></ol><p>{zh?'没找到该选项？在分享菜单底部点“编辑操作”，添加“添加到主屏幕”。':'Missing that option? Tap Edit Actions at the bottom of the share menu and add Add to Home Screen.'}</p><button type="button" className="secondary" onClick={()=>void copy()}><Copy size={14}/>{zh?'复制网站地址':'Copy website address'}</button><div className="install-url">{siteUrl}</div>{message&&<p role="status">{message}</p>}<details><summary>{zh?'Android / 其他浏览器':'Android / other browsers'}</summary><p>{zh?'在 Chrome 菜单中选择“安装应用”或“添加到主屏幕”。是否提供安装选项取决于浏览器。':'In Chrome, open the menu and choose Install app or Add to Home screen. Availability depends on the browser.'}</p></details><small>{zh?'添加完成后，从手机桌面图标进入即可。打开和同步心愿需要网络。':'After adding, open the home-screen icon. Opening and syncing wishes requires internet.'}</small></div>}</div>;
}
