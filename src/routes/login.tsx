import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { ClinicHeader } from "@/components/ClinicHeader";
import { isAuthenticated, signIn } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Instituto Pedro Ruiz" },
      {
        name: "description",
        content: "Acesso restrito ao painel de gestão da fila do Instituto Pedro Ruiz.",
      },
      { property: "og:title", content: "Entrar | Instituto Pedro Ruiz" },
      {
        property: "og:description",
        content: "Acesso restrito à equipe do Instituto Pedro Ruiz.",
      },
    ],
  }),
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/admin" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await signIn(username, password);
      if (!ok) {
        setError("Usuário ou senha inválidos.");
        return;
      }
      await router.invalidate();
      await router.navigate({ to: "/admin" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader subtitle="Acesso restrito" />

      <main className="mx-auto flex w-full max-w-md flex-col px-5 py-12">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-foreground">Entrar no painel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe as credenciais da equipe para gerenciar a fila.
          </p>

          <label htmlFor="usuario" className="mt-5 block text-sm font-medium text-foreground">
            Usuário
          </label>
          <input
            id="usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ex.: admin"
            autoComplete="username"
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />

          <label htmlFor="senha" className="mt-4 block text-sm font-medium text-foreground">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />

          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!username.trim() || !password || submitting}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}
