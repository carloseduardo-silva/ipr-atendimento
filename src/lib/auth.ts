import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

/**
 * Camada de acesso à autenticação do painel administrativo.
 *
 * ATENÇÃO: isto é um mock de frontend, não segurança real. As credenciais vêm
 * de variáveis `VITE_*` (embutidas no bundle do cliente) e a sessão é um cookie
 * não assinado — qualquer pessoa pode ler as credenciais ou forjar o cookie.
 * Serve para escopar o acesso da equipe da recepção, não para proteger dados.
 *
 * Para migrar a sério (ex.: Supabase Auth, como o queue-store já prevê) basta
 * reimplementar `isAuthenticated`, `signIn` e `signOut` sem tocar na UI.
 */

const SESSION_COOKIE = "ipr.admin.session";
const SESSION_VALUE = "1";
/** Sem expiração de sessão: vale até o logout (ou o limite do navegador). */
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

const FALLBACK_USER = "admin";
const FALLBACK_PASSWORD = "ipr2025";

function credentials(): { username: string; password: string } {
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    username: env["VITE_ADMIN_USER"] || FALLBACK_USER,
    password: env["VITE_ADMIN_PASSWORD"] || FALLBACK_PASSWORD,
  };
}

function readCookieFromDocument(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return trimmed.slice(prefix.length);
  }
  return undefined;
}

/**
 * Verificação síncrona da sessão, usável tanto no `beforeLoad` do SSR quanto no
 * cliente. O branch `.server` é removido do bundle do cliente pelo plugin do
 * TanStack Start.
 */
export const isAuthenticated = createIsomorphicFn()
  .server(() => getCookie(SESSION_COOKIE) === SESSION_VALUE)
  .client(() => readCookieFromDocument(SESSION_COOKIE) === SESSION_VALUE);

/** Assíncrona de propósito: a troca por uma chamada de servidor não muda a UI. */
export async function signIn(username: string, password: string): Promise<boolean> {
  const expected = credentials();
  if (username.trim() !== expected.username || password !== expected.password) {
    return false;
  }

  if (typeof document !== "undefined") {
    document.cookie = `${SESSION_COOKIE}=${SESSION_VALUE}; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`;
  }
  return true;
}

export async function signOut(): Promise<void> {
  if (typeof document !== "undefined") {
    document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
