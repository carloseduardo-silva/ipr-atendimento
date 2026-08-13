import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { addPatient } from "@/lib/queue-store";
import type { Patient } from "@/types/patient";

interface AddPatientFormProps {
  onAdded: (patient: Patient) => void;
}

export function AddPatientForm({ onAdded }: AddPatientFormProps) {
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const patient = await addPatient(trimmed);
      onAdded(patient);
      setNome("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-foreground">Adicionar paciente</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Um link exclusivo de sala de espera é gerado automaticamente.
      </p>

      <label
        htmlFor="nome-paciente"
        className="mt-5 block text-sm font-medium text-foreground"
      >
        Nome da paciente
      </label>
      <input
        id="nome-paciente"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Ex.: Maria Silva"
        autoComplete="off"
        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
      />

      <button
        type="submit"
        disabled={!nome.trim() || saving}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserPlus className="h-4 w-4" />
        Adicionar à fila
      </button>
    </form>
  );
}
