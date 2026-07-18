(function(){"use strict";/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */const d="O GiradorDB",c="vocalRecordings",i="personalLibrary",s="autosave";let n=null;function u(){return n||(n=new Promise((r,a)=>{const t=indexedDB.open(d,2);t.onerror=()=>{n=null,a(t.error||new Error("Failed to open IndexedDB"))},t.onsuccess=()=>{const o=t.result;o.onclose=()=>{n=null},o.onversionchange=()=>{o.close(),n=null},r(o)},t.onupgradeneeded=o=>{const e=t.result;e.objectStoreNames.contains(c)||e.createObjectStore(c,{keyPath:"patternId"}),e.objectStoreNames.contains(i)||e.createObjectStore(i,{keyPath:"name"}),e.objectStoreNames.contains(s)||e.createObjectStore(s,{keyPath:"id"})}})),n}async function l(r){const a=await u();return new Promise((t,o)=>{const e=a.transaction(s,"readwrite"),S=e.objectStore(s),E={id:"current",data:r,updatedAt:Date.now()};S.put(E),e.oncomplete=()=>t(),e.onerror=()=>o(e.error||new Error("Failed to save autosave")),e.onabort=()=>o(new Error("Autosave transaction aborted"))})}/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */self.addEventListener("message",async r=>{const{type:a,payload:t}=r.data||{};if(a==="SAVE_AUTOSAVE")try{await l(t),self.postMessage({type:"SAVE_SUCCESS"})}catch{}})})();
