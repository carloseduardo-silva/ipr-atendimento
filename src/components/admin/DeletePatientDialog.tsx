import { Trash2 } from "lucide-react";
import type { Patient } from "@/types/patient";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeletePatientDialogProps {
  patient: Patient;
  onConfirm: () => void;
  variant?: "default" | "icon";
}

export function DeletePatientDialog({
  patient,
  onConfirm,
  variant = "default",
}: DeletePatientDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <button
            type="button"
            aria-label="Excluir paciente"
            title="Excluir paciente"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-destructive/40 text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Excluir
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {patient.nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove o registro do banco de dados permanentemente e não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={buttonVariants({ variant: "destructive" })}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
