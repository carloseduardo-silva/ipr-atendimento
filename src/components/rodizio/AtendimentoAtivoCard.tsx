import { useState } from "react";
import { CheckCircle2, Timer } from "lucide-react";
import { formatDuracao, type AtendimentoRow } from "@/lib/rodizio-store";

interface AtendimentoAtivoCardProps {
  atendimento: AtendimentoRow | null;
  now: number;
  onFinalizar: () => Promise<void>;
}

/** Card principal enquanto o vendedor atende: cronômetro ao vivo + "Finalizar". */
export function AtendimentoAtivoCard({ atendimento, now, onFinalizar }: AtendimentoAtivoCardProps) {
  const [pending, setPending] = useState(false);

  async function handleFinalizar() {
    if (pending) return;
    setPending(true);
    try {
      await onFinalizar();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-success/50 bg-success-soft p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        🔴 Você está em atendimento
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
          <Timer className="h-6 w-6" />
        </span>
        <p className="text-2xl font-semibold tabular-nums text-foreground" aria-live="off">
          {atendimento
            ? `Atendendo há ${formatDuracao(now - Date.parse(atendimento.inicio_atendimento))}`
            : "Atendimento em andamento"}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleFinalizar()}
        disabled={pending}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-success px-5 py-4 text-lg font-semibold text-success-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        <CheckCircle2 className="h-5 w-5" />
        {pending ? "Finalizando…" : "Finalizar Atendimento"}
      </button>
    </section>
  );
}
