import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  atendimentoAberto,
  atendimentosHoje,
  emAtendimento,
  emPausa,
  formatDuracao,
  sortFila,
  statusEmoji,
  statusLabel,
  type RodizioSnapshot,
} from "@/lib/rodizio-store";

interface RodizioQueueProps {
  snapshot: RodizioSnapshot;
  now: number;
  /** Id do vendedor logado, para destacar a própria linha. */
  meuId: string | null;
}

/** Visão transparente da fila: disponíveis em ordem, ocupados e ausentes. */
export function RodizioQueue({ snapshot, now, meuId }: RodizioQueueProps) {
  const { vendedores, atendimentos } = snapshot;
  const fila = sortFila(vendedores);
  const ocupados = emAtendimento(vendedores);
  const pausados = emPausa(vendedores);

  return (
    <div className="space-y-5">
      <Section
        title="🟢 Fila do Rodízio"
        count={fila.length}
        empty="Ninguém disponível no momento."
      >
        {fila.map((v, index) => (
          <Row key={v.id} highlight={v.id === meuId} accent={index === 0}>
            <span
              className={cn(
                "flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 text-sm font-semibold",
                index === 0
                  ? "bg-success text-success-foreground"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {index + 1}º
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {v.nome}
                {v.id === meuId ? <span className="text-muted-foreground"> (você)</span> : null}
              </p>
              {index === 0 ? (
                <p className="text-xs font-medium text-success">Próximo a atender</p>
              ) : null}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {atendimentosHoje(atendimentos, v.id)} hoje
            </span>
          </Row>
        ))}
      </Section>

      <Section
        title="🔴 Em Atendimento"
        count={ocupados.length}
        empty="Nenhum atendimento em andamento."
      >
        {ocupados.map((v) => {
          const aberto = atendimentoAberto(atendimentos, v.id);
          return (
            <Row key={v.id} highlight={v.id === meuId}>
              <p className="min-w-0 flex-1 truncate font-medium text-foreground">{v.nome}</p>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {aberto ? `há ${formatDuracao(now - Date.parse(aberto.inicio_atendimento))}` : "—"}
              </span>
            </Row>
          );
        })}
      </Section>

      <Section title="🟡 Em Pausa / Almoço" count={pausados.length} empty="Todos estão na loja.">
        {pausados.map((v) => (
          <Row key={v.id} highlight={v.id === meuId}>
            <p className="min-w-0 flex-1 truncate font-medium text-foreground">{v.nome}</p>
            <span className="shrink-0 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-foreground">
              {statusEmoji(v.status)} {statusLabel(v.status)}
            </span>
          </Row>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="flex items-center justify-between text-sm font-semibold text-foreground">
        {title}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {count}
        </span>
      </h2>
      {count > 0 ? (
        <ul className="mt-3 space-y-2">{children}</ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function Row({
  highlight,
  accent,
  children,
}: {
  highlight?: boolean;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
        accent ? "border-success/40 bg-success-soft" : "border-border",
        highlight && "ring-2 ring-primary/50",
      )}
    >
      {children}
    </li>
  );
}
