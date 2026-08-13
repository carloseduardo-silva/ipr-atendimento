import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { ClinicHeader } from "@/components/ClinicHeader";
import { WaitingStatusCard } from "@/components/waiting/WaitingStatusCard";
import { NowServingCard } from "@/components/waiting/NowServingCard";
import { FaqCarousel } from "@/components/waiting/FaqCarousel";
import { useQueue } from "@/hooks/use-queue";
import { getQueuePosition } from "@/lib/queue-store";

export const Route = createFileRoute("/espera")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () => ({
    meta: [
      { title: "Sala de Espera Virtual | Instituto Pedro Ruiz" },
      {
        name: "description",
        content:
          "Acompanhe sua posição na fila da avaliação online e tire dúvidas enquanto aguarda o atendimento.",
      },
      { property: "og:title", content: "Sala de Espera Virtual | Instituto Pedro Ruiz" },
      {
        property: "og:description",
        content: "Sua posição na fila em tempo real e respostas às dúvidas mais comuns.",
      },
    ],
  }),
  component: EsperaPage,
});

function EsperaPage() {
  const { id } = Route.useSearch();
  const patients = useQueue();
  const patient = patients.find((p) => p.id === id) ?? null;
  const position = patient ? getQueuePosition(patients, patient.id) : 0;

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader />

      <main className="mx-auto w-full max-w-lg px-5 pb-14 pt-7">
        {!patient ? (
          <section className="rounded-3xl border border-border bg-card p-7 text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Não encontramos o seu cadastro
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Abra o link exclusivo que a nossa equipe enviou para você no WhatsApp.
            </p>
          </section>
        ) : (
          <>
            <h1 className="text-2xl font-semibold text-foreground">
              Olá, {patient.nome}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Bem-vinda à sala de espera virtual do Instituto Pedro Ruiz.
            </p>

            <div className="mt-6">
              {patient.status === "aguardando" ? (
                <WaitingStatusCard position={position} />
              ) : patient.status === "em_atendimento" ? (
                <NowServingCard />
              ) : (
                <section className="rounded-3xl border border-border bg-card p-7 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                  <h2 className="mt-3 text-xl font-semibold text-foreground">
                    Atendimento concluído
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Obrigado por participar da avaliação. Qualquer dúvida, fale com a
                    nossa equipe pelo WhatsApp.
                  </p>
                </section>
              )}
            </div>
          </>
        )}

        <FaqCarousel />

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Seus dados são tratados com sigilo médico.
        </p>
      </main>
    </div>
  );
}
