-- Remoção de vendedores pelo sistema (aba Gestão do /rodizio) como soft delete.
--
-- Um DELETE de verdade não serve: `atendimentos_vendas.vendedor_id` aponta para
-- `vendedores_rodizio`, então quem já atendeu alguém não poderia ser apagado — e
-- apagar o histórico junto distorceria a produção registrada. Desativar tira o
-- vendedor da fila e das telas e mantém os atendimentos intactos.

alter table public.vendedores_rodizio
  add column if not exists ativo boolean not null default true;

comment on column public.vendedores_rodizio.ativo is
  'false = removido do rodízio pela gerência. Some da fila e das telas, mas o histórico em atendimentos_vendas é mantido.';
