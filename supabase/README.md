# Configuração do Supabase

A primeira etapa do NEXA usa o Supabase para Auth, Postgres e RLS. As variáveis públicas do projeto já estão configuradas no ambiente do Web App como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Aplicar o banco

No Supabase, abra **SQL Editor → New query**, cole o conteúdo de [`schema.sql`](./schema.sql) e execute a migration inteira. Ela cria `profiles`, `assets`, a view `assets_inventory`, os índices de busca, os gatilhos de atualização, as policies RLS e os doze ativos de exemplo.

A aplicação consulta `assets_inventory`, não a tabela bruta. A migration revoga `select` direto em `assets` e mantém o campo `valor_aquisicao` nulo para operadores; a view só revela o valor quando `public.is_admin()` retorna verdadeiro.

## Primeiro acesso administrativo

Crie a primeira conta pelo botão **Entrar → Ainda não tenho acesso**. Depois de confirmar o e-mail, copie o UUID em **Authentication → Users** e execute no SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = '<uuid-do-usuario>';
```

A sessão deve ser encerrada e iniciada novamente para atualizar o perfil carregado na interface. Novas contas começam como `operador`.

## Permissões

Operadores autenticados podem consultar a view, inserir ativos e atualizar dados operacionais. Apenas administradores podem excluir registros e enxergar ou editar o valor de aquisição. O navegador usa somente a chave pública; nunca coloque `service_role` em variáveis `VITE_*` ou no código do cliente.
