import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";

interface FaqItem {
  titulo: string;
  texto: string;
}

const FAQS: FaqItem[] = [
  {
    titulo: "Como funciona a cirurgia?",
    texto:
      "A avaliação define a técnica ideal para o seu caso. O procedimento é rápido, feito com anestesia local e acompanhamento completo da nossa equipe.",
  },
  {
    titulo: "Tempo de recuperação",
    texto:
      "A maioria das pacientes retoma a rotina em poucos dias. Você recebe orientações detalhadas de cuidados e retornos programados.",
  },
  {
    titulo: "Formas de pagamento",
    texto:
      "Trabalhamos com PIX, cartão em até 12x e planos personalizados. A equipe apresenta as condições logo após a avaliação.",
  },
  {
    titulo: "O que levar no dia",
    texto:
      "Documento com foto, exames recentes e a lista de medicamentos em uso. Prefira roupas confortáveis.",
  },
  {
    titulo: "Posso tirar dúvidas depois?",
    texto:
      "Sim. Após a avaliação você continua com acesso ao nosso canal de atendimento para qualquer dúvida.",
  },
];

export function FaqCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function scrollTo(next: number) {
    const clamped = Math.max(0, Math.min(FAQS.length - 1, next));
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
          <HelpCircle className="h-5 w-5 text-primary" />
          Dúvidas frequentes
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollTo(index - 1)}
            className="rounded-full border border-border bg-card p-2 text-foreground transition hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
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
        {FAQS.map((faq) => (
          <article
            key={faq.titulo}
            className="w-[85%] shrink-0 snap-start rounded-2xl border border-border bg-card p-5 shadow-sm sm:w-[320px]"
          >
            <h3 className="text-base font-semibold text-foreground">{faq.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {faq.texto}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-1 flex justify-center gap-1.5">
        {FAQS.map((faq, i) => (
          <button
            key={faq.titulo}
            type="button"
            aria-label={`Ir para ${faq.titulo}`}
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
