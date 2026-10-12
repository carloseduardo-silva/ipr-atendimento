import { useState, type FormEvent, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { VendedorRow } from "@/lib/rodizio-store";

interface VendedorFormDialogProps {
  /** Ausente = adicionar; presente = editar este vendedor. */
  vendedor?: VendedorRow;
  trigger: ReactNode;
  /** Retorna `true` quando salvou; o modal só fecha nesse caso. */
  onSubmit: (nome: string) => Promise<boolean>;
}

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

/** Modal de cadastro/edição de vendedor do rodízio (aba Gestão). */
export function VendedorFormDialog({ vendedor, trigger, onSubmit }: VendedorFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);
  const editando = Boolean(vendedor);

  function handleOpenChange(next: boolean) {
    // Recarrega os campos a cada abertura: na edição, o vendedor pode ter sido
    // alterado em outra tela desde a última vez.
    if (next) {
      setNome(vendedor?.nome ?? "");
    }
    setOpen(next);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nome.trim() || saving) return;
    setSaving(true);
    try {
      // Erros já viram toast no store; o modal fica aberto para tentar de novo.
      if (await onSubmit(nome)) setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar vendedor" : "Adicionar vendedor"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "As mudanças aparecem na hora em todas as telas do rodízio."
                : "O vendedor entra como Ausente e vai para a fila ao tocar em Disponível."}
            </DialogDescription>
          </DialogHeader>

          <label htmlFor="vendedor-nome" className="mt-5 block text-sm font-medium text-foreground">
            Nome
          </label>
          <input
            id="vendedor-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Ana Souza"
            autoComplete="off"
            required
            className={INPUT_CLASS}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            É por este nome que o vendedor se identifica no celular ("Digite o seu nome").
          </p>

          <DialogFooter className="mt-6 gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nome.trim() || saving}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Salvando…" : editando ? "Salvar" : "Adicionar"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
