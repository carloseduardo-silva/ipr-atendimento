import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Login antigo, compartilhado pelos dois sistemas: mantido só para favoritos
 * salvos. Cada sistema tem o próprio login (`/atendimento/login` e
 * `/vendas/login`); o `?redirect=/rodizio` dos links antigos indica vendas.
 */
export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  beforeLoad: ({ search }) => {
    throw redirect({ to: search.redirect === "/rodizio" ? "/vendas/login" : "/atendimento/login" });
  },
});
