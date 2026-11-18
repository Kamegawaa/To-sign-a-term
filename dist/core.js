export const VERSION = '1.0.0';
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
export const digits = value => String(value || '').replace(/\D/g, '');
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validEmail = value => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
export function validCPF(value) {
  const n = digits(value);
  if (!/^\d{11}$/.test(n) || /^(\d)\1{10}$/.test(n)) return false;
  for (let length=9;length<11;length++) {
    const sum = [...n.slice(0,length)].reduce((s,d,i) => s + Number(d)*(length+1-i),0);
    const check = (sum * 10) % 11 % 10;
    if(check !== Number(n[length])) return false;
  }
  return true;
}
export function validCNPJ(value) {
  const n = digits(value);
  if(!/^\d{14}$/.test(n) || /^(\d)\1{13}$/.test(n)) return false;
  for(let size=12;size<14;size++) {
    let weight=size-7, sum=0;
    for(let i=0;i<size;i++){sum+=Number(n[i])*weight;weight=weight===2?9:weight-1;}
    const r=sum%11, check=r<2?0:11-r;
    if(check!==Number(n[size]))return false;
  }
  return true;
}
export function formatCPF(value) { return digits(value).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'); }
export function formatCNPJ(value) { return digits(value).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'); }
export function filename(doc) {
  const clean = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'_').slice(0,55);
  return `termoAdesao_${clean(doc.work.name)}_${doc.date}_${clean(doc.person.name)}_${doc.id.slice(0,8)}.pdf`;
}
export function stateOf(doc) {
  if(doc.pdf) return 'Concluído';
  const count=doc.signatures.filter(Boolean).length;
  return count===2?'Gerar PDF final':count===1?'Falta 1 testemunha':'Aguardando testemunhas';
}
export function witnessCheck(doc, witnesses) {
  if(witnesses.length!==2 || witnesses.some(w=>!w)) throw Error('Selecione duas testemunhas.');
  if(digits(witnesses[0].cpf)===digits(witnesses[1].cpf)) throw Error('As testemunhas precisam ser pessoas diferentes.');
  if(witnesses.some(w=>digits(w.cpf)===digits(doc.person.cpf))) throw Error(`${doc.person.name}: o voluntário não pode ser testemunha do próprio termo.`);
  if(doc.witnesses && doc.witnesses.some((w,i)=>digits(w.cpf)!==digits(witnesses[i].cpf))) throw Error('As testemunhas deste termo já estão definidas.');
}
export function initialState() { return {revision:0, associations:[], witnesses:[], works:[], docs:[], activeWork:'', settings:{clientId:'',drive:false}}; }
export function expireDocs(state, now=Date.now()) {
  const expired=state.docs.filter(d=>now-d.createdAt>=RETENTION_MS);
  state.docs=state.docs.filter(d=>now-d.createdAt<RETENTION_MS);
  return expired.length;
}
export function canSend(doc) { return Boolean(doc.pdf && doc.signatures.every(Boolean) && doc.witnesses?.length===2); }
