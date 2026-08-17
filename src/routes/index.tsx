import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HeartPulse } from "lucide-react";

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
          src="/images/logo-ipr.png"
          alt="Instituto Pedro Ruiz"
          className="mx-auto h-14 w-auto"
        />
        <h1 className="mt-8 text-3xl font-semibold text-foreground">
          Sala de Espera Virtual
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha por onde deseja entrar.
        </p>

       
      </div>
    </div>
  );
}
