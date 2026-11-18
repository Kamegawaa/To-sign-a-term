# Termos da Obra — v1.0.0 (candidato para teste)
Aplicativo independente para atendimento presencial no iPad. Não possui vínculo com JW.ORG. Os dados pessoais ficam no IndexedDB do navegador. Não há banco de dados remoto ou servidor de autenticação.

## Fluxo implementado
1. Cadastre uma associação jurídica (AJ).
2. Prepare uma obra com AJ, modelo, cidade, UF e início do serviço.
3. Preencha os dados de cada voluntário adulto, confira a prévia do PDF e colha a assinatura.
4. Cadastre as duas testemunhas (nome, RG, CPF e e-mail).
5. Na lista de termos, selecione um ou vários. Confira os documentos e colha as duas assinaturas com confirmação explícita do conjunto.
6. Exporte um PDF ou um ZIP com os PDFs. Escolha também enviar as cópias pelo Gmail e, opcionalmente, para o Meu Drive.

O modelo original permanece separado em `dist/assets/termo-adesao.pdf`; campos e posições das assinaturas ficam em `dist/template.js`. Texto original preservado; linha extra à esquerda do voluntário fica vazia. Novos modelos exigem novo arquivo, mapeamento e validação, não apenas upload arbitrário.

## Publicação
Repositório ligado à Vercel, branch de produção `main`, framework **Other**, saída **dist**, comando de build vazio. As bibliotecas locais necessárias estão incluídas em `dist/vendor` com suas licenças. Não é necessário configurar secrets na Vercel.

Para desenvolvimento: `npm ci`, `npm test`, `npm run build` (atualiza as cópias locais das bibliotecas). Sirva `dist` por HTTP local ou HTTPS. Não abra por `file://`.

## iPad e offline
Abra a URL com internet e aguarde “Aplicativo e modelo disponíveis offline”. Adicione à Tela de Início pelo Safari. Use sempre a mesma origem e modo de abertura, pois o armazenamento pode diferir entre Safari e aplicativo instalado.

O service worker armazena a interface, bibliotecas e modelo, sem cachear Google ou PDFs pessoais. Uma atualização aguarda o fechamento das abas; não interrompe o atendimento. Incremente a versão do cache em `dist/sw.js` em toda publicação que altere arquivos da interface. Os documentos temporários expiram após sete dias, com limpeza ao abrir o aplicativo. Cadastros de AJ, obra e testemunhas permanecem. Arquivos exportados para Arquivos não são apagados. A persistência do navegador não substitui a exportação.

Os termos assinados não são editados. Alterações cadastrais só afetam novos documentos. A assinatura do voluntário informa que as testemunhas serão incluídas posteriormente. O PDF final e seu SHA-256 são guardados para que exportação e envio usem os mesmos bytes.

## Google: configuração externa ainda necessária
A integração utiliza o modelo de token do Google Identity Services, diretamente no navegador. O Client ID é público; nunca inserir client secret. O token fica somente na memória da sessão, sem localStorage, IndexedDB ou repositório.

1. Crie um projeto no Google Cloud e habilite Gmail API e Google Drive API.
2. Configure a tela de consentimento; no modo de teste, cadastre seu Gmail como usuário de teste.
3. Crie credencial OAuth de tipo Aplicativo da Web.
4. Em origens JavaScript autorizadas, inclua `https://termosdeadesao.vercel.app`. Para prévias da Vercel, cada origem utilizada também precisa estar autorizada.
5. Na tela Conexão Google do app, cole o Client ID e salve. Conecte a conta e autorize `gmail.send` e, opcionalmente, `drive.file`.
6. Processe a fila com internet e aplicativo aberto. Reautorize quando o token expirar.

Um e-mail por termo é enviado às duas testemunhas, com PDF anexo. Upload opcional na raiz de Meu Drive, privado por padrão. Não existe processamento em segundo plano com o aplicativo fechado. A fila deve ser processada explicitamente; reconectar internet não dispara mensagens sozinho.

O Drive usa ID reservado antes do upload para permitir recuperação sem duplicação. Resultado incerto de envio Gmail é bloqueado até conferência manual na pasta Enviados. “Aceito pelo Gmail” não comprova entrega ao destinatário.

## Verificação desta entrega
- 10 testes automatizados passando: documentos, validações CPF/CNPJ, escape de HTML, cabeçalhos de e-mail, retenção e restrições de testemunhas.
- PDF gerado e renderizado para inspeção: uma página, acentos, campos, três assinaturas de teste e linha extra vazia. Nenhum campo Widget editável no PDF final.
- Testado pelo navegador: cadastro de AJ e obra, formulário do voluntário, prévia e gravação de assinatura fictícia.
- Ainda não validado de ponta a ponta: testemunhas em lote na interface, exportação no iPad real, abertura sem rede no iPad e envio real Gmail/Drive (falta configuração OAuth da conta).

## Ponto de retomada
Entrega interrompida por solicitação do usuário para disponibilizar o trabalho já feito. Antes de uso com dados reais, executar `docs/QA.md`. Não adicionar dados pessoais de teste ou PDFs assinados ao Git. Arquivos em `tmp/` são ignorados.

Referências: https://developers.google.com/identity/oauth2/web/guides/use-token-model | https://developers.google.com/workspace/gmail/api/guides/sending | https://developers.google.com/workspace/drive/api/guides/manage-uploads
