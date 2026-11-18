import {template} from './template.js';
import {formatCPF,formatCNPJ} from './core.js';
const labels={name:'Nome completo',civil:'Estado civil',profession:'Profissão',document:'Documento',cpf:'CPF',address:'Logradouro',number:'Número',district:'Bairro',city:'Cidade',uf:'UF',association:'Nome da AJ',headquarters:'Sede da AJ',witness1Name:'Nome da primeira testemunha',witness2Name:'Nome da segunda testemunha'};
let base;
async function source(){
  if(!base){const r=await fetch(template.url);if(!r.ok)throw Error('Modelo PDF indisponível. Abra o aplicativo com internet uma vez para preparar o modo offline.');base=await r.arrayBuffer();}
  return base.slice(0);
}
export function valuesFor(doc){
  const [sy,sm,sd]=doc.work.start.split('-'),[y,m,d]=doc.date.split('-');
  const names=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const ws=doc.witnesses||[{},{}];
  return {...doc.person,cpf:formatCPF(doc.person.cpf),association:doc.work.association.name,cnpj:formatCNPJ(doc.work.association.cnpj),headquarters:doc.work.association.address,
    startDay:sd,startMonth:sm,startYear:sy,signCity:doc.work.city,signUF:doc.work.uf,day:d,month:names[Number(m)-1],year:y,
    witness1Name:ws[0].name||'',witness1RG:ws[0].rg||'',witness1CPF:ws[0].cpf?formatCPF(ws[0].cpf):'',
    witness2Name:ws[1].name||'',witness2RG:ws[1].rg||'',witness2CPF:ws[1].cpf?formatCPF(ws[1].cpf):''};
}
export async function generatePDF(doc,{preview=false,blankSignature=false}={}) {
  if(!globalThis.PDFLib)throw Error('Biblioteca PDF indisponível. Reabra com internet para preparar o aplicativo.');
  const {PDFDocument,StandardFonts,rgb}=globalThis.PDFLib;
  const pdf=await PDFDocument.load(await source());
  const form=pdf.getForm(),font=await pdf.embedFont(StandardFonts.Helvetica),page=pdf.getPages()[0],values=valuesFor(doc);
  // Use os retângulos reais dos campos; remova os widgets e desenhe apenas nessas áreas.
  // O conteúdo estático original e a linha de assinatura extra permanecem intactos.
  const entries=[];
  for(const [key,name] of Object.entries(template.fields)){
    const field=form.getField(name),rect=field.acroField.getWidgets()[0].getRectangle();
    const text=String(values[key]||'');
    let size=Math.min(8.3,rect.height-1.5);
    try {while(size>6 && font.widthOfTextAtSize(text,size)>rect.width-2)size-=0.2;
      if(font.widthOfTextAtSize(text,size)>rect.width-2) throw Error('length');
    }catch(e){throw Error(`${labels[key]||key}: o texto não cabe no campo do modelo ou contém caracteres não suportados. Revise sem abreviar dados de identificação indevidamente.`);}
    entries.push({field,rect,text,size});
  }
  entries.forEach(({field})=>form.removeField(field));
  for(const {rect,text,size} of entries){
    if(text)page.drawText(text,{x:rect.x+1,y:rect.y+(rect.height-size)/2+0.5,font,size,color:rgb(0,0,0)});
  }
  // Sem árvore de campos editável no documento final.
  pdf.catalog.delete(PDFLib.PDFName.of('AcroForm'));
  const signs=[blankSignature?null:doc.volunteerSignature,...(doc.signatures||[])];
  for(let i=0;i<signs.length;i++){
    const sig=signs[i];if(!sig?.image)continue;
    const png=await pdf.embedPng(sig.image),rect=template.signatures[i],scale=Math.min(rect.width/png.width,rect.height/png.height);
    page.drawImage(png,{x:rect.x+(rect.width-png.width*scale)/2,y:rect.y+(rect.height-png.height*scale)/2,width:png.width*scale,height:png.height*scale});
  }
  if(preview)page.drawText('PRÉVIA - aguardando conclusão das assinaturas',{x:36,y:30,size:8,font,color:rgb(0.4,0.4,0.4)});
  pdf.setTitle('Termo de Adesão - '+doc.person.name);
  pdf.setSubject('Modelo '+template.id+' | Documento '+doc.id);
  pdf.setProducer('Termos da Obra');
  return pdf.save();
}
export async function hashBytes(bytes){
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
