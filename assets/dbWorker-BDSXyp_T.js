(function(){
/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
let e=`vocalRecordings`,t=`personalLibrary`,n=`autosave`,r=null;function i(){return r||=new Promise((i,a)=>{let o=indexedDB.open(`O GiradorDB`,2);o.onerror=()=>{r=null,a(o.error||Error(`Failed to open IndexedDB`))},o.onsuccess=()=>{let e=o.result;e.onclose=()=>{r=null},e.onversionchange=()=>{e.close(),r=null},i(e)},o.onupgradeneeded=r=>{let i=o.result;i.objectStoreNames.contains(e)||i.createObjectStore(e,{keyPath:`patternId`}),i.objectStoreNames.contains(t)||i.createObjectStore(t,{keyPath:`name`}),i.objectStoreNames.contains(n)||i.createObjectStore(n,{keyPath:`id`})}}),r}async function a(e){let t=await i();return new Promise((r,i)=>{let a=t.transaction(n,`readwrite`),o=a.objectStore(n),s={id:`current`,data:e,updatedAt:Date.now()};o.put(s),a.oncomplete=()=>r(),a.onerror=()=>i(a.error||Error(`Failed to save autosave`)),a.onabort=()=>i(Error(`Autosave transaction aborted`))})}
/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/
self.addEventListener(`message`,async e=>{let{type:t,payload:n}=e.data||{};if(t===`SAVE_AUTOSAVE`)try{await a(n),self.postMessage({type:`SAVE_SUCCESS`})}catch(e){console.error(`[dbWorker] Failed to save autosave:`,e)}})})();