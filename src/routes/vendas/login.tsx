import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/components/LoginForm";
import { getSessionSetor } from "@/lib/auth";

export const Route = createFileRoute("/vendas/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Fila de Atendimento | Instituto Pedro Ruiz" },
      {
        name: "description",
        content: "Acesso restrito da equipe de vendas ao rodízio do Instituto Pedro Ruiz.",
      },
    ],
  }),
  beforeLoad: () => {
    const setor = getSessionSetor();
    if (setor === "vendas") {
      throw redirect({ to: "/vendas" });
    }
    // Sessão de atendimento aberta neste navegador: a tela avisa que entrar troca de conta.
    return { sessaoDeOutroSetor: setor };
  },
  component: VendasLoginPage,
});

function VendasLoginPage() {
  const { sessaoDeOutroSetor } = Route.useRouteContext();

  return (
    <LoginForm
      setor="vendas"
      subtitulo="Fila de atendimento IPR Brooklin"
      titulo="Entrar no rodízio de vendas"
      descricao="Acesso da equipe de vendas. Informe o e-mail e a senha do setor."
      sessaoDeOutroSetor={sessaoDeOutroSetor}
    />
  );
}
