# Validação autenticada após sincronização

O preview reconheceu uma sessão autenticada com perfil administrativo: os controles de criação de usuário ficaram visíveis, o rodapé indicou administrador conectado e a tabela passou a exibir o estado “Sincronizado com Supabase”. A leitura protegida carregou registros reais, incluindo valor de aquisição visível apenas no contexto admin.

A validação de escrita será feita alterando somente o campo operacional `Local` de um ativo, sem tocar em valor de aquisição, senha ou outros dados sensíveis.

O ativo `MR PAY 0002` foi aberto com dados reais e o formulário exibiu o botão `Salvar alterações`; o valor de aquisição permaneceu visível no contexto admin. A ação controlada será alterar somente `Local`.

O painel lateral foi rolado até o fim e o botão `Salvar alterações` ficou identificado no rodapé fixo; o campo `Local` foi preparado para a alteração de validação.

O ativo alvo foi reaberto com sucesso no preview autenticado. O primeiro clique coordenado fechou o Sheet sem evidenciar o PATCH; a segunda abertura por evento DOM confirmou que o fluxo pode ser repetido com precisão.

O campo `Local` foi alterado para uma marca de sincronização operacional e o botão real `Salvar alterações` foi acionado pelo DOM da interface autenticada. Falta apenas confirmar o retorno visual e a persistência da alteração na nova leitura.

Validação concluída: após o salvamento, o Sheet permaneceu aberto com o botão alterado para `Fechar`, e a tabela recarregada exibiu `São Paulo / SP · validação protegida` para o ativo `MR PAY 0002`. Isso confirma leitura autenticada e escrita operacional protegida com sessão admin.
