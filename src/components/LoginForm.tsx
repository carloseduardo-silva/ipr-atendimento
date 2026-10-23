import { Link, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowRight, LogIn } from "lucide-react";
import { ClinicHeader } from "@/components/ClinicHeader";
import { SETOR_LABEL, setorDoEmail, signIn, type Setor } from "@/lib/auth";

/** Sistema de cada setor: rota do painel e rota do login. */
const SISTEMA: Record<
  Setor,
  { painel: "/atendimento" | "/vendas"; login: "/atendimento/login" | "/vendas/login" }
> = {
  atendimento: { painel: "/atendimento", login: "/atendimento/login" },
  vendas: { painel: "/vendas", login: "/vendas/login" },
};

interface LoginFormProps {
  /** Setor deste login: só contas desse setor entram por aqui. */
  setor: Setor;
  subtitulo: string;
  titulo: string;
  descricao: string;
  /** Setor da sessão já aberta neste navegador, quando é de outro sistema. */
  sessaoDeOutroSetor: Setor | null;
}

/**
 * Tela de login de um dos sistemas. Cada sistema tem a sua (`/atendimento/login`
 * e `/vendas/login`) e recusa contas do outro setor *antes* de chamar o
 * Supabase, para não trocar a sessão que já estiver aberta no navegador.
 */
export function LoginForm({
  setor,
  subtitulo,
  titulo,
  descricao,
  sessaoDeOutroSetor,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setorErrado, setSetorErrado] = useState<Setor | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password || submitting) return;
    setError(null);
    setSetorErrado(null);

    const setorDaConta = setorDoEmail(email);
    if (setorDaConta !== setor) {
      setSetorErrado(setorDaConta);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await router.invalidate();
      await router.navigate({ to: SISTEMA[setor].painel });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader subtitle={subtitulo} />

      <main className="mx-auto flex w-full max-w-md flex-col px-5 py-12">
        {sessaoDeOutroSetor ? (
          <div className="mb-4 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-foreground">
            Você está conectado ao sistema de {SETOR_LABEL[sessaoDeOutroSetor]}. Entrar aqui troca
            de conta.{" "}
            <Link
              to={SISTEMA[sessaoDeOutroSetor].painel}
              className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              Ir para {SETOR_LABEL[sessaoDeOutroSetor]}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h1 className="text-lg font-semibold text-foreground">{titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>

          <label htmlFor="email" className="mt-5 block text-sm font-medium text-foreground">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ex.: recepcao@institutopedroruiz.com.br"
            autoComplete="email"
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

          {setorErrado ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              Esta conta é do sistema de {SETOR_LABEL[setorErrado]}.{" "}
              <Link
                to={SISTEMA[setorErrado].login}
                className="font-medium underline underline-offset-2"
              >
                Use o login de {SETOR_LABEL[setorErrado].toLowerCase()}.
              </Link>
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!email.trim() || !password || submitting}
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
