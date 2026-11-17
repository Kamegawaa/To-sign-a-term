# Termos da Obra — v0.2.0
Projeto independente, estático, em HTML, CSS e JavaScript, sem dependências de instalação.

## Publicar na Vercel pelo GitHub
1. Extraia o ZIP.
2. Crie seu repositório no GitHub e envie o conteúdo da pasta `termos-da-obra`, incluindo `dist`, `docs`, `README.md` e `vercel.json`. Não envie somente o ZIP.
3. Na Vercel, importe esse repositório.
4. Use a raiz do repositório como Root Directory. Framework Preset: **Other**. Build Command: vazio. Output Directory: **dist**. O `vercel.json` já define essas opções.
5. Publique. Este pacote não depende do ChatGPT ou da hospedagem anterior.

A publicação na Vercel não foi realizada por este pacote. O controle de acesso da hospedagem anterior não é transferido; configure o acesso na Vercel conforme sua necessidade antes de usar dados reais.

## Abrir localmente
Com Python instalado, execute na raiz:

```sh
python -m http.server 8080 --directory dist
```

Abra http://localhost:8080. Não é necessário instalar Node ou executar npm install.

## O que funciona
- Página inicial responsiva e visual simplificado.
- Modelo PDF incluído, com texto original, 28 campos, linha extra vazia e comentário de revisão removido.
- Coach Marks com área destacada, fundo bloqueado, navegação por teclado, botão de pular e reabertura em Ajuda.
- Preferência do tutorial armazenada apenas neste navegador. Limpar os dados do navegador remove essa preferência.
- Rodapé independente com referências públicas, explicitamente identificadas como links do JW.ORG. Esses termos externos não são os termos deste aplicativo.

## Próximas etapas
Cadastro de obra, AJ e testemunhas; formulário com placeholders; assinaturas; PDF preenchido; offline; integração Gmail/Drive. Essas funções ainda não estão implementadas. Não há autenticação própria nem coleta de dados pessoais nesta versão.

## Acrescentar etapas ao tutorial
Edite `tourSteps` em `dist/app.js`. Cada entrada possui `target` (seletor CSS), `title` e `text`. Inclua apenas controles já implementados. Alvos ausentes ou ocultos são ignorados. Mantenha a chave de preferência para respeitar quem já pulou; novas etapas não devem abrir o guia automaticamente para essas pessoas.

## Estrutura
- dist/index.html: interface
- dist/styles.css: estilos
- dist/app.js: Coach Marks e conexão
- dist/assets/termo-adesao.pdf: modelo
- dist/assets/icon.svg: ícone independente
- docs/PROJECT.md: requisitos acordados
- vercel.json: configuração de publicação

Referência de implantação: https://vercel.com/docs/project-configuration/vercel-json
