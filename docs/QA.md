# Roteiro de teste e ponto de retomada

## Verificado
- `npm test`: 10 testes passando.
- PDF de teste renderizado e conferido. Modelo original e texto legal preservados, três assinaturas proporcionais, quarta linha vazia.
- Navegador: cadastrar AJ, preparar obra, preencher dados, visualizar prévia e salvar assinatura de voluntário fictício.

## Próximas verificações prioritárias
1. Cadastrar duas testemunhas com CPFs diferentes e e-mails de teste.
2. Gerar dois termos de voluntários diferentes, concluir a primeira testemunha em lote e a segunda individualmente. Abrir ambos os PDFs e conferir nomes, RGs, CPFs e assinaturas.
3. Testar recusa do mesmo CPF nas duas testemunhas e do voluntário como testemunha do próprio termo.
4. Salvar PDF individual e ZIP de dois termos no aplicativo Arquivos do iPad; abrir e conferir ambos.
5. Fechar e reabrir o aplicativo: dados e preferência de tutorial devem permanecer. Desligar a rede após preparação offline e repetir preenchimento, assinatura e geração.
6. Configurar OAuth Google, conectar o Gmail de teste e enviar um termo às testemunhas de teste. Conferir anexo, remetente, destinatários e recebimento real.
7. Ativar Drive, enviar e verificar arquivo privado em Meu Drive. Reprocessar fila para confirmar ausência de upload duplicado.
8. Simular perda de rede no envio: estado incerto exige conferência manual; não deve reenviar sozinho.
9. No iPad, girar a tela durante a assinatura: o traço deve permanecer. Testar nomes longos e impedir corte de texto no PDF.
10. Testar Coach Marks: pular, reabrir em Ajuda, recarregar e confirmar que não reaparece automaticamente. O voluntário não deve ver tutorial.

## Limites conhecidos
- Ainda sem validação integral de lote e Google real; candidato para testes, não liberação homologada.
- Não há login de administrador: o isolamento do voluntário é de interface. Quem usa este navegador tem acesso aos cadastros locais.
- Retenção dos termos: sete dias, limpeza ao abrir. Os cadastros permanecem.
- Upload Drive na raiz de Meu Drive, sem estrutura de pastas por obra nesta entrega.
- Apenas o modelo Manutenção SR/SA está configurado. Outros documentos exigem mapeamento.
- Não é assinatura por certificado digital; é desenho com confirmação e registro local.
