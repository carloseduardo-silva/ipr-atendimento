import { useCallback, useEffect, useState } from "react";

/**
 * Preferência local de quais filas de médico o vendedor não quer ver no
 * painel `/admin`. Fica em `localStorage`: é por navegador/vendedor, não por
 * conta — o login do painel é compartilhado entre a equipe, então isto não
 * restringe dados, só personaliza a visualização de quem está usando o
 * computador.
 */
const STORAGE_KEY = "hello-queue:hidden-medicos";

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((m): m is string => typeof m === "string") : [];
  } catch {
    return [];
  }
}

export function useHiddenMedicos(): {
  hidden: Set<string>;
  toggle: (medico: string) => void;
} {
  // Lazy init: evita divergência de hidratação entre servidor e cliente.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setHidden(new Set(readStored()));
  }, []);

  const toggle = useCallback((medico: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(medico)) {
        next.delete(medico);
      } else {
        next.add(medico);
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Sem localStorage (modo privado, quota etc.): a preferência não
        // persiste, mas a sessão atual continua funcionando.
      }
      return next;
    });
  }, []);

  return { hidden, toggle };
}
