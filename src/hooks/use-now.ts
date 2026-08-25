import { useEffect, useState } from "react";

/**
 * Epoch em milissegundos que se atualiza a cada `intervalMs`, forçando o
 * re-render de qualquer UI derivada do tempo (prazos, tempo de espera).
 *
 * Um único relógio por tela: quem precisa do valor recebe por prop, para que
 * cards e métricas recalculem sempre no mesmo tick.
 */
export function useNow(intervalMs = 60_000): number {
  // Lazy init: evita divergência de hidratação entre servidor e cliente.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Recalcula já na montagem — sem isto a tela ficaria até um intervalo
    // inteiro exibindo o valor capturado no primeiro render.
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return now;
}
