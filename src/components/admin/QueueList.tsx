import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  PhoneCall,
  Users,
} from "lucide-react";
import type { Patient } from "@/types/patient";
import { ESTIMATED_MINUTES_PER_PATIENT } from "@/types/patient";
import { DeletePatientDialog } from "@/components/admin/DeletePatientDialog";

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
  /** Direção em andamento nesta paciente, ou null. */
  movingDirection: MoveDirection | null;
  /** Trava as setas enquanto qualquer reordenação está em andamento. */
  moveDisabled: boolean;
  onMove: (direction: MoveDirection) => void;
  onCallNext: () => void;
  onDelete: (id: string) => void;
}

function QueueItem({
  patient,
  position,
  isNext,
  isLast,
  movingDirection,
  moveDisabled,
  onMove,
  onCallNext,
  onDelete,
}: QueueItemProps) {
  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
        isNext ? "border-primary/40 bg-brand-soft" : "border-border bg-card"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          isNext
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {position}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{patient.nome}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Entrou às {formatTime(patient.createdAt)} · espera estimada{" "}
          {position * ESTIMATED_MINUTES_PER_PATIENT} min
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
        {isNext ? (
          <button
            type="button"
            onClick={onCallNext}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <PhoneCall className="h-4 w-4" />
            Chamar próximo
          </button>
        ) : null}
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
        <DeletePatientDialog patient={patient} onConfirm={() => onDelete(patient.id)} variant="icon" />
      </div>
    </li>
  );
}

interface QueueListProps {
  /** Fila já filtrada pelo médico selecionado — os índices seguem esta lista. */
  waiting: Patient[];
  /** Médico dono desta fila, exibido no cabeçalho. */
  medico: string;
  onCallNext: () => void;
  onDelete: (id: string) => void;
  onMove: (currentIndex: number, direction: MoveDirection) => Promise<void>;
}

export function QueueList({ waiting, medico, onCallNext, onDelete, onMove }: QueueListProps) {
  const [moving, setMoving] = useState<{ id: string; direction: MoveDirection } | null>(null);

  async function handleMove(patient: Patient, index: number, direction: MoveDirection) {
    if (moving) return;
    setMoving({ id: patient.id, direction });
    try {
      await onMove(index, direction);
    } finally {
      setMoving(null);
    }
  }

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
      ) : (
        <ul className="mt-5 space-y-3">
          {waiting.map((patient, index) => (
            <QueueItem
              key={patient.id}
              patient={patient}
              position={index + 1}
              isNext={index === 0}
              isLast={index === waiting.length - 1}
              movingDirection={moving?.id === patient.id ? moving.direction : null}
              moveDisabled={moving !== null}
              onMove={(direction) => void handleMove(patient, index, direction)}
              onCallNext={onCallNext}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
