import { useCallback, useEffect, useState } from "react";

/**
 * Preferência local para ocultar o formulário "Adicionar paciente" no painel
 * `/admin`. Fica em `localStorage`, por navegador/vendedor — o login do
 * painel é compartilhado, então isto não impede ninguém de cadastrar (quem
 * cadastra é papel dos SDRs), só limpa a tela de quem só acompanha a fila.
 */
const STORAGE_KEY = "hello-queue:hide-add-patient-form";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useHideAddPatientForm(): { hidden: boolean; toggle: () => void } {
  // Lazy init: evita divergência de hidratação entre servidor e cliente.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(readStored());
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Sem localStorage (modo privado, quota etc.): a preferência não
        // persiste, mas a sessão atual continua funcionando.
      }
      return next;
    });
  }, []);

  return { hidden, toggle };
}
