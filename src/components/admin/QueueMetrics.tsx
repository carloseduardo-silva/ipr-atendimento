import { AlertTriangle, Clock, Users } from "lucide-react";
import type { Patient } from "@/types/patient";
import { getQueueMetrics } from "@/lib/queue-metrics";

interface QueueMetricsProps {
  /** Fila já filtrada pelo médico selecionado — os índices seguem esta lista. */
  waiting: Patient[];
  /** Relógio compartilhado do painel, para as métricas recalcularem no mesmo tick dos cards. */
  now: number;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  /** Destaque âmbar quando a métrica indica gargalo. */
  alert?: boolean;
}

function MetricCard({ label, value, icon, alert = false }: MetricCardProps) {
  return (
    <div
      className={`rounded-2xl border p-3 transition sm:p-4 ${
        alert ? "border-warning/50 bg-warning-soft" : "border-border bg-card"
      }`}
    >
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span className="leading-tight">{label}</span>
      </p>
      <p
        className={`mt-1 text-lg font-semibold sm:text-2xl ${alert ? "text-warning" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

export function QueueMetrics({ waiting, now }: QueueMetricsProps) {
  const { total, late, longestWaitMinutes } = getQueueMetrics(waiting, now);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-6 xl:gap-9">
      <MetricCard
        label="Total na fila"
        value={String(total)}
        icon={<Users className="h-3.5 w-3.5" />}
      />
      <MetricCard
        label="Pacientes atrasados"
        value={String(late)}
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        alert={late > 0}
      />
      <MetricCard
        label="Maior tempo de espera"
        value={total > 0 ? `${longestWaitMinutes} min` : "—"}
        icon={<Clock className="h-3.5 w-3.5" />}
      />
    </div>
  );
}
