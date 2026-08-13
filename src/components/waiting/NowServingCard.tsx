import { useEffect } from "react";
import { BellRing, MessageCircle } from "lucide-react";

/** Toca um bipe curto via Web Audio; falha silenciosamente (fallback visual). */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    // sem áudio: o destaque visual já comunica a chamada
  }
}

export function NowServingCard() {
  useEffect(() => {
    playChime();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([200, 100, 200]);
    }
  }, []);

  return (
    <section className="animate-pulse-slow rounded-3xl border-2 border-success bg-success-soft p-7 text-center shadow-lg">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success text-success-foreground">
        <BellRing className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-3xl font-bold text-foreground">Sua vez!</h2>
      <p className="mt-3 flex items-center justify-center gap-2 text-base text-foreground">
        <MessageCircle className="h-5 w-5 text-success" />
        O médico está te aguardando no grupo do WhatsApp.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Abra o grupo agora para iniciar a chamada de vídeo.
      </p>
    </section>
  );
}
