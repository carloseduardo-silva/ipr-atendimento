-- Prazo prometido à paciente no momento em que ela entra na fila.
--
-- Motivação: até aqui o "tempo estimado" era recalculado a partir da posição
-- ATUAL da paciente. Como a posição cai conforme a fila anda, o prazo encolhia
-- sozinho: o cronômetro da sala de espera dava saltos para trás a cada paciente
-- chamada, e o alerta de atraso do painel media contra um alvo que se movia.
--
-- Gravando o horário previsto uma única vez, no INSERT, o prazo passa a ser um
-- instante absoluto: sobrevive a reload, a reordenação manual e a transferência
-- de médico. É a promessa feita à paciente, e é contra ela que o atraso é medido.

alter table public.pacientes_fila
  add column if not exists previsto_para timestamptz;

comment on column public.pacientes_fila.previsto_para is
  'Horário prometido na entrada: created_at + (posição na fila naquele instante × 5 min). Gravado uma vez no INSERT e nunca recalculado.';

-- Backfill das pacientes que já estão aguardando: usa a posição atual delas como
-- aproximação da posição de entrada. Não há como recuperar a posição original de
-- quem já está na fila, então este é o melhor palpite disponível — e só afeta as
-- linhas existentes, uma única vez.
with fila as (
  select
    id,
    created_at,
    row_number() over (partition by medico order by created_at) as posicao
  from public.pacientes_fila
  where status = 'aguardando'
)
update public.pacientes_fila as p
-- make_interval em vez de `posicao * interval '5 minutes'`: aquela forma depende
-- de um cast implícito bigint -> float8, e o ALTER acima já teria commitado se o
-- UPDATE falhasse, deixando a migração pela metade.
set previsto_para = fila.created_at + make_interval(mins => (fila.posicao * 5)::int)
from fila
where p.id = fila.id
  and p.previsto_para is null;
