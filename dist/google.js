import {filename,validEmail,canSend} from './core.js';
let accessToken='',expiresAt=0,scopes='';
export const connected=()=>Boolean(accessToken && Date.now()<expiresAt);
export const disconnect=()=>{accessToken='';expiresAt=0;scopes='';};
let library;
export function loadGoogle(){
  if(globalThis.google?.accounts?.oauth2)return Promise.resolve();
  if(!library)library=new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;
    s.onload=resolve;s.onerror=()=>{library=null;s.remove();reject(Error('Não foi possível carregar a conexão Google. Verifique a internet.'));};document.head.append(s);
  });
  return library;
}
// Chame após carregar a biblioteca, diretamente a partir de um clique (Safari).
export function connect(clientId,drive){
  if(!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId))throw Error('Configure o Client ID OAuth do Google na área Conexão Google. Não use client secret.');
  if(!globalThis.google?.accounts?.oauth2)throw Error('A conexão Google ainda está carregando. Aguarde e toque novamente.');
  return new Promise((resolve,reject)=>{
    const requested=['https://www.googleapis.com/auth/gmail.send',...(drive?['https://www.googleapis.com/auth/drive.file']:[])];
    const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:requested.join(' '),callback:r=>{
      if(r.error){reject(Error('Autorização não concluída: '+r.error));return;}
      if(!google.accounts.oauth2.hasGrantedAllScopes(r,...requested)){disconnect();reject(Error('Autorize o envio de e-mail e, se selecionado, o Drive.'));return;}
      accessToken=r.access_token;expiresAt=Date.now()+Number(r.expires_in)*1000-30000;scopes=r.scope||requested.join(' ');resolve();
    },error_callback:()=>reject(Error('A janela de conexão foi fechada ou bloqueada. Tente novamente pelo botão Conectar.'))});
    client.requestAccessToken({prompt:'select_account'});
  });
}
async function api(url,options={}){
  if(!connected())throw Object.assign(Error('Conecte sua conta Google novamente.'),{definite:true});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
  try{
    const r=await fetch(url,{...options,headers:{...options.headers,Authorization:'Bearer '+accessToken},signal:controller.signal});
    if(!r.ok){
      if(r.status===401)disconnect();
      const e=Error(r.status===401?'A sessão Google expirou. Conecte novamente.':`Google recusou a operação (HTTP ${r.status}). Verifique as APIs e permissões na configuração Google.`);
      e.status=r.status;e.definite=r.status>=400&&r.status<500;throw e;
    }
    return await r.json();
  }finally{clearTimeout(timer);}
}
export function base64(bytes){let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);}
const utf64=s=>base64(new TextEncoder().encode(s));
const wrap=s=>s.match(/.{1,76}/g)?.join('\r\n')||'';
export function messageFor(doc){
  if(!canSend(doc))throw Error('O documento ainda não foi concluído.');
  const recipients=[...new Set(doc.witnesses.map(w=>w.email))];
  if(recipients.some(e=>!validEmail(e)))throw Error('E-mail de testemunha inválido.');
  const boundary='termos_'+doc.id.replace(/[^a-zA-Z0-9]/g,''),name=filename(doc);
  return [
    'To: '+recipients.join(', '),
    'Subject: =?UTF-8?B?'+utf64('Termo de Adesão · '+doc.person.name)+'?=',
    'MIME-Version: 1.0','Message-ID: <'+doc.id+'@termosdeadesao.vercel.app>',
    'Content-Type: multipart/mixed; boundary="'+boundary+'"','',
    '--'+boundary,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',
    wrap(utf64(`Segue a cópia do termo de adesão de ${doc.person.name}, referente à obra ${doc.work.name}.\n\nDocumento: ${doc.id}\nSHA-256: ${doc.hash}\n\nArquivo enviado pelo aplicativo independente Termos da Obra.`)),
    '--'+boundary,'Content-Type: application/pdf; name="'+name+'"','Content-Disposition: attachment; filename="'+name+'"',
    'Content-Transfer-Encoding: base64','',wrap(base64(new Uint8Array(doc.pdf))),'--'+boundary+'--',''
  ].join('\r\n');
}
export async function sendEmail(doc){
  const raw=utf64(messageFor(doc)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return api('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({raw})});
}
export async function newDriveId(){
  const r=await api('https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive');return r.ids[0];
}
export async function uploadDrive(doc){
  if(!scopes.includes('drive.file'))throw Error('Reconecte o Google com a opção Drive habilitada.');
  if(!doc.delivery.driveId)throw Error('Identificador do Drive não reservado.');
  const url='https://www.googleapis.com/drive/v3/files/'+doc.delivery.driveId+'?fields=id,webViewLink';
  try{return await api(url);}catch(e){if(e.status!==404)throw e;}
  const boundary='upload_'+doc.id;
  const metadata={id:doc.delivery.driveId,name:filename(doc),mimeType:'application/pdf',description:'Obra: '+doc.work.name,appProperties:{termId:doc.id,sha256:doc.hash}};
  const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(metadata),'\r\n--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n',new Uint8Array(doc.pdf),'\r\n--'+boundary+'--']);
  try{return await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});}
  catch(e){if(e.status===409)return api(url);throw e;}
}
