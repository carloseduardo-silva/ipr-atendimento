import { useState } from "react";
import { CheckCircle2, Pencil, UserPlus } from "lucide-react";
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
  onAdd,
  onUpdate,
  onRemove,
}: GestaoPanelProps) {
  const { vendedores, atendimentos } = snapshot;
  const linhas = [...vendedores]
    .map((v) => ({ vendedor: v, hoje: atendimentosHoje(atendimentos, v.id) }))
    .sort((a, b) => b.hoje - a.hoje || a.vendedor.nome.localeCompare(b.vendedor.nome));
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
  tempoAtendimento,
  onSetStatus,
  onFinalizar,
  onUpdate,
  onRemove,
}: {
  vendedor: VendedorRow;
  hoje: number;
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
