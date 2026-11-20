import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as PDFLib from 'pdf-lib';
import {generatePDF,hashBytes} from '../dist/pdf.js';
globalThis.PDFLib=PDFLib;
globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new Uint8Array(await fs.readFile('dist/assets/termo-adesao.pdf')).buffer});
const img='data:image/png;base64,'+await fs.readFile('tests/signature-test.png','base64');
const fixture={id:'00000000-0000-4000-8000-000000000001',date:'2026-11-17',template:'manutencao-sr-sa-v1',person:{name:'João da Silva — TESTE',civil:'Casado(a)',profession:'Eletricista',docType:'RG',document:'12.345.678-9',cpf:'52998224725',address:'Rua de Teste, apartamento 12',number:'100',district:'Centro',city:'Itu',uf:'SP'},work:{name:'Salão de Teste',city:'Itu',uf:'SP',start:'2026-11-17',association:{name:'Associação Exemplo de Teste',cnpj:'11222333000181',address:'Rua Exemplo, 100, Centro, Itu - SP'}},witnesses:[{name:'Testemunha Um — TESTE',rg:'12345678',cpf:'12345678909',email:'witness1@example.com'},{name:'Testemunha Dois — TESTE',rg:'98765432',cpf:'11144477735',email:'witness2@example.com'}],volunteerSignature:{image:img},signatures:[{image:img},{image:img}]};
test('generate original single-page static PDF with three signatures',async()=>{
 const bytes=await generatePDF(fixture);assert.ok(bytes.length>10000);
 const pdf=await PDFLib.PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),1);
 assert.equal(pdf.catalog.has(PDFLib.PDFName.of('AcroForm')),false);
 const annots=pdf.getPages()[0].node.Annots();
 for(let i=0;i<(annots?.size()||0);i++)assert.notEqual(pdf.context.lookup(annots.get(i)).get(PDFLib.PDFName.of('Subtype'))?.toString(),'/Widget');
 await fs.mkdir('tmp',{recursive:true});await fs.writeFile('tmp/termo-teste.pdf',bytes);
 const hash=await hashBytes(bytes);assert.match(hash,/^[a-f0-9]{64}$/);
});
test('preview accepts pending witnesses and no volunteer signature',async()=>{
 const bytes=await generatePDF({...fixture,witnesses:null,signatures:[null,null],volunteerSignature:null},{preview:true});
 assert.ok(bytes.length>10000);
});
test('long identification fields fail instead of silent truncation',async()=>{
 await assert.rejects(()=>generatePDF({...fixture,person:{...fixture.person,name:'Nome excessivamente longo '.repeat(40)}}),/não cabe/);
});
test('unsupported characters produce a readable error',async()=>{
 await assert.rejects(()=>generatePDF({...fixture,person:{...fixture.person,name:'Teste 😀'}}),/não cabe/);
});
