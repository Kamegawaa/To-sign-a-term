# Termos da Obra
## Entrega 0.1
Página inicial, identidade visual de referência, guia da testemunha e modelo PDF. Não implementa ainda coleta de dados, assinaturas, offline, Drive ou e-mail. Sem afiliação técnica ao site de referência.
## Regras acordadas
- AJ = associação jurídica. AJ, modelo e início são selecionados por obra.
- Voluntários adultos: dados individuais e assinatura presencial uma vez por obra. Sem tutorial, com rótulos e placeholders e auxílio de testemunha.
- Administrador = testemunha. Tutorial dispensável, preferência persistida no navegador; reabrir em Ajuda.
- Depois dos voluntários, selecionar duas testemunhas e assinar individualmente ou em lote explicitamente confirmado por cada testemunha.
- Três assinaturas. Linha extra à esquerda permanece vazia. Texto legal original preservado. Remover somente comentário de revisão e destaque associado.
- Modelos separados do código de tela; preservar PDF base, mapear campos e assinaturas, versionar cada modelo.
- Preferir geração local e offline, testar no iPad real. App carregado previamente online. IndexedDB para dados, sem promessa de backup durável no navegador.
- PDF final individual ou lote. Salvar local, salvar e enviar ou somente enviar; cópia às testemunhas Gmail. Drive originalmente pedido, confirmar organização durante integração.
- Sete dias de retenção temporária, limpeza durante execução; arquivos exportados não são removidos. Usuário aceita risco de cache e verificará arquivos e emails.
- Próximas entregas: cadastro obra/AJ/testemunhas; preenchimento; captura assinaturas; PDF fiel; modo offline; integração Google e fila de envios.
## Arquitetura inicial
Site estático para primeiro marco publicado. Não implica escolha definitiva do backend. Integração Google exigirá serviço autenticado com credenciais fora do cliente. Site privado por padrão.
## Verificação pendente
Modelo exato/iPadOS; fidelidade dos PDFs preenchidos; nomes longos; três assinaturas; fluxo em lote; atualização do app e operação offline; OAuth Gmail/Drive.

## Entrega 0.2 — pacote para Vercel
Removidos os blocos promocionais indicados; rodapé independente com referências públicas. Coach Marks aponta apenas para elementos existentes, bloqueia o fundo, mantém navegação por teclado e respeita o skip anterior. Usuário fará criação do repositório e hospedagem; não publicar automaticamente esta entrega.

## Entrega 1.0 — candidato integrado para teste
Implementados cadastros, fluxo de voluntário, revisão e assinatura, testemunhas individual/lote, geração local do PDF, exportação PDF/ZIP, IndexedDB com retenção e fila Gmail/Drive. Integração Google usa GIS com token apenas em memória; para o uso em um aparelho, dispensa backend e segredo. Requer Client ID OAuth próprio configurado pelo responsável.

Parada solicitada pelo usuário para economizar tokens. Ver README e QA.md para separar o que foi implementado do que já foi validado. Continuar pela validação de lote e iPad, sem recomeçar o projeto.
