import {VERSION,uid,today,escapeHTML as esc,validCPF,validCNPJ,validEmail,digits,formatCPF,formatCNPJ,filename,stateOf,witnessCheck,expireDocs,canSend} from './core.js';
import {readState,saveState} from './db.js';
import {generatePDF,hashBytes} from './pdf.js';
import {template} from './template.js';
import {signaturePad} from './signature.js';
import {openTour,dismissed} from './tour.js';
const $=id=>document.getElementById(id);
let state,page='inicio',busy=false,pad=null,draft=null,selected=new Set(),modalURLs=[],modalCleanup=null;
const ufs='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const btn=(action,text,cls='secondary',id='')=>`<button type="button" class="${cls}" data-action="${action}"${id?` data-id="${esc(id)}"`:''}>${text}</button>`;
function field(name,label,placeholder,{type='text',value='',required=true,max=160,wide=false,hint='',inputmode=''}={}){
 return `<label class="field ${wide?'wide':''}"><span>${label}${required?' <span aria-hidden="true">*</span>':''}</span><input name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required?'required':''} maxlength="${max}" ${inputmode?`inputmode="${inputmode}"`:''} autocomplete="off">${hint?`<small>${hint}</small>`:''}</label>`;
}
function selectField(name,label,options,value='',placeholder='Selecione…'){
 return `<label class="field"><span>${label} *</span><select name="${name}" required><option value="">${placeholder}</option>${options.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`;}).join('')}</select></label>`;
}
function heading(title,sub='',actions=''){return `<div class="view-heading"><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="actions">${actions}</div></div>`;}
function tell(message,error=false){if(error&&$('modal').open){let alert=$('modal-error');if(!alert){alert=document.createElement('p');alert.id='modal-error';alert.className='error-text';alert.setAttribute('role','alert');$('modal-body').prepend(alert);}alert.textContent=message;}$('notice').hidden=false;$('notice').className='notice '+(error?'error':'');$('notice').textContent=message;}
async function run(fn){
 if(busy)return;busy=true;$('busy').hidden=false;document.body.classList.add('is-busy');
 try{await fn();}catch(e){console.error(e);tell(e.message||'Não foi possível concluir. Tente novamente.',true);}
 finally{busy=false;$('busy').hidden=true;document.body.classList.remove('is-busy');}
}
async function persist(){try{await saveState(state);}catch(e){state=await readState();throw e;}}
function currentWork(){return state.works.find(w=>w.id===state.activeWork);}
function workDocs(){return state.docs.filter(d=>d.work.id===state.activeWork);}
function chosen(){return workDocs().filter(d=>selected.has(d.id));}
function requireSelected(final=false){const docs=chosen();if(!docs.length)throw Error('Selecione pelo menos um termo.');if(final&&docs.some(d=>!canSend(d)))throw Error('Conclua as três assinaturas e gere o PDF de todos os termos selecionados.');return docs;}
function empty(text,action=''){return `<div class="empty"><p>${text}</p>${action}</div>`;}
function workPicker(){return `<label class="work-picker"><span>Obra em atendimento</span><select id="work-picker"><option value="">Selecione uma obra</option>${state.works.map(w=>`<option value="${w.id}" ${w.id===state.activeWork?'selected':''}>${esc(w.name)}</option>`).join('')}</select></label>`;}
function mainRender(){
 pad?.destroy();pad=null;
 const volunteer=page==='voluntario'||page==='revisao'||page==='recebido';
 $('navigation').hidden=volunteer;$('help').hidden=volunteer;document.querySelector('.site-footer').hidden=volunteer;
 document.querySelector('.brand').style.pointerEvents=volunteer?'none':'';
 document.querySelectorAll('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false');});
 const views={inicio:home,obras:works,aj:associations,testemunhas:witnesses,termos:documents,voluntario:volunteerForm,revisao:reviewVolunteer,recebido:received};
 $('main').innerHTML=views[page]();
 if(page==='revisao')pad=signaturePad($('volunteer-pad'));
 updateConnection();
}
function home(){
 const work=currentWork(),docs=workDocs(),done=docs.filter(d=>d.pdf).length;
 return heading('Atendimento da obra','Área da testemunha')+workPicker()+`<div class="stats"><div><strong>${docs.length}</strong><span>Termos nesta obra</span></div><div><strong>${docs.length-done}</strong><span>Aguardando conclusão</span></div><div><strong>${done}</strong><span>PDFs concluídos</span></div></div>
 <div class="main-grid"><section class="panel"><h2>${work?esc(work.name):'Prepare a primeira obra'}</h2><p>${work?esc(work.association.name)+' · início em '+esc(dateLabel(work.start)):'Cadastre a associação e os dados que serão repetidos nos termos.'}</p><div class="actions vertical"><button id="start-volunteer" class="primary" data-action="start-volunteer" ${!work?'disabled':''}>Preencher novo termo →</button>${btn('witness-stage','Finalizar testemunhas')}${btn('go-docs','Salvar e enviar termos')}${btn('new-work','Preparar outra obra')}</div></section><aside class="panel"><h2>Pronto para o canteiro</h2><p id="offline-status">Verificando modo offline…</p><p class="small">Os termos ficam neste navegador por até 7 dias. Exporte os PDFs em Arquivos e confira as cópias antes de encerrar o atendimento.</p><a id="model-link" class="secondary" href="/assets/termo-adesao.pdf" target="_blank" rel="noopener">Abrir modelo PDF ↗</a><div class="actions">${btn('persist-storage','Preparar armazenamento')}</div></aside></div>`;
}
function dateLabel(d){return d?.split('-').reverse().join('/')||'';}
function associations(){return heading('Associações jurídicas','Os dados cadastrados podem ser usados em várias obras.',btn('new-aj','Cadastrar AJ','primary'))+(state.associations.length?`<div class="card-list">${state.associations.map(a=>`<article class="panel"><h2>${esc(a.name)}</h2><p>${esc(formatCNPJ(a.cnpj))}</p><p>${esc(a.address)}</p>${btn('edit-aj','Editar cadastro','secondary',a.id)}</article>`).join('')}</div>`:empty('Cadastre a primeira associação jurídica.',btn('new-aj','Cadastrar AJ','primary')));}
function works(){return heading('Obras','Cada termo preserva uma cópia dos dados da obra no momento da assinatura.',btn('new-work','Preparar obra','primary'))+(state.works.length?`<div class="card-list">${state.works.map(w=>`<article class="panel"><h2>${esc(w.name)}</h2><p>${esc(w.city)} / ${esc(w.uf)} · início ${dateLabel(w.start)}</p><p>${esc(w.association.name)}</p><div class="actions">${btn('select-work',w.id===state.activeWork?'Em atendimento':'Usar esta obra','primary',w.id)}${btn('edit-work','Editar para próximos termos','secondary',w.id)}</div></article>`).join('')}</div>`:empty('Nenhuma obra preparada.',btn('new-work','Preparar obra','primary')));}
function witnesses(){return heading('Testemunhas','Cadastros reutilizáveis. Cada lote exige uma nova assinatura.',btn('new-witness','Cadastrar testemunha','primary'))+(state.witnesses.length?`<div class="card-list">${state.witnesses.map(w=>`<article class="panel"><h2>${esc(w.name)}</h2><p>RG ${esc(w.rg)} · CPF ${esc(formatCPF(w.cpf))}</p>${btn('edit-witness','Editar cadastro','secondary',w.id)}</article>`).join('')}</div>`:empty('Cadastre as duas testemunhas que acompanharão o atendimento.',btn('new-witness','Cadastrar testemunha','primary')));}
function documents(){
 const docs=workDocs();
 return heading('Termos da obra','Selecione um termo ou um lote para conferir, assinar e exportar.',btn('start-volunteer','Novo termo','primary'))+workPicker()+
 (docs.length?`<section class="panel document-list"><div class="list-tools"><label class="check"><input id="select-all" type="checkbox" ${docs.every(d=>selected.has(d.id))?'checked':''}> Selecionar todos</label><span id="selection-count">${chosen().length} selecionado(s)</span></div>${docs.map(d=>`<article class="document-row"><label class="check"><input type="checkbox" data-select="${d.id}" ${selected.has(d.id)?'checked':''}><span><strong>${esc(d.person.name)}</strong><small>${esc(formatCPF(d.person.cpf))} · ${dateLabel(d.date)}</small></span></label><div class="doc-status"><span class="badge ${d.pdf?'success':''}">${stateOf(d)}</span></div><div class="actions">${btn('view-doc','Conferir','secondary',d.id)}${!d.pdf?btn('single-witness','Assinar','secondary',d.id):''}${d.signatures.every(Boolean)&&!d.pdf?btn('finalize-pdf','Gerar PDF','secondary',d.id):''}${btn('delete-doc','Excluir preenchimento','secondary',d.id)}</div></article>`).join('')}<div class="batch-bar"><div class="actions">${btn('witness-stage','Assinar selecionados','primary')}${btn('download','Salvar / compartilhar')}</div><p class="small">Vários PDFs são salvos em um ZIP. No iPad, escolha “Salvar em Arquivos”. Os PDFs ficam salvos neste aparelho e podem ser compartilhados pelo navegador.</p></div></section>`:empty('Esta obra ainda não tem termos.',btn('start-volunteer','Preencher primeiro termo','primary')));
}
async function deleteDocument(id){
 if(page!=='termos')return;
 const doc=workDocs().find(d=>d.id===id);
 if(!doc)return;
 const confirmed=window.confirm(
  `Excluir o preenchimento de ${doc.person.name} na obra ${doc.work.name}, de ${dateLabel(doc.date)}?\n\n`+
  'O termo, as assinaturas e o PDF serão apagados deste aparelho. Cópias já exportadas ou enviadas continuam disponíveis. Esta ação é definitiva.'
 );
 if(!confirmed)return;
 state.docs=state.docs.filter(d=>d!==doc);
 try{await persist();}catch(error){mainRender();throw error;}
 selected.delete(id);
 if(draft?.id===id)draft=null;
 mainRender();
 tell('Preenchimento excluído deste aparelho.');
}
function witnessForm(id){const w=state.witnesses.find(x=>x.id===id)||{};showModal(w.id?'Editar testemunha':'Cadastrar testemunha',`<form id="witness-form" data-id="${w.id||''}"><div class="form-grid">${field('name','Nome completo','Como consta no documento',{value:w.name,wide:true,max:140})}${field('rg','RG','Número do RG da testemunha',{value:w.rg,max:30})}${field('cpf','CPF','000.000.000-00',{value:w.cpf,max:14,inputmode:'numeric'})}</div><p class="small">Os dados dos termos já vinculados não são alterados por esta edição.</p><button class="primary">Salvar testemunha</button></form>`);}
function workForm(id){
 if(!state.associations.length){page='aj';mainRender();associationForm();tell('Cadastre a AJ primeiro e depois prepare a obra.');return;}
 const w=state.works.find(x=>x.id===id)||{};
 showModal(w.id?'Editar obra':'Preparar obra',`<form id="work-form" data-id="${w.id||''}"><div class="form-grid">${field('name','Nome da obra ou salão','Ex.: Salão Jardim das Flores',{value:w.name,wide:true,max:100})}${selectField('associationId','Associação jurídica',state.associations.map(a=>[a.id,a.name]),w.association?.id)}${selectField('template','Modelo de documento',[[template.id,template.title]],template.id)}${field('start','Início da prestação do serviço','Selecione a data',{type:'date',value:w.start||today()})}${field('city','Cidade da assinatura','Ex.: Itu',{value:w.city,max:100})}${selectField('uf','Estado (UF)',ufs,w.uf)}</div><p class="small">Esses dados serão usados nos novos termos desta obra. Termos já assinados permanecem iguais.</p><button class="primary">Salvar e usar esta obra</button></form>`);
}
function collect(form){return Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,typeof v==='string'?v.trim():v]));}
async function startVolunteer(){
 if(!currentWork())throw Error('Prepare e selecione uma obra antes de iniciar.');
 if(draft?.previewURL)URL.revokeObjectURL(draft.previewURL);draft=null;page='voluntario';mainRender();window.scrollTo(0,0);
}
function selectedForWitness(){
 let docs=chosen();
 if(!docs.length)docs=workDocs().filter(d=>!d.pdf);
 docs=docs.filter(d=>!d.pdf);
 if(!docs.length)throw Error('Não há termos pendentes selecionados nesta obra.');
 return docs;
}
let batchIds=[],batchWitnesses=[];
function witnessStage(){
 if(page==='recebido')selected.clear();
 page='termos';mainRender();const docs=selectedForWitness();
 if(state.witnesses.length<2){tell('Cadastre duas testemunhas para concluir os termos.');page='testemunhas';mainRender();return;}
 batchIds=docs.map(d=>d.id);const bound=docs.find(d=>d.witnesses)?.witnesses;
 if(bound){
  docs.forEach(d=>witnessCheck(d,bound));batchWitnesses=structuredClone(bound);batchReview();return;
 }
 showModal('Selecionar as duas testemunhas',`<form id="batch-witnesses"><p>${docs.length} termo(s) selecionado(s). Os dados das testemunhas ficarão vinculados a esses documentos.</p><div class="form-grid">${selectField('first','Primeira testemunha',state.witnesses.map(w=>[w.id,w.name]))}${selectField('second','Segunda testemunha',state.witnesses.map(w=>[w.id,w.name]))}</div><button class="primary">Conferir os termos →</button></form>`);
}
function batchReview(){
 const docs=batchIds.map(id=>state.docs.find(d=>d.id===id));
 showModal('Conferir antes de assinar',`<p>${esc(batchWitnesses[0].name)} e ${esc(batchWitnesses[1].name)}</p><p>Abra cada termo para revisar. Cada testemunha assinará somente os documentos listados que ainda não têm sua assinatura.</p><div class="batch-review">${docs.map(d=>`<article><strong>${esc(d.person.name)}</strong><span>${stateOf(d)}</span>${btn('batch-preview','Abrir termo','secondary',d.id)}</article>`).join('')}</div><div class="actions">${[0,1].map(i=>btn('sign-batch-'+i,'Assinar como '+esc(batchWitnesses[i].name),i?'secondary':'primary')).join('')}</div>`);
}
async function batchPreview(id){const d=structuredClone(state.docs.find(d=>d.id===id));d.witnesses=batchWitnesses;await viewDocument(d,true);}
async function viewDocument(doc,backToBatch=false){
 const bytes=doc.pdf||await generatePDF(doc,{preview:true}),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 showModal(doc.person.name,`<iframe class="pdf-frame" src="${url}" title="Documento de ${esc(doc.person.name)}"></iframe><a class="secondary" href="${url}" target="_blank" rel="noopener">Abrir PDF em tela inteira ↗</a><p class="small">${doc.pdf?'PDF final. SHA-256: '+esc(doc.hash):'Prévia: documento ainda não concluído.'}</p>${backToBatch?btn('back-batch','Voltar à lista de assinaturas','primary'):''}`);modalURLs.push(url);
}
function signBatch(index){
 const docs=batchIds.map(id=>state.docs.find(d=>d.id===id)).filter(d=>!d.signatures[index]);
 if(!docs.length)throw Error('Esta testemunha já assinou todos os termos do lote.');
 docs.forEach(d=>witnessCheck(d,batchWitnesses));
 showModal('Assinatura de '+batchWitnesses[index].name,`<form id="batch-sign" data-index="${index}"><p>Esta assinatura será aplicada exclusivamente a estes ${docs.length} termo(s):</p><ul class="signature-terms">${docs.map(d=>`<li>${esc(d.person.name)} — ${esc(formatCPF(d.person.cpf))}</li>`).join('')}</ul><canvas id="witness-pad" class="signature-pad" aria-label="Área para assinatura da testemunha"></canvas>${btn('clear-witness','Limpar assinatura')}<label class="check consent"><input name="consent" type="checkbox" required> Sou ${esc(batchWitnesses[index].name)}, conferi os termos listados e confirmo minha assinatura em cada um deles.</label><button class="primary">Assinar ${docs.length} termo(s)</button></form>`);
 const p=signaturePad($('witness-pad'));modalCleanup=()=>p.destroy();$('witness-pad').signature=p;
}
async function finalize(doc){
 if(!doc.volunteerSignature||!doc.signatures.every(Boolean))throw Error('Faltam assinaturas.');
 if(doc.pdf)return;
 doc.pdf=await generatePDF(doc);doc.hash=await hashBytes(doc.pdf);doc.completedAt=Date.now();
}
async function exportDocs(docs){
 let blob,name;
 if(docs.length===1){blob=new Blob([docs[0].pdf],{type:'application/pdf'});name=filename(docs[0]);}
 else{
  const entries={};for(const d of docs)entries[filename(d)]=new Uint8Array(d.pdf);
  entries['conferencia.json']=new TextEncoder().encode(JSON.stringify(docs.map(d=>({arquivo:filename(d),id:d.id,sha256:d.hash,concluidoEm:new Date(d.completedAt).toISOString()})),null,2));
  blob=new Blob([fflate.zipSync(entries,{level:0})],{type:'application/zip'});name=`termos_${today()}_${docs.length}_documentos.zip`;
 }
 const url=URL.createObjectURL(blob);
 showModal('Salvar no iPad',`<p>${docs.length} documento(s) pronto(s). Toque no botão abaixo. No Safari, use Compartilhar → Salvar em Arquivos, se necessário.</p><a id="download-file" class="primary" href="${url}" download="${name}">Baixar ${docs.length===1?'PDF':'ZIP com os PDFs'}</a><p class="small">Abra o arquivo em Arquivos para confirmar que foi salvo. O aplicativo não consegue verificar a gravação na pasta do iPad.</p>`);modalURLs.push(url);
}
async function submit(form){
 const v=collect(form),id=form.dataset.id;
 if(form.id==='aj-form'){
  if(!validCNPJ(v.cnpj))throw Error('Confira o CNPJ da associação.');
  const duplicate=state.associations.find(a=>a.id!==id&&digits(a.cnpj)===digits(v.cnpj));if(duplicate)throw Error('Já existe uma AJ com esse CNPJ.');
  const a={id:id||uid(),name:v.name,cnpj:digits(v.cnpj),address:v.address};
  state.associations=id?state.associations.map(x=>x.id===id?a:x):[...state.associations,a];await persist();closeModal();mainRender();tell('Associação salva.');
 }else if(form.id==='witness-form'){
  if(!validCPF(v.cpf))throw Error('Confira o CPF da testemunha.');
  if(state.witnesses.some(w=>w.id!==id&&digits(w.cpf)===digits(v.cpf)))throw Error('Já existe uma testemunha com esse CPF.');
  const w={id:id||uid(),...v,cpf:digits(v.cpf)};state.witnesses=id?state.witnesses.map(x=>x.id===id?w:x):[...state.witnesses,w];await persist();closeModal();mainRender();tell('Testemunha salva.');
 }else if(form.id==='work-form'){
  const association=state.associations.find(a=>a.id===v.associationId);if(!association)throw Error('Selecione uma AJ válida.');
  const w={id:id||uid(),name:v.name,city:v.city,uf:v.uf,start:v.start,template:v.template,association:structuredClone(association)};
  state.works=id?state.works.map(x=>x.id===id?w:x):[...state.works,w];state.activeWork=w.id;await persist();closeModal();page='inicio';selected.clear();mainRender();tell('Obra pronta para atendimento.');
 }else if(form.id==='volunteer-form'){
  if(!validCPF(v.cpf))throw Error('Confira o CPF do voluntário.');
  if(workDocs().some(d=>digits(d.person.cpf)===digits(v.cpf)))throw Error('Já existe um termo deste CPF nesta obra. Consulte a lista de termos.');
  if(v.adult!=='on')throw Error('Somente voluntários com 18 anos ou mais.');
  draft={id:uid(),person:{...v,cpf:digits(v.cpf)},work:structuredClone(currentWork()),date:today(),createdAt:Date.now(),template:template.id,witnesses:null,signatures:[null,null],volunteerSignature:null};
  const bytes=await generatePDF(draft,{preview:true,blankSignature:true});draft.previewURL=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));page='revisao';mainRender();window.scrollTo(0,0);
 }else if(form.id==='volunteer-sign'){
  if(v.consent!=='on')throw Error('Confirme a leitura e concordância com o termo.');
  if(workDocs().some(d=>digits(d.person.cpf)===digits(draft.person.cpf)))throw Error('Já existe um termo deste CPF nesta obra.');
  const {previewURL,...doc}=draft;doc.volunteerSignature=pad.capture();doc.volunteerSignature.consent='Li e concordo com o termo; testemunhas serão incluídas posteriormente.';
  await generatePDF(doc,{preview:true});state.docs.push(doc);await persist();URL.revokeObjectURL(previewURL);draft=doc;page='recebido';mainRender();window.scrollTo(0,0);tell('Dados e assinatura salvos neste aparelho.');
 }else if(form.id==='batch-witnesses'){
  batchWitnesses=[v.first,v.second].map(id=>state.witnesses.find(w=>w.id===id));batchIds.forEach(id=>witnessCheck(state.docs.find(d=>d.id===id),batchWitnesses));
  for(const id of batchIds){const d=structuredClone(state.docs.find(d=>d.id===id));d.witnesses=batchWitnesses;await generatePDF(d,{preview:true});}
  batchWitnesses=structuredClone(batchWitnesses);batchReview();
 }else if(form.id==='batch-sign'){
  const i=Number(form.dataset.index),signature=$('witness-pad').signature.capture();if(v.consent!=='on')throw Error('Confirme os termos que está assinando.');
  const targets=batchIds.map(id=>state.docs.find(d=>d.id===id)).filter(d=>!d.signatures[i]);
  const updates=[];
  for(const original of targets){const d=structuredClone(original);witnessCheck(d,batchWitnesses);d.witnesses||=structuredClone(batchWitnesses);d.signatures[i]={...signature,witnessId:batchWitnesses[i].id,documentIds:targets.map(d=>d.id),consent:'Conferi os termos identificados e confirmo minha assinatura em cada um.'};if(d.signatures.every(Boolean))await finalize(d);updates.push(d);}
  state.docs=state.docs.map(d=>updates.find(u=>u.id===d.id)||d);await persist();closeModal();mainRender();
  if(batchIds.some(id=>!state.docs.find(d=>d.id===id).pdf))batchReview();
  tell(`${targets.length} termo(s) assinado(s) por ${batchWitnesses[i].name}.`);
 }
}
document.addEventListener('submit',e=>{if(!e.target.matches('form'))return;e.preventDefault();if(e.target.reportValidity())run(()=>submit(e.target));});
document.addEventListener('change',e=>{
 if(e.target.id==='work-picker')run(async()=>{state.activeWork=e.target.value;selected.clear();await persist();mainRender();});
 if(e.target.dataset.select){if(e.target.checked)selected.add(e.target.dataset.select);else selected.delete(e.target.dataset.select);$('selection-count').textContent=chosen().length+' selecionado(s)';$('select-all').checked=workDocs().every(d=>selected.has(d.id));}
 if(e.target.id==='select-all'){selected=new Set(e.target.checked?workDocs().map(d=>d.id):[]);mainRender();}
});
const actions={
 'new-aj':()=>associationForm(),'edit-aj':id=>associationForm(id),'new-work':()=>workForm(),'edit-work':id=>workForm(id),
 'new-witness':()=>witnessForm(),'edit-witness':id=>witnessForm(id),
 'select-work':async id=>{state.activeWork=id;selected.clear();await persist();page='inicio';mainRender();},
 'start-volunteer':startVolunteer,'go-docs':()=>{page='termos';mainRender();},
 'exit-volunteer':()=>{if(confirm('Voltar à administração? Dados ainda não confirmados não serão salvos.')){draft=null;page='inicio';mainRender();}},
 'back-volunteer':()=>{const values=draft.person;page='voluntario';mainRender();for(const [key,value]of Object.entries(values)){const input=$('volunteer-form').elements[key];if(input){if(input.type==='checkbox')input.checked=value==='on';else input.value=value;}}URL.revokeObjectURL(draft.previewURL);draft=null;},
 'clear-signature':()=>pad.clear(),'clear-witness':()=>$('witness-pad').signature.clear(),
 'witness-stage':witnessStage,'single-witness':id=>{selected=new Set([id]);witnessStage();},
 'batch-preview':batchPreview,'back-batch':batchReview,'sign-batch-0':()=>signBatch(0),'sign-batch-1':()=>signBatch(1),
 'delete-doc':deleteDocument,
 'view-doc':id=>viewDocument(state.docs.find(d=>d.id===id)),
 'finalize-pdf':async id=>{await finalize(state.docs.find(d=>d.id===id));await persist();mainRender();},
 'download':()=>exportDocs(requireSelected(true)),
 'persist-storage':async()=>{const granted=await navigator.storage?.persist?.();tell(granted?'Armazenamento persistente concedido. Continue exportando os PDFs para Arquivos.':'O navegador controla a retenção. Salve os PDFs em Arquivos para manter sua cópia.');}
};
document.addEventListener('click',e=>{
 const nav=e.target.closest('[data-page]');if(nav&&!busy){page=nav.dataset.page;selected.clear();mainRender();window.scrollTo(0,0);return;}
 const b=e.target.closest('[data-action]');if(b&&actions[b.dataset.action])run(()=>actions[b.dataset.action](b.dataset.id));
});
window.addEventListener('beforeunload',e=>{if(busy||page==='voluntario'||page==='revisao'){e.preventDefault();e.returnValue='';}});
let offlineReady=false;
function updateConnection(){
 $('connection').textContent=navigator.onLine?'Conectado':'Sem internet';
 if($('offline-status'))$('offline-status').textContent=offlineReady?'Aplicativo e modelo disponíveis offline neste aparelho.':'Abra com internet e aguarde a preparação do modo offline.';
}
window.addEventListener('online',updateConnection);window.addEventListener('offline',updateConnection);
async function init(){
 state=await readState();const expired=expireDocs(state);if(expired)await persist();mainRender();
 if(expired)tell(`${expired} termo(s) com mais de 7 dias removido(s) deste navegador. Arquivos exportados não foram alterados.`);
 if('serviceWorker'in navigator){
  try{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;offlineReady=true;updateConnection();}catch{tell('Não foi possível preparar o modo offline. Mantenha internet e reabra o aplicativo.',true);}
 }
 if(!dismissed())openTour();
}
init().catch(e=>{$('main').innerHTML=heading('Não foi possível abrir o aplicativo')+`<p>${esc(e.message)}</p><p>Verifique o espaço do aparelho e use uma janela normal do Safari.</p>`;});
