function openDatabase() {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('loopee-studio-audio',1);
    request.onupgradeneeded=()=>{request.result.createObjectStore('sessions',{keyPath:'id'});request.result.createObjectStore('headers',{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}
export async function saveAudioSession(session) {
  const db=await openDatabase();
  try {await new Promise((resolve,reject)=>{
    const tx=db.transaction(['sessions','headers'],'readwrite');
    tx.objectStore('sessions').put(session);
    tx.objectStore('headers').put({id:session.id,name:session.name,updatedAt:session.updatedAt,layers:session.tracks.filter(t=>t.audio).length});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });} finally{db.close();}
}
export async function listAudioSessions(){
  const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const r=db.transaction('headers').objectStore('headers').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updatedAt-a.updatedAt));r.onerror=()=>reject(r.error);});}finally{db.close();}
}
export async function loadAudioSession(id){
  const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const r=db.transaction('sessions').objectStore('sessions').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}
}
