import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { ClinicHeader } from "@/components/ClinicHeader";
import { WaitingStatusCard } from "@/components/waiting/WaitingStatusCard";
import { NowServingCard } from "@/components/waiting/NowServingCard";
import { BeforeAfterCarousel } from "@/components/waiting/BeforeAfterCarousel";
import { FaqCarousel } from "@/components/waiting/FaqCarousel";
import { usePatientQueueStatus } from "@/hooks/use-patient-queue-status";

export const Route = createFileRoute("/espera")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
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
  const { patient, position, loading } = usePatientQueueStatus(id);

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader />

      <main className="mx-auto w-full max-w-lg px-5 pb-14 pt-7">
        {loading ? (
          <section className="rounded-3xl border border-border bg-card p-7 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">
              Carregando sua posição na fila…
            </p>
          </section>
        ) : !patient ? (
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
            <h1 className="text-center text-2xl font-semibold text-foreground">
              Olá, {patient.nome}
            </h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Bem-vinda à sala de espera virtual.
            </p>

            {patient.medico ? (
              <p className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-brand-soft px-4 py-3 text-center text-sm text-foreground">
                <Stethoscope className="h-4 w-4 shrink-0 text-primary" />
                <span>
                  Sua avaliação online será com:{" "}
                  <strong className="font-semibold">{patient.medico}</strong>
                </span>
              </p>
            ) : null}

            <div className="mt-6">
              {patient.status === "aguardando" ? (
                <WaitingStatusCard
                  position={position}
                  createdAt={patient.createdAt}
                  scheduledFor={patient.scheduledFor}
                />
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

        <BeforeAfterCarousel />

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Seus dados são tratados com sigilo médico.
        </p>
      </main>
    </div>
  );
}
