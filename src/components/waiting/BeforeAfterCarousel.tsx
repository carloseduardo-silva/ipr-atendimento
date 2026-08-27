import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

/**
 * Fotos de antes/depois enviadas pela clínica (`public/images`), já montadas
 * em par (metade em preto e branco, metade colorida) com a moldura e a marca
 * IPR — o componente só as exibe em sequência, sem nenhum recorte adicional.
 */
const BEFORE_AFTER_IMAGES = Array.from(
  { length: 10 },
  (_, i) => `/images/antes-depois-${String(i + 1).padStart(2, "0")}.jpeg`,
);

export function BeforeAfterCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function scrollTo(next: number) {
    const clamped = Math.max(0, Math.min(BEFORE_AFTER_IMAGES.length - 1, next));
    setIndex(clamped);
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[clamped] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-primary" />
          Resultados reais
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={() => scrollTo(index - 1)}
            className="rounded-full border border-border bg-card p-2 text-foreground transition hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima foto"
            onClick={() => scrollTo(index + 1)}
            className="rounded-full border border-border bg-card p-2 text-foreground transition hover:border-primary hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {BEFORE_AFTER_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Resultado de paciente do Instituto Pedro Ruiz, antes e depois (${i + 1} de ${BEFORE_AFTER_IMAGES.length})`}
            loading={i === 0 ? "eager" : "lazy"}
            className="aspect-[4/5] w-[78%] shrink-0 snap-start rounded-2xl object-cover shadow-sm sm:w-[300px]"
          />
        ))}
      </div>

      <div className="mt-1 flex justify-center gap-1.5">
        {BEFORE_AFTER_IMAGES.map((src, i) => (
          <button
            key={src}
            type="button"
            aria-label={`Ir para a foto ${i + 1}`}
            onClick={() => scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-5 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
