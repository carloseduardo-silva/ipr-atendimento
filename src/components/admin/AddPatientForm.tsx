import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { addPatient } from "@/lib/queue-store";
import { formatPhoneInput } from "@/lib/phone";
import { MEDICOS } from "@/lib/medicos";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@/types/patient";

interface AddPatientFormProps {
  onAdded: (patient: Patient) => void;
}

export function AddPatientForm({ onAdded }: AddPatientFormProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [medico, setMedico] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed || !medico || saving) return;
    setSaving(true);
    try {
      const patient = await addPatient(trimmed, medico, telefone || null);
      onAdded(patient);
      // O médico permanece selecionado: costuma-se cadastrar várias pacientes
      // seguidas para a mesma fila.
      setNome("");
      setTelefone("");
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

      <label
        htmlFor="telefone-paciente"
        className="mt-4 block text-sm font-medium text-foreground"
      >
        Telefone <span className="font-normal text-muted-foreground">(opcional)</span>
      </label>
      <input
        id="telefone-paciente"
        value={telefone}
        onChange={(e) => setTelefone(formatPhoneInput(e.target.value))}
        placeholder="(11) 91234-5678"
        inputMode="tel"
        autoComplete="off"
        maxLength={15}
        className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
      />

      <label
        htmlFor="medico-paciente"
        className="mt-4 block text-sm font-medium text-foreground"
      >
        Médico responsável
      </label>
      <Select value={medico} onValueChange={setMedico}>
        <SelectTrigger
          id="medico-paciente"
          className="mt-2 h-auto w-full rounded-xl border-input bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
        >
          <SelectValue placeholder="Escolha o médico da fila" />
        </SelectTrigger>
        <SelectContent>
          {MEDICOS.map((nomeMedico) => (
            <SelectItem key={nomeMedico} value={nomeMedico}>
              {nomeMedico}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="submit"
        disabled={!nome.trim() || !medico || saving}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserPlus className="h-4 w-4" />
        Adicionar à fila
      </button>
    </form>
  );
}
