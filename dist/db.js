import {initialState} from './core.js';
let promise;
function openDB(){
  if(!promise) promise=new Promise((resolve,reject)=>{
    const req=indexedDB.open('termos-da-obra',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('data');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(Error('Não foi possível abrir o armazenamento do iPad. Verifique o espaço disponível e o modo privado.'));
  });
  return promise;
}
export async function readState(){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction('data').objectStore('data').get('state');
    req.onsuccess=()=>resolve(req.result||initialState());req.onerror=()=>reject(req.error);
  });
}
export async function saveState(state){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('data','readwrite'), store=tx.objectStore('data');
    let error, next;
    const read=store.get('state');
    read.onsuccess=()=>{
      if((read.result?.revision||0)!==state.revision){error=Error('Outra aba alterou os dados. Reabra a tela antes de continuar.');tx.abort();return;}
      next={...state,revision:state.revision+1};store.put(next,'state');
    };
    tx.oncomplete=()=>{state.revision=next.revision;resolve();};
    tx.onabort=()=>reject(error||Error('Não foi possível salvar. Pode faltar espaço no aparelho. Seus dados não foram confirmados.'));
    tx.onerror=()=>{};
  });
}
