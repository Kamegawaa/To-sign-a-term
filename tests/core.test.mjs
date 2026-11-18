import test from 'node:test';
import assert from 'node:assert/strict';
import {validCPF,validCNPJ,validEmail,escapeHTML,filename,witnessCheck,expireDocs,initialState,RETENTION_MS,canSend} from '../dist/core.js';
test('CPF and CNPJ reject repeated digits and incorrect checksums',()=>{
 assert.equal(validCPF('529.982.247-25'),true);assert.equal(validCPF('52998224726'),false);assert.equal(validCPF('11111111111'),false);
 assert.equal(validCNPJ('11.222.333/0001-81'),true);assert.equal(validCNPJ('11222333000182'),false);
});
test('email headers cannot contain injection or multiple recipients',()=>{
 assert.equal(validEmail('test@example.com'),true);for(const bad of ['a@b.com\r\nBcc:c@d.com','a@b.com,c@d.com','<a@b.com>'])assert.equal(validEmail(bad),false);
});
test('escape markup and sanitize unique PDF filenames',()=>{
 assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
 const name=filename({id:'12345678-abcd',date:'2026-11-17',person:{name:'João / Silva'},work:{name:'Obra <teste>'}});
 assert.match(name,/^termoAdesao_Obra_teste__2026-11-17_Joao_Silva_12345678.pdf$/);
});
test('witness identity cannot repeat or match volunteer',()=>{
 const doc={person:{cpf:'52998224725'}},ws=[{cpf:'12345678909'},{cpf:'11144477735'}];
 witnessCheck(doc,ws);assert.throws(()=>witnessCheck(doc,[ws[0],ws[0]]));assert.throws(()=>witnessCheck(doc,[ws[0],{cpf:doc.person.cpf}]));
 doc.witnesses=ws;assert.throws(()=>witnessCheck(doc,[ws[1],ws[0]]));
});
test('expire documents at seven days, preserving registrations',()=>{
 const s=initialState(),now=RETENTION_MS+100;s.associations=[{name:'Teste'}];s.docs=[{createdAt:100},{createdAt:101}];
 assert.equal(expireDocs(s,now),1);assert.equal(s.docs.length,1);assert.equal(s.associations.length,1);
});
test('cannot send incomplete document',()=>{
 assert.equal(canSend({pdf:null,signatures:[{},{}]}),false);assert.equal(canSend({pdf:new Uint8Array(1),signatures:[{},null],witnesses:[{},{}]}),false);
 assert.equal(canSend({pdf:new Uint8Array(1),signatures:[{},{}],witnesses:[{},{}]}),true);
});
