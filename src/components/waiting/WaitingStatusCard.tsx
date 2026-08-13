import { Clock, RefreshCw, Users } from "lucide-react";
import { ESTIMATED_MINUTES_PER_PATIENT } from "@/types/patient";

interface WaitingStatusCardProps {
  position: number;
}

function ordinal(position: number) {
  return `${position}ª`;
}

export function WaitingStatusCard({ position }: WaitingStatusCardProps) {
  const minutes = position * ESTIMATED_MINUTES_PER_PATIENT;

  return (
    <section className="rounded-3xl border border-primary/20 bg-card p-7 text-center shadow-sm">
      <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
        <Users className="h-4 w-4" />
        Sua posição na fila
      </p>

      <p className="mt-4 text-7xl font-bold leading-none text-primary">
        {ordinal(position)}
      </p>
      <p className="mt-3 text-base text-foreground">
        Você é a <strong>{ordinal(position)}</strong> na fila
      </p>

      <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-accent-foreground">
        <Clock className="h-4 w-4" />
        Tempo estimado de espera: <strong>{minutes} minutos</strong>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin [animation-duration:3s]" />
        Atualizando automaticamente. Mantenha esta tela aberta.
      </p>
    </section>
  );
}
