import { useCallback, useEffect, useState } from "react";

/**
 * Qual vendedor está usando este celular no `/rodizio`. O setor de vendas
 * entra com um login compartilhado, então a identidade não vem da sessão: cada
 * aparelho escolhe o próprio nome uma vez e a escolha fica em `localStorage`.
 *
 * Não é controle de acesso — quem tem a senha pode escolher qualquer nome.
 * Serve só para a tela saber de quem é a seção "Seu Status Atual".
 */
const STORAGE_KEY = "hello-queue:rodizio-vendedor-id";

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function writeStored(id: string | null): void {
  try {
    if (id) {
      window.localStorage.setItem(STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Sem localStorage (modo privado, quota etc.): a escolha não persiste e
    // será pedida de novo no próximo acesso, mas a sessão atual funciona.
  }
}

export function useVendedorDoAparelho(): {
  vendedorId: string | null;
  /** `true` depois de ler o `localStorage`: antes disso, `null` não significa "sem vendedor". */
  pronto: boolean;
  escolher: (id: string) => void;
  trocar: () => void;
} {
  // Lazy init: evita divergência de hidratação entre servidor e cliente.
  const [vendedorId, setVendedorId] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setVendedorId(readStored());
    setPronto(true);

    // Outra aba do mesmo navegador trocou de vendedor: acompanha.
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setVendedorId(event.newValue || null);
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const escolher = useCallback((id: string) => {
    writeStored(id);
    setVendedorId(id);
  }, []);

  const trocar = useCallback(() => {
    writeStored(null);
    setVendedorId(null);
  }, []);

  return { vendedorId, pronto, escolher, trocar };
}
