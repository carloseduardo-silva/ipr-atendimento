import { createFileRoute, redirect } from "@tanstack/react-router";

/** Endereço antigo da fila de avaliações: mantido só para favoritos salvos. */
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/atendimento" });
  },
});
