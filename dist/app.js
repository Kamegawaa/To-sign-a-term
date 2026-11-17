'use strict';
// Acrescente uma etapa somente quando seu alvo existir e a função estiver disponível.
// O skip é global: novas etapas não reativam automaticamente um tutorial dispensado.
const tourSteps = [
  { target: '#flow-title', title: 'O atendimento da obra', text: 'Aqui você consulta as etapas do atendimento. Nesta entrega, a página apresenta o fluxo; o cadastro e as assinaturas ainda serão implementados.' },
  { target: '#model-link', title: 'Confira o modelo do termo', text: 'Este botão abre o PDF base em outra aba. O texto original está preservado. Você pode abri-lo agora ou avançar no guia.' },
  { target: '#help', title: 'Reabra o guia quando precisar', text: 'Use Ajuda para rever este tutorial. Ao concluir ou pular, ele deixa de abrir automaticamente neste navegador. Novas orientações serão acrescentadas conforme as funções ficarem disponíveis.' }
];
const key = 'termos-obra:tutorial-adm:v1';
const $ = id => document.getElementById(id);
let steps = [], current = 0, active = false, target, previousFocus, oldOverflow, frame;
function dismissed() { try { return localStorage.getItem(key) === 'true'; } catch { return false; } }
function box(id, x, y, width, height) {
  Object.assign($(id).style, { left: x+'px', top: y+'px', width: Math.max(0,width)+'px', height: Math.max(0,height)+'px' });
}
function position() {
  if (!active || !target?.isConnected) return;
  const r = target.getBoundingClientRect(), w = document.documentElement.clientWidth, h = window.innerHeight;
  const x = Math.max(0,r.left-5), y = Math.max(0,r.top-5), right = Math.min(w,r.right+5), bottom = Math.min(h,r.bottom+5);
  box('shade-top',0,0,w,y); box('shade-bottom',0,bottom,w,h-bottom);
  box('shade-left',0,y,x,bottom-y); box('shade-right',right,y,w-right,bottom-y);
  box('coach-ring',x,y,right-x,bottom-y);
  const card = $('coach-card'), height = card.offsetHeight, width = card.offsetWidth;
  const below = bottom+12, above = y-height-12;
  const top = below+height <= h-12 ? below : above >= 12 ? above : Math.max(12,h-height-12);
  card.style.top = top+'px';
  card.style.left = Math.min(Math.max(12,x),Math.max(12,w-width-12))+'px';
}
function schedulePosition() { cancelAnimationFrame(frame); frame=requestAnimationFrame(position); }
function render() {
  const step = steps[current]; target = document.querySelector(step.target);
  $('coach-count').textContent = `${current+1} DE ${steps.length}`;
  $('coach-title').textContent = step.title; $('coach-text').textContent = step.text;
  $('prev').disabled=current===0; $('next').textContent=current===steps.length-1?'Concluir':'Próximo →';
  $('coach-progress').replaceChildren(...steps.map((_,i)=>{const bar=document.createElement('i');if(i<=current)bar.className='active';return bar}));
  target.scrollIntoView({block:'center',behavior:'instant'});
  position(); $('coach-card').focus({preventScroll:true}); schedulePosition();
}
function openTour() {
  if(active)return;
  steps=tourSteps.filter(step=>{const el=document.querySelector(step.target);return el&&el.getClientRects().length});
  if(!steps.length)return;
  previousFocus=document.activeElement; oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden'; active=true;current=0;$('coach').hidden=false;render();
}
function closeTour() {
  try {localStorage.setItem(key,'true')}catch{}
  active=false;$('coach').hidden=true;document.body.style.overflow=oldOverflow;
  previousFocus?.focus({preventScroll:true});
}
$('help').onclick=openTour;$('footer-help').onclick=openTour;$('skip').onclick=closeTour;
$('prev').onclick=()=>{if(current>0){current--;render()}};
$('next').onclick=()=>{if(current===steps.length-1)closeTour();else{current++;render()}};
// Fundo bloqueado inclusive para cliques fora do alvo; alvo e controles do guia permanecem ativos.
document.addEventListener('click',event=>{
 if(active&&!$('coach-card').contains(event.target)&&!target.contains(event.target)){event.preventDefault();event.stopImmediatePropagation()}
},true);
document.addEventListener('keydown',event=>{
 if(!active)return;
 if(event.key==='Escape'){event.preventDefault();closeTour();return}
 if(event.key!=='Tab')return;
 const selectors='a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';
 const controls=[...(target.matches(selectors)?[target]:[]),...target.querySelectorAll(selectors),...$('coach-card').querySelectorAll(selectors)].filter(el=>el.getClientRects().length);
 const index=controls.indexOf(document.activeElement);
 const next=event.shiftKey?(index<=0?controls.length-1:index-1):(index+1)%controls.length;
 event.preventDefault();controls[next]?.focus();
});
window.addEventListener('resize',schedulePosition);window.addEventListener('scroll',schedulePosition,true);
window.visualViewport?.addEventListener('resize',schedulePosition);
function connection(){$('connection').textContent=navigator.onLine?'Conectado':'Sem conexão'}
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
if(!dismissed())openTour();
