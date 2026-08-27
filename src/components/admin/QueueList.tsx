import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Clock, ExternalLink, Loader2, Phone, Users } from "lucide-react";
import type { Patient } from "@/types/patient";
import { matchesSearch } from "@/lib/queue-store";
import { getOverdueMinutes, getTargetTime } from "@/lib/queue-metrics";
import { DeletePatientDialog } from "@/components/admin/DeletePatientDialog";
import { TransferPatientMenu } from "@/components/admin/TransferPatientMenu";

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type MoveDirection = "up" | "down";

const ARROW_CLASS =
  "inline-flex h-6 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground";

interface QueueItemProps {
  patient: Patient;
  position: number;
  isNext: boolean;
  isLast: boolean;
  /** Horário prometido na entrada, contra o qual o atraso é medido. */
  targetTime: number;
  /** Minutos de atraso em relação ao prazo estimado; 0 quando está dentro do prazo. */
  overdueMinutes: number;
  /** Direção em andamento nesta paciente, ou null. */
  movingDirection: MoveDirection | null;
  /** Trava as setas enquanto qualquer reordenação está em andamento. */
  moveDisabled: boolean;
  /** Se esta paciente está sendo transferida para outro médico agora. */
  transferring: boolean;
  onMove: (direction: MoveDirection) => void;
  onCallNext: () => void;
  onDelete: (id: string) => void;
  onTransfer: (medico: string) => void;
}

function QueueItem({
  patient,
  position,
  isNext,
  isLast,
  targetTime,
  overdueMinutes,
  movingDirection,
  moveDisabled,
  transferring,
  onMove,
  onCallNext,
  onDelete,
  onTransfer,
}: QueueItemProps) {
  const isLate = overdueMinutes > 0;

  // O atraso tem precedência sobre o destaque de "próxima": um prazo estourado
  // é o que o atendente precisa enxergar primeiro.
  const cardTone = isLate
    ? "border-warning/60 bg-warning-soft"
    : isNext
      ? "border-primary/40 bg-brand-soft"
      : "border-border bg-card";

  return (
    <li
      className={`flex flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:gap-4 ${cardTone}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isNext
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
            }`}
        >
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-foreground">{patient.nome}</p>
            {isLate ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                <Clock className="h-3 w-3" />
                Atrasado {overdueMinutes} min
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Entrou às {formatTime(patient.createdAt)}
            <br />
            Previsto para{" "}
            <strong className={`font-semibold ${isLate ? "text-warning" : "text-foreground"}`}>
              {formatTime(targetTime)}
            </strong>
          </p>
          {patient.telefone ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {patient.telefone}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
        {isNext ? (
          <button
            type="button"
            onClick={onCallNext}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Chamar próximo
          </button>
        ) : null}

        <DeletePatientDialog patient={patient} onConfirm={() => onDelete(patient.id)} variant="icon" />

        <Link
          to="/espera"
          search={{ id: patient.id }}
          target="_blank"
          aria-label="Abrir sala de espera"
          title="Abrir sala de espera"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-foreground transition hover:border-primary hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>

        <TransferPatientMenu
          patient={patient}
          transferring={transferring}
          disabled={transferring}
          onTransfer={onTransfer}
        />

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={isNext || moveDisabled}
            aria-label={`Mover ${patient.nome} para cima`}
            title="Mover para cima"
            className={ARROW_CLASS}
          >
            {movingDirection === "up" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={isLast || moveDisabled}
            aria-label={`Mover ${patient.nome} para baixo`}
            title="Mover para baixo"
            className={ARROW_CLASS}
          >
            {movingDirection === "down" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </li>
  );
}

interface QueueListProps {
  /** Fila já filtrada pelo médico selecionado — os índices seguem esta lista. */
  waiting: Patient[];
  /** Médico dono desta fila, exibido no cabeçalho. */
  medico: string;
  /** Texto de busca por nome/telefone — só filtra o que é renderizado, não os índices. */
  search: string;
  /** Relógio compartilhado do painel: cards e métricas recalculam no mesmo tick. */
  now: number;
  onCallNext: () => void;
  onDelete: (id: string) => void;
  onMove: (currentIndex: number, direction: MoveDirection) => Promise<void>;
  onTransfer: (id: string, medico: string) => Promise<void>;
}

export function QueueList({
  waiting,
  medico,
  search,
  now,
  onCallNext,
  onDelete,
  onMove,
  onTransfer,
}: QueueListProps) {
  const [moving, setMoving] = useState<{ id: string; direction: MoveDirection } | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);

  async function handleMove(patient: Patient, index: number, direction: MoveDirection) {
    if (moving) return;
    setMoving({ id: patient.id, direction });
    try {
      await onMove(index, direction);
    } finally {
      setMoving(null);
    }
  }

  async function handleTransfer(patient: Patient, medico: string) {
    if (transferring) return;
    setTransferring(patient.id);
    try {
      await onTransfer(patient.id, medico);
    } finally {
      setTransferring(null);
    }
  }

  const visibleCount = waiting.filter((p) => matchesSearch(p, search)).length;

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Aguardando
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">Fila de {medico}</p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {waiting.length} na fila
        </span>
      </div>

      {waiting.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma paciente aguardando na fila de {medico}.
        </p>
      ) : visibleCount === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma paciente encontrada para &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {waiting.map((patient, index) => {
            if (!matchesSearch(patient, search)) return null;
            return (
              <QueueItem
                key={patient.id}
                patient={patient}
                position={index + 1}
                isNext={index === 0}
                isLast={index === waiting.length - 1}
                // O índice só é usado no fallback das linhas sem `previsto_para`,
                // e vem da fila completa do médico, não da lista filtrada pela
                // busca — o prazo não pode depender do texto pesquisado.
                targetTime={getTargetTime(patient, index)}
                overdueMinutes={getOverdueMinutes(patient, index, now)}
                movingDirection={moving?.id === patient.id ? moving.direction : null}
                moveDisabled={moving !== null || transferring === patient.id}
                transferring={transferring === patient.id}
                onMove={(direction) => void handleMove(patient, index, direction)}
                onTransfer={(target) => void handleTransfer(patient, target)}
                onCallNext={onCallNext}
                onDelete={onDelete}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
