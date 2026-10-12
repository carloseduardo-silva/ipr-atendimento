import { Trash2 } from "lucide-react";
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
import type { VendedorRow } from "@/lib/rodizio-store";

interface RemoveVendedorDialogProps {
  vendedor: VendedorRow;
  onConfirm: () => void;
}

export function RemoveVendedorDialog({ vendedor, onConfirm }: RemoveVendedorDialogProps) {
  const emAtendimento = vendedor.status === "em_atendimento";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          disabled={emAtendimento}
          aria-label={`Remover ${vendedor.nome}`}
          title={emAtendimento ? "Finalize o atendimento antes de remover" : "Remover do rodízio"}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-destructive/40 text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {vendedor.nome} do rodízio?</AlertDialogTitle>
          <AlertDialogDescription>
            O vendedor sai da fila e das telas. O histórico de atendimentos é mantido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={buttonVariants({ variant: "destructive" })}
          >
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
