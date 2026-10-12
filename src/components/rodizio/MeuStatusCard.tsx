import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_EMOJI,
  STATUS_LABEL,
  type StatusManual,
  type VendedorRow,
} from "@/lib/rodizio-store";

/** Atalhos do próprio vendedor; "Ausente" fica só no override da gerência. */
const QUICK_STATUS: StatusManual[] = ["disponivel", "almoco", "pausa"];

interface MeuStatusCardProps {
  vendedor: VendedorRow;
  /** Posição 1-based na fila de disponíveis; 0 quando fora da fila. */
  posicao: number;
  onSetStatus: (status: StatusManual) => Promise<void>;
  onIniciar: () => Promise<void>;
  /** Desvincula este celular do vendedor (celular emprestado, nome errado). */
  onTrocar: () => void;
}

export function MeuStatusCard({
  vendedor,
  posicao,
  onSetStatus,
  onIniciar,
  onTrocar,
}: MeuStatusCardProps) {
  const [pending, setPending] = useState(false);
  const emAtendimento = vendedor.status === "em_atendimento";
  const isProximo = posicao === 1;

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
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Seu status atual
        </p>
        {/* Trocar durante um atendimento deixaria o atendimento aberto sem dono na tela. */}
        <button
          type="button"
          onClick={onTrocar}
          disabled={emAtendimento}
          title={emAtendimento ? "Finalize o atendimento antes de trocar" : undefined}
          className="text-xs font-medium text-muted-foreground underline-offset-2 transition hover:text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
        >
          Não é você? Trocar
        </button>
      </div>
      <p className="mt-1 text-lg font-semibold text-foreground">
        Olá, {vendedor.nome.split(" ")[0]}!{" "}
        <span className="font-normal text-muted-foreground">
          {posicao > 0
            ? isProximo
              ? "Você é o próximo da fila."
              : `Você é o ${posicao}º da fila.`
            : emAtendimento
              ? "Você está atendendo."
              : `Você está em ${STATUS_LABEL[vendedor.status as StatusManual]?.toLowerCase() ?? vendedor.status}.`}
        </span>
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Alterar seu status">
        {QUICK_STATUS.map((status) => {
          const active = vendedor.status === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              disabled={pending || emAtendimento || active}
              onClick={() => void run(() => onSetStatus(status))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition sm:flex-row sm:gap-2",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-foreground hover:border-primary hover:text-primary",
                "disabled:cursor-not-allowed",
                !active && "disabled:opacity-50",
              )}
            >
              <span aria-hidden className="text-lg leading-none">
                {STATUS_EMOJI[status]}
              </span>
              {STATUS_LABEL[status]}
            </button>
          );
        })}
      </div>

      {emAtendimento ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Finalize o atendimento para trocar de status.
        </p>
      ) : null}

      {isProximo ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void run(onIniciar)}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-lg font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          <PlayCircle className="h-5 w-5" />
          {pending ? "Iniciando…" : "Iniciar Atendimento"}
        </button>
      ) : null}
    </section>
  );
}
