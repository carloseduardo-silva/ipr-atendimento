import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginForm } from "@/components/LoginForm";
import { getSessionSetor } from "@/lib/auth";

export const Route = createFileRoute("/atendimento/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Fila de Avaliações | Instituto Pedro Ruiz" },
      {
        name: "description",
        content:
          "Acesso restrito da equipe de atendimento à fila de avaliações do Instituto Pedro Ruiz.",
      },
    ],
  }),
  beforeLoad: () => {
    const setor = getSessionSetor();
    if (setor === "atendimento") {
      throw redirect({ to: "/atendimento" });
    }
    // Sessão de vendas aberta neste navegador: a tela avisa que entrar troca de conta.
    return { sessaoDeOutroSetor: setor };
  },
  component: AtendimentoLoginPage,
});

function AtendimentoLoginPage() {
  const { sessaoDeOutroSetor } = Route.useRouteContext();

  return (
    <LoginForm
      setor="atendimento"
      subtitulo="Fila de avaliações"
      titulo="Entrar na fila de avaliações"
      descricao="Acesso da equipe de atendimento. Informe o e-mail e a senha para gerenciar a fila."
      sessaoDeOutroSetor={sessaoDeOutroSetor}
    />
  );
}
