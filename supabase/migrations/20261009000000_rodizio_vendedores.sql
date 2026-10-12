-- Rodízio de vendedores (rota /rodizio): vínculo com o login e Realtime.
--
-- As tabelas `vendedores_rodizio` e `atendimentos_vendas` foram criadas pelo
-- painel do Supabase. Esta migração acrescenta só o que a tela precisa para
-- funcionar com segurança entre vários celulares ao mesmo tempo.

-- Cada vendedor entra com o próprio login: a tela casa o e-mail da sessão com
-- esta coluna para saber de quem é a seção "Seu Status Atual". Preencha depois
-- da migração, por exemplo:
--   update public.vendedores_rodizio set email = 'fulana@exemplo.com' where nome = 'Fulana';
alter table public.vendedores_rodizio
  add column if not exists email text unique;

comment on column public.vendedores_rodizio.email is
  'E-mail do login (Supabase Auth) do vendedor. A tela /rodizio usa para identificar o vendedor logado.';

-- No máximo um atendimento aberto por vendedor. O front já se protege com
-- updates condicionais, mas um duplo clique ou dois aparelhos do mesmo vendedor
-- ainda poderiam inserir dois registros `em_andamento` no mesmo instante.
create unique index if not exists atendimentos_vendas_um_em_andamento
  on public.atendimentos_vendas (vendedor_id)
  where status = 'em_andamento';

-- Sem entrar na publicação `supabase_realtime`, os eventos postgres_changes não
-- disparam e as outras telas só atualizariam no reload. O `if not exists`
-- manual torna a migração idempotente (ALTER PUBLICATION não tem essa opção).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'vendedores_rodizio'
  ) then
    alter publication supabase_realtime add table public.vendedores_rodizio;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'atendimentos_vendas'
  ) then
    alter publication supabase_realtime add table public.atendimentos_vendas;
  end if;
end
$$;
