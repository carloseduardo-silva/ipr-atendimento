import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ETAPAS = ["Quem é você", "Rodízio"] as const;

interface RodizioStepperProps {
  /** Índice 0-based da etapa atual. */
  atual: number;
}

/** Indicador das etapas do vendedor: identificar-se e, depois, operar o rodízio. */
export function RodizioStepper({ atual }: RodizioStepperProps) {
  return (
    <ol className="flex items-center justify-center gap-2" aria-label="Etapas">
      {ETAPAS.map((etapa, index) => {
        const concluida = index < atual;
        const ativa = index === atual;
        return (
          <li
            key={etapa}
            aria-current={ativa ? "step" : undefined}
            className="flex min-w-0 items-center gap-2"
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                concluida && "bg-success text-success-foreground",
                ativa && "bg-primary text-primary-foreground",
                !concluida && !ativa && "bg-secondary text-muted-foreground",
              )}
            >
              {concluida ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span
              className={cn(
                "truncate text-sm",
                ativa ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {etapa}
            </span>
            {index < ETAPAS.length - 1 ? (
              <span
                aria-hidden
                className={cn("h-px w-12 shrink-0", concluida ? "bg-success" : "bg-border")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
