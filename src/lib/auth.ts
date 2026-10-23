import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookies } from "@tanstack/react-start/server";
import { AUTH_COOKIE_PREFIX, supabase } from "@/lib/supabase";

/**
 * Camada de acesso à autenticação dos dois sistemas (Supabase Auth, e-mail +
 * senha): a fila de avaliações (`/atendimento`) e o rodízio de vendas
 * (`/vendas`). A sessão vive em cookies, gravados pelo @supabase/ssr.
 *
 * IMPORTANTE: `getSessionSetor` lê o e-mail do cookie de sessão *sem validar*
 * o JWT. Isso é proposital: ela existe para rotear (mandar cada conta para o
 * login/sistema do seu setor) e não renderizar um sistema para o setor errado.
 * Quem realmente protege os dados são as policies de RLS, que validam o JWT
 * dentro do Postgres. Um cookie forjado faz a tela abrir vazia e toda escrita
 * falhar, não vaza nem altera nada.
 */

/**
 * Remonta o valor do cookie de sessão. O @supabase/ssr grava `sb-<ref>-auth-token`
 * ou, quando passa do limite de 4 KB, os fragmentos `sb-<ref>-auth-token.0`,
 * `.1`, etc. — mesma regra do `combineChunks` da biblioteca.
 */
function readSessionCookie(cookies: Iterable<[string, string]>): string | null {
  const byName = new Map(cookies);
  const whole = byName.get(AUTH_COOKIE_PREFIX);
  if (whole) return whole;

  const chunks: string[] = [];
  for (let i = 0; ; i++) {
    const chunk = byName.get(`${AUTH_COOKIE_PREFIX}.${i}`);
    if (!chunk) break;
    chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks.join("") : null;
}

/** base64url → texto UTF-8; `atob` existe no navegador e no runtime do servidor. */
function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * E-mail da sessão gravada no cookie, ou `null` se não há sessão ou o cookie
 * é ilegível. O @supabase/ssr grava `base64-` + JSON da sessão em base64url.
 */
function sessionEmailFromCookies(cookies: Iterable<[string, string]>): string | null {
  const raw = readSessionCookie(cookies);
  if (!raw) return null;
  try {
    const json = raw.startsWith("base64-")
      ? decodeBase64Url(raw.slice("base64-".length))
      : decodeURIComponent(raw);
    const session: unknown = JSON.parse(json);
    if (typeof session !== "object" || session === null) return null;

    const user = (session as { user?: { email?: unknown } }).user;
    if (typeof user?.email === "string") return user.email;

    // Sem `user` no cookie: o e-mail também vem no payload do access token.
    const token = (session as { access_token?: unknown }).access_token;
    if (typeof token !== "string") return null;
    const payload: unknown = JSON.parse(decodeBase64Url(token.split(".")[1] ?? ""));
    const email = (payload as { email?: unknown } | null)?.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
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

/** Cada conta pertence a um sistema: a fila de avaliações ou o rodízio de vendas. */
export type Setor = "atendimento" | "vendas";

export const SETOR_LABEL: Record<Setor, string> = {
  atendimento: "Atendimento",
  vendas: "Vendas",
};

/** Vendas e gerência comercial usam o rodízio; qualquer outra conta, a fila. */
export function setorDoEmail(email: string): Setor {
  const normalizado = email.trim().toLowerCase();
  return normalizado === VENDAS_EMAIL || normalizado === GERENCIA_EMAIL ? "vendas" : "atendimento";
}

/**
 * Setor da sessão atual (`null` = ninguém logado), usável tanto no `beforeLoad`
 * do SSR quanto no cliente. O branch `.server` é removido do bundle do cliente
 * pelo plugin do TanStack Start.
 *
 * Síncrona e sem rede de propósito: lê o cookie em vez de `getSession()`, que
 * no servidor poderia girar o refresh token sem conseguir gravar o cookie novo.
 */
export const getSessionSetor = createIsomorphicFn()
  .server((): Setor | null => {
    const email = sessionEmailFromCookies(Object.entries(getCookies()));
    return email ? setorDoEmail(email) : null;
  })
  .client((): Setor | null => {
    const email = sessionEmailFromCookies(parseDocumentCookies());
    return email ? setorDoEmail(email) : null;
  });

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
 * E-mail da gerente comercial: setor de vendas; só ela vê a aba "Gestão" do
 * /vendas, com o override manual de status. Também é só checagem de UI — ver
 * nota acima.
 */
export const GERENCIA_EMAIL = "gerenciacomercialipr@gmail.com";

/**
 * Login compartilhado do setor de vendas. Usa só o /vendas e não acessa a fila
 * de avaliações; cada celular escolhe o próprio vendedor na tela. Também é só
 * roteamento de UI — ver nota acima.
 */
export const VENDAS_EMAIL = "vendasipr@gmail.com";
