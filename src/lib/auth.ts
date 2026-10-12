import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookies } from "@tanstack/react-start/server";
import { AUTH_COOKIE_PREFIX, supabase } from "@/lib/supabase";

/**
 * Camada de acesso à autenticação do painel administrativo (Supabase Auth,
 * e-mail + senha). A sessão vive em cookies, gravados pelo @supabase/ssr.
 *
 * IMPORTANTE: `isAuthenticated` apenas verifica a *presença* do cookie de
 * sessão — não valida o JWT. Isso é proposital: ela existe para rotear
 * (mandar quem não está logado para o /login) e evitar renderizar o painel à
 * toa. Quem realmente protege os dados são as policies de RLS da tabela
 * `pacientes_fila`, que validam o JWT dentro do Postgres. Um cookie forjado
 * faz o painel abrir vazio e toda escrita falhar, não vaza nem altera nada.
 */

/**
 * O @supabase/ssr grava `sb-<ref>-auth-token` ou, quando o JWT passa do limite
 * de 4 KB, os fragmentos `sb-<ref>-auth-token.0`, `.1`, etc.
 */
function isSessionCookieName(name: string): boolean {
  return name === AUTH_COOKIE_PREFIX || name.startsWith(`${AUTH_COOKIE_PREFIX}.`);
}

/** Há sessão quando existe ao menos um cookie de sessão com valor não vazio. */
function hasSessionCookie(cookies: Iterable<[string, string]>): boolean {
  for (const [name, value] of cookies) {
    if (isSessionCookieName(name) && value.length > 0) return true;
  }
  return false;
}

/** Converte `document.cookie` ("nome=valor; nome=valor") em pares nome/valor. */
function parseDocumentCookies(): Array<[string, string]> {
  if (typeof document === "undefined") return [];

  const pairs: Array<[string, string]> = [];
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    pairs.push([trimmed.slice(0, separator), trimmed.slice(separator + 1)]);
  }
  return pairs;
}

/**
 * Verificação síncrona da sessão, usável tanto no `beforeLoad` do SSR quanto no
 * cliente. O branch `.server` é removido do bundle do cliente pelo plugin do
 * TanStack Start.
 *
 * Varremos todos os cookies em vez de pedir um nome exato, porque o nome final
 * depende de o JWT ter sido fragmentado ou não.
 */
export const isAuthenticated = createIsomorphicFn()
  .server(() => hasSessionCookie(Object.entries(getCookies())))
  .client(() => hasSessionCookie(parseDocumentCookies()));

export type SignInResult = { ok: true } | { ok: false; message: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (!error) return { ok: true };

  // Credencial errada é o caso esperado; qualquer outra coisa (rede, projeto
  // fora do ar, e-mail não confirmado) merece uma mensagem diferente e o log.
  if (error.code === "invalid_credentials" || error.status === 400) {
    return { ok: false, message: "E-mail ou senha inválidos." };
  }

  console.error("Falha no login do painel.", error);
  return { ok: false, message: "Não foi possível entrar. Tente novamente." };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Falha ao encerrar a sessão.", error);
}

/**
 * E-mail do usuário de atendimento: alguns controles do painel (filtro por
 * unidade, "Limpar todas as filas") só aparecem para ele. É só uma
 * checagem de UI — quem protege os dados de verdade é a RLS (ver nota acima).
 */
export const ATENDIMENTO_EMAIL = "atendimentoipr@gmail.com";

/**
 * E-mail da gerente comercial: só ela vê a aba "Gestão" do /rodizio, com o
 * override manual de status. Também é só checagem de UI — ver nota acima.
 */
export const GERENCIA_EMAIL = "gerenciacomercialipr@gmail.com";

/**
 * Login compartilhado do setor de vendas. Vai direto para o /rodizio e não
 * acessa a fila de avaliações; cada celular escolhe o próprio vendedor na tela.
 * Também é só roteamento de UI — ver nota acima.
 */
export const VENDAS_EMAIL = "vendasipr@gmail.com";
