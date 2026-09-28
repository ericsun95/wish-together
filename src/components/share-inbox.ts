'use client';
import {useEffect,useState,useRef} from 'react';
import {incomingShare,SHARE_LIMIT} from '@/lib/share-import';
const KEY='wish-together:incoming-share:v1';
export function useShareInbox(){
 const initialized=useRef(false);
 const [raw,setRaw]=useState(''),[open,setOpen]=useState(false),[ready,setReady]=useState(false),[storageError,setStorageError]=useState(false);
 useEffect(()=>{if(initialized.current)return;initialized.current=true;const incoming=incomingShare(window.location.search);let text=incoming||'';try{if(incoming===null)text=sessionStorage.getItem(KEY)||'';else sessionStorage.setItem(KEY,incoming);if(incoming!==null){const u=new URL(location.href);for(const key of ['capture','shared_title','shared_text','shared_url'])u.searchParams.delete(key);history.replaceState(history.state,'',u.pathname+u.search+u.hash);}}catch{setStorageError(true);}setRaw(text);setOpen(incoming!==null&&!!text.trim());setReady(true);},[]);
 function update(text:string){setRaw(text);try{if(text.length<=SHARE_LIMIT){sessionStorage.setItem(KEY,text);setStorageError(false);}else{sessionStorage.removeItem(KEY);setStorageError(true);}}catch{setStorageError(true);}}
 function clear(){setRaw('');setOpen(false);try{sessionStorage.removeItem(KEY);setStorageError(false);}catch{setStorageError(true);}}
 return {raw,open,ready,storageError,setOpen,update,clear};
}
