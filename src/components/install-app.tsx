"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
type InstallPrompt = Event & { prompt: () => Promise<{ outcome: string }> };
export function InstallApp({zh}:{zh:boolean}) {
  const [prompt,setPrompt] = useState<InstallPrompt|null>(null), [help,setHelp]=useState(false), [installed,setInstalled]=useState(false);
  useEffect(()=>{
    const mode = window.matchMedia("(display-mode: standalone)");
    const sync = () => setInstalled(mode.matches || !!(navigator as Navigator & { standalone?:boolean }).standalone);
    sync(); mode.addEventListener("change",sync);
    const offer=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);};
    const done=()=>{setInstalled(true);setPrompt(null);setHelp(false);};
    window.addEventListener("beforeinstallprompt",offer);window.addEventListener("appinstalled",done);
    return()=>{mode.removeEventListener("change",sync);window.removeEventListener("beforeinstallprompt",offer);window.removeEventListener("appinstalled",done);};
  },[]);
  if(installed)return null;
  return <div className="install-app"><button type="button" className="secondary" aria-expanded={help} onClick={async()=>{if(prompt){try{await prompt.prompt();}catch{setHelp(true);}finally{setPrompt(null);}}else setHelp(v=>!v);}}><Download size={15}/>{zh?"添加到主屏幕":"Add to home screen"}</button>{help&&<p role="status">{zh?"iPhone：在 Safari 中点分享 → 添加到主屏幕。Android：在 Chrome 菜单中选择“安装应用”或“添加到主屏幕”。打开和同步心愿需要网络。":"iPhone: in Safari, tap Share → Add to Home Screen. Android: use Chrome’s menu → Install app or Add to Home screen. Opening and syncing wishes requires internet."}</p>}</div>;
}
