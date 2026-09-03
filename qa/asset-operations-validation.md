# Validação da ampliação operacional

## Escopo validado

A navegação foi reorganizada para exibir **Visão geral** antes de **Inventário**, e o item **Logs** permanece visível somente para administradores. A importação aceita `.xlsx`, `.xls` e `.csv`, apresenta prévia, valida os campos obrigatórios e armazena colunas não reconhecidas em `extra_data`. A confirmação usa a função transacional `replace_assets`, que restaura automaticamente a base anterior se qualquer registro falhar.

A exportação gera XLSX com todos os registros correspondentes aos filtros ativos, cabeçalho formatado, autofiltro e cores semânticas de status. O valor de aquisição é incluído somente para administradores. A limpeza remove apenas ativos; perfis e logs permanecem preservados.

## Segurança e banco

As migrations do projeto Supabase `meooqsoivjwxejtzxaem` foram aplicadas com sucesso. As funções `clear_assets` e `replace_assets` foram confirmadas no catálogo. O hardening moveu as operações privilegiadas para o schema privado, manteve wrappers públicos como `SECURITY INVOKER`, revogou execução de `anon` e converteu `assets_inventory` para `security_invoker = true`, sem conceder leitura direta de `valor_aquisicao`.

Após o hardening, o advisor de segurança não reportou alertas para a view, RLS ou RPCs desta ampliação. Permaneceu apenas a recomendação de produto para ativar a proteção contra senhas vazadas no painel Supabase Auth.

## Testes e build

O TypeScript foi aprovado. A suíte Vitest concluiu **35 testes em 15 arquivos**, cobrindo mapeamento CSV/Excel, campos extras, exportação por perfil, menu Logs, ordem da navegação, logout e fluxos existentes. O build de produção e `pnpm install --frozen-lockfile` foram aprovados. O build mantém um aviso não bloqueante de bundle acima de 500 kB.

## Validação visual

A tela inicial foi revisada em desktop `1440 × 1000` e mobile `390 × 844`. O card, a logo, a mensagem, o carrossel, os dots e o CTA permaneceram legíveis e sem cortes. Os controles autenticados foram validados por testes de UI; a sessão do navegador de preview não estava autenticada durante as capturas finais.
