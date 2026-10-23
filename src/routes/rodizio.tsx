import { createFileRoute, redirect } from "@tanstack/react-router";

/** Endereço antigo do rodízio de vendas: mantido só para favoritos salvos. */
export const Route = createFileRoute("/rodizio")({
  beforeLoad: () => {
    throw redirect({ to: "/vendas" });
  },
});
