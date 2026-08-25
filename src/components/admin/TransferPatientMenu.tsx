import { ArrowRightLeft, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MEDICOS } from "@/lib/medicos";
import type { Patient } from "@/types/patient";

interface TransferPatientMenuProps {
  patient: Patient;
  transferring: boolean;
  disabled: boolean;
  onTransfer: (medico: string) => void;
}

export function TransferPatientMenu({
  patient,
  transferring,
  disabled,
  onTransfer,
}: TransferPatientMenuProps) {
  const options = MEDICOS.filter((m) => m !== patient.medico);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Transferir ${patient.nome} para outro médico`}
          title="Transferir para outro médico"
          disabled={disabled}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {transferring ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((m) => (
          <DropdownMenuItem key={m} onSelect={() => onTransfer(m)}>
            {m}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
