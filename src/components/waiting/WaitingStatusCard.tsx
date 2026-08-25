import { useEffect, useState } from "react";
import { Clock, RefreshCw, Users } from "lucide-react";
import { ESTIMATED_MINUTES_PER_PATIENT } from "@/types/patient";

interface WaitingStatusCardProps {
  position: number;
  createdAt: number;
  /** Prazo gravado na entrada; null nas linhas anteriores à coluna `previsto_para`. */
  scheduledFor: number | null;
}

function ordinal(position: number) {
  return `${position}ª`;
}

function formatTimeLeft(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function WaitingStatusCard({ position, createdAt, scheduledFor }: WaitingStatusCardProps) {
  // O prazo gravado na entrada é absoluto e vem do banco, então o cronômetro
  // reabre no mesmo ponto depois de um reload — que era o furo de ancorar o
  // alvo só em memória.
  const estimatedTarget =
    scheduledFor ?? createdAt + position * ESTIMATED_MINUTES_PER_PATIENT * 60_000;

  // Trava de segurança para as linhas legadas, sem `previsto_para`: nelas o alvo
  // ainda deriva da posição atual, então é preciso impedi-lo de recuar quando a
  // fila anda — senão o contador saltaria 5 min para baixo a cada paciente
  // chamada. Só é estendido quando a paciente é empurrada para trás na fila,
  // porque aí o tempo restante realmente aumentou. Com `previsto_para` presente
  // o valor é constante e este bloco vira no-op.
  const [targetTime, setTargetTime] = useState(estimatedTarget);
  if (estimatedTarget > targetTime) {
    setTargetTime(estimatedTarget);
  }

  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, targetTime - Date.now()));

  useEffect(() => {
    setTimeLeft(Math.max(0, targetTime - Date.now()));

    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, targetTime - Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const isAboutToBeCalled = timeLeft <= 0;

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

      <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-accent-foreground ring-1 ring-primary/30">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
        </span>
        <Clock className="h-4 w-4" />
        {isAboutToBeCalled ? (
          <strong>Seu atendimento será o próximo!</strong>
        ) : (
          <>
            Tempo estimado de espera:{" "}
            <strong className="font-mono text-base tabular-nums">
              {formatTimeLeft(timeLeft)}
            </strong>
          </>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3 animate-spin [animation-duration:3s]" />
        Atualizando automaticamente.
      </p>
    </section>
  );
}
