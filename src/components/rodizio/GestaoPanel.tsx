import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Pencil, UserPlus } from "lucide-react";
import { RemoveVendedorDialog } from "@/components/rodizio/RemoveVendedorDialog";
import { VendedorFormDialog } from "@/components/rodizio/VendedorFormDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUS_EMOJI,
  STATUS_LABEL,
  atendimentoAberto,
  atendimentosHoje,
  formatDuracao,
  statusEmoji,
  sortFila,
  statusLabel,
  type RodizioSnapshot,
  type StatusManual,
  type VendedorRow,
} from "@/lib/rodizio-store";

const OVERRIDE_STATUS: StatusManual[] = ["disponivel", "almoco", "pausa", "ausente"];

interface GestaoPanelProps {
  snapshot: RodizioSnapshot;
  now: number;
  onSetStatus: (vendedorId: string, status: StatusManual) => Promise<void>;
  onFinalizar: (vendedorId: string) => Promise<void>;
  onMove: (vendedorId: string, direction: "up" | "down") => Promise<void>;
  onAdd: (nome: string) => Promise<boolean>;
  onUpdate: (vendedorId: string, nome: string) => Promise<boolean>;
  onRemove: (vendedorId: string) => Promise<void>;
}

/**
 * Visão da gerente comercial: produção do dia por vendedor e override manual
 * de status (ex.: vendedor esqueceu de marcar que saiu para o almoço), além do
 * cadastro de vendedores.
 */
export function GestaoPanel({
  snapshot,
  now,
  onSetStatus,
  onFinalizar,
  onMove,
  onAdd,
  onUpdate,
  onRemove,
}: GestaoPanelProps) {
  const { vendedores, atendimentos } = snapshot;
  // Quem está na fila vem primeiro, na ordem da fila (as setas mexem nessa
  // ordem); os demais ficam abaixo, por produção do dia.
  const fila = sortFila(vendedores);
  const posicaoNaFila = new Map(fila.map((v, index) => [v.id, index]));
  const linhas = [...vendedores]
    .map((v) => ({ vendedor: v, hoje: atendimentosHoje(atendimentos, v.id) }))
    .sort((a, b) => {
      const posA = posicaoNaFila.get(a.vendedor.id);
      const posB = posicaoNaFila.get(b.vendedor.id);
      if (posA !== undefined && posB !== undefined) return posA - posB;
      if (posA !== undefined) return -1;
      if (posB !== undefined) return 1;
      return b.hoje - a.hoje || a.vendedor.nome.localeCompare(b.vendedor.nome);
    });
  const totalHoje = linhas.reduce((sum, l) => sum + l.hoje, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Atendimentos hoje" value={totalHoje} />
        <Metric
          label="Em atendimento agora"
          value={vendedores.filter((v) => v.status === "em_atendimento").length}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Vendedores</h2>
          <VendedorFormDialog
            onSubmit={onAdd}
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar vendedor
              </button>
            }
          />
        </div>
        {linhas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum vendedor cadastrado. Use "Adicionar vendedor" para começar.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {linhas.map(({ vendedor, hoje }) => (
              <GestaoRow
                key={vendedor.id}
                vendedor={vendedor}
                hoje={hoje}
                posicao={posicaoNaFila.get(vendedor.id) ?? null}
                totalFila={fila.length}
                onMove={(direction) => onMove(vendedor.id, direction)}
                tempoAtendimento={(() => {
                  const aberto = atendimentoAberto(atendimentos, vendedor.id);
                  return aberto ? now - Date.parse(aberto.inicio_atendimento) : null;
                })()}
                onSetStatus={(status) => onSetStatus(vendedor.id, status)}
                onFinalizar={() => onFinalizar(vendedor.id)}
                onUpdate={(nome) => onUpdate(vendedor.id, nome)}
                onRemove={() => void onRemove(vendedor.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GestaoRow({
  vendedor,
  hoje,
  posicao,
  totalFila,
  onMove,
  tempoAtendimento,
  onSetStatus,
  onFinalizar,
  onUpdate,
  onRemove,
}: {
  vendedor: VendedorRow;
  hoje: number;
  /** Índice 0-based na fila; `null` quando fora dela. */
  posicao: number | null;
  totalFila: number;
  onMove: (direction: "up" | "down") => Promise<void>;
  tempoAtendimento: number | null;
  onSetStatus: (status: StatusManual) => Promise<void>;
  onFinalizar: () => Promise<void>;
  onUpdate: (nome: string) => Promise<boolean>;
  onRemove: () => void;
}) {
  const [pending, setPending] = useState(false);
  const emAtendimento = vendedor.status === "em_atendimento";

  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      {posicao !== null ? (
        <div className="flex shrink-0 items-center gap-1">
          <div className="flex flex-col">
            <button
              type="button"
              disabled={pending || posicao === 0}
              onClick={() => void run(() => onMove("up"))}
              aria-label={`Subir ${vendedor.nome} na fila`}
              title="Subir na fila"
              className="inline-flex h-6 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-foreground"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={pending || posicao === totalFila - 1}
              onClick={() => void run(() => onMove("down"))}
              aria-label={`Descer ${vendedor.nome} na fila`}
              title="Descer na fila"
              className="mt-0.5 inline-flex h-6 w-8 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-border disabled:hover:text-foreground"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <span className="w-6 text-center text-sm font-semibold tabular-nums text-muted-foreground">
            {posicao + 1}º
          </span>
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{vendedor.nome}</p>
        <p className="text-xs text-muted-foreground">
          {statusEmoji(vendedor.status)} {statusLabel(vendedor.status)}
          {tempoAtendimento !== null ? ` há ${formatDuracao(tempoAtendimento)}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4 text-center">
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">{hoje}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hoje</p>
        </div>
        <div>
          <p className="text-lg font-semibold tabular-nums text-foreground">
            {vendedor.total_atendimentos}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Acumulado</p>
        </div>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
          {emAtendimento ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void run(onFinalizar)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-success/50 bg-success-soft px-3 py-2 text-sm font-medium text-foreground transition hover:border-success disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar atendimento
            </button>
          ) : (
            <Select
              value={vendedor.status}
              disabled={pending}
              onValueChange={(value) => void run(() => onSetStatus(value as StatusManual))}
            >
              <SelectTrigger aria-label={`Alterar status de ${vendedor.nome}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDE_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_EMOJI[status]} {STATUS_LABEL[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <VendedorFormDialog
          vendedor={vendedor}
          onSubmit={onUpdate}
          trigger={
            <button
              type="button"
              aria-label={`Editar ${vendedor.nome}`}
              title="Editar vendedor"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition hover:border-primary hover:text-primary"
            >
              <Pencil className="h-4 w-4" />
            </button>
          }
        />
        <RemoveVendedorDialog vendedor={vendedor} onConfirm={onRemove} />
      </div>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
