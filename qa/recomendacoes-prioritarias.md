# Recomendações Prioritárias de Arquitetura e Produto

Documento de especificações e diretrizes técnicas para as evoluções prioritárias do sistema de Gestão de Ativos da **MR PAY**.

---

## 1. Implementar Soft Delete (Exclusão Lógica)

- **Situação Atual:** A exclusão remove a linha física da tabela `assets` no Postgres (registrando histórico no `audit_logs`).
- **Recomendação:** Adicionar coluna `deleted_at timestamptz` para permitir restauração rápida e segura de ativos excluídos por engano.
- **Diretrizes Técnicas:**
  - Adicionar coluna `deleted_at timestamptz default null` na tabela `assets`.
  - Atualizar a view `assets_inventory` para filtrar por padrão registros com `where deleted_at is null`.
  - Adaptar a RLS e as RPCs (`clear_assets`, exclusão unitária) para setar `deleted_at = now()` em vez de `delete from assets`.
  - Disponibilizar interface administrativa com filtro "Lixeira / Ativos Excluídos" e ação de "Restaurar Ativo".

---

## 2. Módulo de Movimentação / Custódia

- **Situação Atual:** A alteração de local e conta cliente é feita diretamente no registro do ativo.
- **Recomendação:** Criar tabela `asset_movements` para registrar formalmente transferências de localidade, custodiantes e assinaturas/termos de entrega aos clientes.
- **Diretrizes Técnicas:**
  - Estrutura sugerida: `id`, `asset_id`, `origin_location`, `destination_location`, `client_account`, `responsible_user_id`, `movement_type` (entrega, devolução, manutenção, transferência interna), `receipt_url` / termo assinado, `notes`, `created_at`.
  - Gatilho ou função transacional para manter o estado atual em `assets` sincronizado com a última movimentação registrada.
  - Exportação e visualização de comprovante/termo de custódia em PDF ou formulário digital.

---

## 3. Leitura de Código de Barras / QR Code

- **Situação Atual:** A conferência e busca de ativos dependem de digitação manual de patrimônio ou número de série.
- **Recomendação:** Integrar leitor de câmera (`HTML5 QR Scanner` / `@zxing/library` / `html5-qrcode`) para auditoria e conferência física em campo via dispositivos móveis.
- **Diretrizes Técnicas:**
  - Adicionar componente de scanner com acesso à câmera do smartphone/tablet.
  - Gatilho de busca instantânea ou ação rápida ao ler o código (exibir detalhes, mudar status ou iniciar movimentação).
  - Suporte a geração de etiquetas com QR Code direto pela tela de inventário para impressão em massa.

---

## 4. Multi-tenant / Segregação por Filial

- **Situação Atual:** Visibilidade global controlada apenas por perfil (`admin` vs `operador`).
- **Recomendação:** Se a MR PAY operar filiais ou unidades independentes sem visibilidade cruzada, parametrizar `tenant_id` ou `branch_id` nas RLS policies do Supabase.
- **Diretrizes Técnicas:**
  - Adicionar `branch_id` ou `tenant_id` às tabelas `assets`, `profiles`, `audit_logs` e `asset_movements`.
  - Adicionar `user_branches` para suportar operadores com acesso a uma ou múltiplas filiais.
  - Ajustar policies RLS com funções auxiliares como `public.get_user_branch_ids()` para isolamento estrito de dados em nível de banco de dados.
