import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import type { Patient } from "@/types/patient";

interface PatientLinkCardProps {
  patient: Patient;
}

export function PatientLinkCard({ patient }: PatientLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const path = `/espera?id=${patient.id}`;
  const [fullLink, setFullLink] = useState(path);

  useEffect(() => {
    setCopied(false);
    if (typeof window !== "undefined") {
      setFullLink(`${window.location.origin}${path}`);
    }
  }, [path]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullLink);
    } catch {
      // fallback silencioso: o link continua visível para cópia manual
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-brand-soft p-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-accent-foreground">
        <Link2 className="h-4 w-4" />
        Link de {patient.nome}
      </div>
      <p className="mt-3 break-all rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs text-muted-foreground">
        {fullLink}
      </p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-card px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary hover:text-primary-foreground"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Link copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
