import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HeartPulse, MonitorCog } from "lucide-react";
import logoAsset from "@/assets/logo-ipr.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sala de Espera Virtual | Instituto Pedro Ruiz" },
      {
        name: "description",
        content:
          "Sistema de sala de espera virtual e gestão de fila para as avaliações online do Instituto Pedro Ruiz.",
      },
      { property: "og:title", content: "Sala de Espera Virtual | Instituto Pedro Ruiz" },
      {
        property: "og:description",
        content:
          "Gestão de fila para atendentes e acompanhamento em tempo real para pacientes.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-xl text-center">
        <img
          src={logoAsset.url}
          alt="Instituto Pedro Ruiz"
          className="mx-auto h-14 w-auto"
        />
        <h1 className="mt-8 text-3xl font-semibold text-foreground">
          Sala de Espera Virtual
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha por onde deseja entrar.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin"
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary"
          >
            <MonitorCog className="h-6 w-6 text-primary" />
            <p className="mt-3 font-semibold text-foreground">Painel do atendente</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicionar pacientes e gerenciar a fila.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>

          <Link
            to="/espera"
            search={{ id: undefined }}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary"
          >
            <HeartPulse className="h-6 w-6 text-primary" />
            <p className="mt-3 font-semibold text-foreground">Sala de espera</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão da paciente com posição na fila.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Abrir <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
