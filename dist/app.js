import {VERSION,uid,today,escapeHTML as esc,validCPF,validCNPJ,validEmail,digits,formatCPF,formatCNPJ,filename,stateOf,witnessCheck,expireDocs,canSend} from './core.js';
import {readState,saveState} from './db.js';
import {generatePDF,hashBytes} from './pdf.js';
import {template} from './template.js';
import {signaturePad} from './signature.js';
import * as googleAPI from './google.js';
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
 const views={inicio:home,obras:works,aj:associations,testemunhas:witnesses,termos:documents,google:googleSettings,voluntario:volunteerForm,revisao:reviewVolunteer,recebido:received};
 $('main').innerHTML=views[page]();
 if(page==='revisao')pad=signaturePad($('volunteer-pad'));
 if(page==='google'&&navigator.onLine)googleAPI.loadGoogle().catch(e=>tell(e.message,true));
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
function witnesses(){return heading('Testemunhas','Cadastros reutilizáveis. Cada lote exige uma nova assinatura.',btn('new-witness','Cadastrar testemunha','primary'))+(state.witnesses.length?`<div class="card-list">${state.witnesses.map(w=>`<article class="panel"><h2>${esc(w.name)}</h2><p>RG ${esc(w.rg)} · CPF ${esc(formatCPF(w.cpf))}</p><p>${esc(w.email)}</p>${btn('edit-witness','Editar cadastro','secondary',w.id)}</article>`).join('')}</div>`:empty('Cadastre as duas testemunhas que acompanharão o atendimento.',btn('new-witness','Cadastrar testemunha','primary')));}
function deliveryText(d){
 const names={queued:'Na fila',sending:'Verificar envio',sent:'Aceito pelo Gmail',uncertain:'Verificar no Gmail',error:'Falhou',confirmed:'Confirmado por você'};
 const text=d.delivery?.email?names[d.delivery.email]||d.delivery.email:'Não solicitado';
 const drive=d.delivery?.drive==='done'?'Salvo':d.delivery?.drive==='queued'?'Pendente':d.delivery?.drive==='error'?'Falhou':'Não solicitado';
 return `<span>E-mail: ${esc(text)}</span><span>Drive: ${drive}</span>`;
}
function documents(){
 const docs=workDocs();
 return heading('Termos da obra','Selecione um termo ou um lote para conferir, assinar e exportar.',btn('start-volunteer','Novo termo','primary'))+workPicker()+
 (docs.length?`<section class="panel document-list"><div class="list-tools"><label class="check"><input id="select-all" type="checkbox" ${docs.every(d=>selected.has(d.id))?'checked':''}> Selecionar todos</label><span id="selection-count">${chosen().length} selecionado(s)</span></div>${docs.map(d=>`<article class="document-row"><label class="check"><input type="checkbox" data-select="${d.id}" ${selected.has(d.id)?'checked':''}><span><strong>${esc(d.person.name)}</strong><small>${esc(formatCPF(d.person.cpf))} · ${dateLabel(d.date)}</small></span></label><div class="doc-status"><span class="badge ${d.pdf?'success':''}">${stateOf(d)}</span><div class="delivery">${deliveryText(d)}</div></div><div class="actions">${btn('view-doc','Conferir','secondary',d.id)}${!d.pdf?btn('single-witness','Assinar','secondary',d.id):''}${d.signatures.every(Boolean)&&!d.pdf?btn('finalize-pdf','Gerar PDF','secondary',d.id):''}</div></article>`).join('')}<div class="batch-bar"><div class="actions">${btn('witness-stage','Assinar selecionados','primary')}${btn('download','Salvar no iPad')}${btn('save-send','Salvar e enviar')}${btn('queue-send','Enviar para Gmail')}${btn('process-queue','Processar fila')}</div><p class="small">Vários PDFs são salvos em um ZIP. No iPad, escolha “Salvar em Arquivos”. A fila só envia com o aplicativo aberto e a conta Google conectada.</p></div></section>`:empty('Esta obra ainda não tem termos.',btn('start-volunteer','Preencher primeiro termo','primary')));
}
function googleSettings(){return heading('Conexão Google','A conta é usada somente na etapa de envio.')+`<div class="main-grid"><section class="panel"><form id="google-form"><h2>Configurar integração</h2>${field('clientId','Client ID OAuth do Google','123456-…apps.googleusercontent.com',{value:state.settings.clientId,required:false,max:240,wide:true,hint:'Identificador público do tipo Aplicativo da Web. Nunca cole client secret ou senha.'})}<label class="check"><input name="drive" type="checkbox" ${state.settings.drive?'checked':''}> Salvar também uma cópia privada no Meu Drive</label><div class="actions"><button class="primary">Salvar configuração</button></div></form><hr><p>${googleAPI.connected()?'Conta conectada nesta sessão.':'Conta desconectada. Conecte com internet para processar os envios.'}</p><div class="actions">${btn('connect-google','Conectar Google','primary')}${btn('disconnect-google','Desconectar')}${btn('process-queue','Processar fila de envios')}</div><p class="small">A autorização fica apenas na memória e expira. Ao reabrir o aplicativo, conecte novamente. Nenhum PDF sai do aparelho antes de você solicitar o envio.</p></section><section class="panel"><h2>Configuração única</h2><ol class="setup-list"><li>Crie um projeto no <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud</a> e habilite Gmail API e Google Drive API.</li><li>Configure a tela de consentimento OAuth. Em modo de teste, inclua seu Gmail como usuário de teste.</li><li>Crie um Client ID OAuth do tipo Aplicativo da Web.</li><li>Adicione a origem autorizada <code>https://termosdeadesao.vercel.app</code>. Para testes locais, inclua a origem local.</li><li>Cole o Client ID ao lado, salve e conecte a conta. Autorize o envio e, se escolhido, o Drive.</li></ol><p class="small">Não é necessário client secret nem configurar variáveis na Vercel. As cópias do Drive ficam na raiz de Meu Drive, com obra, data e nome do voluntário no arquivo.</p><p class="small">A aceitação pelo Gmail não comprova a entrega na caixa do destinatário. Confirme o recebimento com as testemunhas.</p></section></div>`;}
function volunteerForm(){const work=currentWork();return heading('Dados do voluntário',esc(work.name)+' · '+esc(work.association.name),btn('exit-volunteer','Voltar à administração'))+`<form id="volunteer-form" class="panel"><p class="small">Preencha como consta nos seus documentos. Os campos com * são obrigatórios.</p><div class="form-grid">${field('name','Nome completo','Ex.: João da Silva',{max:140,wide:true})}${selectField('civil','Estado civil',['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','Separado(a)','União estável'])}${field('profession','Profissão','Ex.: eletricista, professor',{max:80})}${selectField('docType','Tipo de documento',['RG','CIN','CNH','RNM','CRNM'])}${field('document','Número do documento','Digite o número do documento escolhido',{max:30})}${field('cpf','CPF','000.000.000-00',{max:14,inputmode:'numeric'})}${field('address','Logradouro e complemento','Ex.: Rua das Flores, apartamento 12',{wide:true,max:220})}${field('number','Número','Ex.: 120 ou S/N',{max:12})}${field('district','Bairro','Ex.: Centro',{max:80})}${field('city','Cidade','Ex.: Itu',{max:100})}${selectField('uf','Estado (UF)',ufs,work.uf)}</div><label class="check consent"><input name="adult" type="checkbox" required> Confirmo que tenho 18 anos ou mais.</label><div class="actions"><button class="primary">Conferir termo e assinar →</button></div></form>`;}
function reviewVolunteer(){return heading('Confira e assine','Leia o termo antes de confirmar. As duas testemunhas serão identificadas na próxima etapa.',btn('back-volunteer','Corrigir dados'))+`<section class="panel"><div class="review-summary"><h2>${esc(draft.person.name)}</h2><p>${esc(formatCPF(draft.person.cpf))} · ${esc(draft.person.profession)}</p><p>${esc(draft.work.association.name)} · início ${dateLabel(draft.work.start)}</p><p>Local e data da assinatura: ${esc(draft.work.city)} / ${esc(draft.work.uf)}, ${dateLabel(draft.date)}</p></div><iframe class="pdf-frame" title="Prévia completa do termo" src="${draft.previewURL}"></iframe><a class="secondary" href="${draft.previewURL}" target="_blank" rel="noopener">Abrir prévia em tela inteira ↗</a><p class="small">Os campos das testemunhas ainda estão vazios. Seus dados e o texto do termo ficam preservados após esta assinatura.</p><form id="volunteer-sign"><h2>Sua assinatura</h2><p>Assine com o dedo ou caneta dentro da área abaixo.</p><canvas id="volunteer-pad" class="signature-pad" aria-label="Área para assinatura do voluntário"></canvas>${btn('clear-signature','Limpar assinatura')}<label class="check consent"><input name="consent" type="checkbox" required> Li o termo, conferi meus dados e concordo com seu conteúdo. Autorizo a inclusão posterior das duas testemunhas presentes e o envio de uma cópia a elas.</label><button class="primary">Confirmar assinatura e salvar termo</button></form></section>`;}
function received(){return heading('Termo do voluntário salvo','A assinatura foi guardada neste aparelho.')+`<section class="panel"><h2>${esc(draft?.person.name||'Voluntário')}</h2><p>As duas testemunhas ainda precisam conferir e assinar.</p><div class="actions">${btn('start-volunteer','Preencher novo termo','primary')}${btn('witness-stage','Finalizar testemunhas')}</div></section>`;}
function showModal(title,html){closeModal();$('modal-title').textContent=title;$('modal-body').innerHTML=html;$('modal').showModal();}
function closeModal(){modalCleanup?.();modalCleanup=null;modalURLs.forEach(URL.revokeObjectURL);modalURLs=[];if($('modal').open)$('modal').close();}
$('modal-close').onclick=()=>{if(!busy)closeModal();};$('modal').addEventListener('cancel',e=>{e.preventDefault();if(!busy)closeModal();});
function associationForm(id){const a=state.associations.find(x=>x.id===id)||{};showModal(a.id?'Editar associação':'Cadastrar associação',`<form id="aj-form" data-id="${a.id||''}"><div class="form-grid">${field('name','Nome da associação','Nome completo da associação jurídica',{value:a.name,wide:true,max:200})}${field('cnpj','CNPJ','00.000.000/0001-00',{value:a.cnpj,inputmode:'numeric',max:18})}${field('address','Endereço completo da sede','Rua, número, bairro, cidade e UF',{value:a.address,wide:true,max:240})}</div><p class="small">Alterações não modificam obras ou termos existentes. Se necessário, edite a obra para usar o cadastro atualizado nos próximos termos.</p><button class="primary">Salvar associação</button></form>`);}
function witnessForm(id){const w=state.witnesses.find(x=>x.id===id)||{};showModal(w.id?'Editar testemunha':'Cadastrar testemunha',`<form id="witness-form" data-id="${w.id||''}"><div class="form-grid">${field('name','Nome completo','Como consta no documento',{value:w.name,wide:true,max:140})}${field('rg','RG','Número do RG da testemunha',{value:w.rg,max:30})}${field('cpf','CPF','000.000.000-00',{value:w.cpf,max:14,inputmode:'numeric'})}${field('email','E-mail para receber a cópia','nome@exemplo.com',{value:w.email,type:'email',wide:true,max:160})}</div><p class="small">Os dados dos termos já vinculados não são alterados por esta edição.</p><button class="primary">Salvar testemunha</button></form>`);}
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
 showModal(doc.person.name,`<iframe class="pdf-frame" src="${url}" title="Documento de ${esc(doc.person.name)}"></iframe><a class="secondary" href="${url}" target="_blank" rel="noopener">Abrir PDF em tela inteira ↗</a><p class="small">${doc.pdf?'PDF final. SHA-256: '+esc(doc.hash):'Prévia: documento ainda não concluído.'}</p>${doc.witnesses?`<p class="small">Destinatários: ${doc.witnesses.map(w=>esc(w.email)).join(', ')}</p>`:''}${doc.delivery?.error?`<p class="error-text">${esc(doc.delivery.error)}</p>`:''}${['uncertain','sending'].includes(doc.delivery?.email)?`<div class="warning"><p>O resultado do envio é incerto. Confira a pasta Enviados do Gmail pelo nome do voluntário antes de tentar novamente.</p>${btn('confirm-email','Encontrei o envio no Gmail','secondary',doc.id)}${btn('retry-email','Conferi: não foi enviado','secondary',doc.id)}</div>`:''}${backToBatch?btn('back-batch','Voltar à lista de assinaturas','primary'):''}`);modalURLs.push(url);
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
async function queue(docs){
 for(const d of docs){
  d.delivery||={};
  if(!['sent','confirmed','sending','uncertain'].includes(d.delivery.email))d.delivery.email='queued';
  if(state.settings.drive&&d.delivery.drive!=='done')d.delivery.drive='queued';
 }
 await persist();tell(`${docs.length} termo(s) na fila. ${googleAPI.connected()&&navigator.onLine?'Pronto para processar.':'Conecte o Google com internet para enviar.'}`);
}
async function processQueue(){
 if(!navigator.onLine)throw Error('Sem internet. Os documentos continuam na fila.');
 if(!googleAPI.connected())throw Error('Abra Conexão Google e conecte sua conta antes de processar a fila.');
 const docs=state.docs.filter(d=>canSend(d)&&(d.delivery?.email==='queued'||d.delivery?.drive==='queued'||d.delivery?.drive==='error'));
 let sent=0,failed=0;
 for(const d of docs){
  if(!googleAPI.connected())break;
  if(d.delivery.drive==='queued'||d.delivery.drive==='error'){
   try{
    if(!d.delivery.driveId){d.delivery.driveId=await googleAPI.newDriveId();await persist();}
    const result=await googleAPI.uploadDrive(d);d.delivery.drive='done';d.delivery.driveURL=result.webViewLink||'';
   }catch(e){d.delivery.drive='error';d.delivery.error=e.message;failed++;}
   await persist();
  }
  if(d.delivery.email==='queued'){
   // Persista ANTES da chamada. Interrupção do app exige conferência manual, não reenvio automático.
   d.delivery.email='sending';await persist();
   try{const r=await googleAPI.sendEmail(d);d.delivery.email='sent';d.delivery.messageId=r.id;d.delivery.sentAt=Date.now();d.delivery.error='';sent++;}
   catch(e){d.delivery.email=e.definite?'error':'uncertain';d.delivery.error=e.message;failed++;}
   await persist();
  }
 }
 mainRender();tell(`Processamento concluído: ${sent} e-mail(s) aceito(s) pelo Gmail; ${failed} falha(s). Confira o status individual dos termos.`);
}
async function submit(form){
 const v=collect(form),id=form.dataset.id;
 if(form.id==='aj-form'){
  if(!validCNPJ(v.cnpj))throw Error('Confira o CNPJ da associação.');
  const duplicate=state.associations.find(a=>a.id!==id&&digits(a.cnpj)===digits(v.cnpj));if(duplicate)throw Error('Já existe uma AJ com esse CNPJ.');
  const a={id:id||uid(),name:v.name,cnpj:digits(v.cnpj),address:v.address};
  state.associations=id?state.associations.map(x=>x.id===id?a:x):[...state.associations,a];await persist();closeModal();mainRender();tell('Associação salva.');
 }else if(form.id==='witness-form'){
  if(!validCPF(v.cpf))throw Error('Confira o CPF da testemunha.');if(!validEmail(v.email))throw Error('Informe um e-mail válido.');
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
  draft={id:uid(),person:{...v,cpf:digits(v.cpf)},work:structuredClone(currentWork()),date:today(),createdAt:Date.now(),template:template.id,witnesses:null,signatures:[null,null],volunteerSignature:null,delivery:{}};
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
 }else if(form.id==='google-form'){
  if(v.clientId&&!/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(v.clientId))throw Error('O Client ID deve terminar em .apps.googleusercontent.com.');
  googleAPI.disconnect();state.settings={clientId:v.clientId,drive:v.drive==='on'};await persist();mainRender();tell('Configuração salva. Toque em Conectar Google.');
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
 'view-doc':id=>viewDocument(state.docs.find(d=>d.id===id)),
 'finalize-pdf':async id=>{await finalize(state.docs.find(d=>d.id===id));await persist();mainRender();},
 'download':()=>exportDocs(requireSelected(true)),
 'save-send':async()=>{const docs=requireSelected(true);await queue(docs);if(googleAPI.connected()&&navigator.onLine)await processQueue();mainRender();await exportDocs(docs);},
 'queue-send':async()=>{await queue(requireSelected(true));mainRender();if(googleAPI.connected()&&navigator.onLine)await processQueue();},
 'process-queue':processQueue,
 'connect-google':async()=>{await googleAPI.connect(state.settings.clientId,state.settings.drive);mainRender();tell('Google conectado. Toque em Processar fila para enviar as cópias solicitadas.');},
 'disconnect-google':()=>{googleAPI.disconnect();mainRender();tell('Conta desconectada deste aplicativo.');},
 'confirm-email':async id=>{const d=state.docs.find(d=>d.id===id);d.delivery.email='confirmed';d.delivery.error='';await persist();closeModal();mainRender();},
 'retry-email':async id=>{if(confirm('Você conferiu a pasta Enviados e não encontrou o documento? Um novo envio pode duplicar uma mensagem já entregue.')){const d=state.docs.find(d=>d.id===id);d.delivery.email='queued';d.delivery.error='';await persist();closeModal();mainRender();tell('Termo recolocado na fila.');}},
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
window.addEventListener('online',()=>{updateConnection();if(state?.settings.clientId)googleAPI.loadGoogle().catch(()=>{});});window.addEventListener('offline',updateConnection);
async function init(){
 state=await readState();const expired=expireDocs(state);let recovered=false;
 state.docs.forEach(d=>{if(d.delivery?.email==='sending'){d.delivery.email='uncertain';recovered=true;}});
 if(expired||recovered)await persist();mainRender();
 if(expired)tell(`${expired} termo(s) com mais de 7 dias removido(s) deste navegador. Arquivos exportados não foram alterados.`);
 if('serviceWorker'in navigator){
  try{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;offlineReady=true;updateConnection();}catch{tell('Não foi possível preparar o modo offline. Mantenha internet e reabra o aplicativo.',true);}
 }
 if(!dismissed())openTour();
}
init().catch(e=>{$('main').innerHTML=heading('Não foi possível abrir o aplicativo')+`<p>${esc(e.message)}</p><p>Verifique o espaço do aparelho e use uma janela normal do Safari.</p>`;});
