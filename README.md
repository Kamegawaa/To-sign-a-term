# Termos da Obra — v1.0.0
Aplicativo independente para atendimento presencial no iPad. Não possui vínculo com JW.ORG. Os dados pessoais ficam no IndexedDB do navegador. Não há banco de dados remoto ou servidor de autenticação.

## Fluxo implementado
1. Cadastre uma associação jurídica (AJ).
2. Prepare uma obra com AJ, modelo, cidade, UF e início do serviço.
3. Cadastre as duas testemunhas com nome, RG e CPF.
4. Em Termos, preencha os dados do voluntário, confira a prévia e colha sua assinatura.
5. Selecione os termos e colha as assinaturas das duas testemunhas.
6. Abra o PDF no navegador ou salve em Arquivos. Ao selecionar vários termos, o aplicativo prepara um ZIP.

O modelo original permanece separado em `dist/assets/termo-adesao.pdf`; campos e posições das assinaturas ficam em `dist/template.js`. Texto original preservado; linha extra à esquerda do voluntário fica vazia. Novos modelos exigem novo arquivo, mapeamento e validação, não apenas upload arbitrário.

## Publicação
Repositório ligado à Vercel, branch de produção `main`, framework **Other**, saída **dist**, comando de build vazio. As bibliotecas locais necessárias estão incluídas em `dist/vendor` com suas licenças. Não é necessário configurar secrets na Vercel.

Para desenvolvimento: `npm ci`, `npm test`, `npm run build` (atualiza as cópias locais das bibliotecas). Sirva `dist` por HTTP local ou HTTPS. Não abra por `file://`.

## iPad e offline
Abra a URL com internet e aguarde “Aplicativo e modelo disponíveis offline”. Adicione à Tela de Início pelo Safari. Use sempre a mesma origem e modo de abertura, pois o armazenamento pode diferir entre Safari e aplicativo instalado.

O service worker armazena a interface, bibliotecas e modelo, sem incluir PDFs pessoais. Ao receber uma atualização, o navegador baixa os arquivos antes de ativá-la. A próxima abertura ou recarga usa a versão atualizada. Incremente a versão do cache em `dist/sw.js` em toda publicação que altere arquivos da interface. Os documentos temporários expiram após sete dias, com limpeza ao abrir o aplicativo. Cadastros de AJ, obra e testemunhas permanecem. Arquivos exportados para Arquivos não são apagados. A persistência do navegador não substitui a exportação.

Os termos assinados não são editados. Alterações cadastrais só afetam novos documentos. A assinatura do voluntário informa que as testemunhas serão incluídas posteriormente. O PDF final e seu SHA-256 são guardados para conferência e exportação.
