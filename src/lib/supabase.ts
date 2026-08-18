import { createBrowserClient } from "@supabase/ssr";
import type { Patient, PatientStatus } from "@/types/patient";

/**
 * Cliente Supabase compartilhado pela aplicação.
 *
 * As credenciais vêm de variáveis `VITE_*`, que são embutidas no bundle do
 * cliente — por isso apenas a chave anônima (anon key) pode ser usada aqui.
 * A proteção real dos dados depende das policies de RLS configuradas no
 * projeto Supabase, nunca do segredo destas variáveis.
 *
 * Usamos `createBrowserClient` do @supabase/ssr (em vez do `createClient`
 * padrão) para que a sessão do Supabase Auth fique em cookies, e não em
 * localStorage: assim o `beforeLoad` do TanStack Start consegue barrar o
 * /admin já no servidor. O fragmento em vários cookies, quando o JWT passa do
 * limite de 4 KB, é tratado pela própria biblioteca.
 */

const url = import.meta.env["VITE_SUPABASE_URL"];
const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"];

if (!url || !anonKey) {
  throw new Error(
    "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (veja .env.example).",
  );
}

export const supabase = createBrowserClient(url, anonKey);

/** `https://<ref>.supabase.co` → `<ref>` */
const projectRef = new URL(url).hostname.split(".")[0] ?? "";

/**
 * Prefixo dos cookies de sessão gravados pelo @supabase/ssr: `sb-<ref>-auth-token`
 * e, quando fragmentado, `sb-<ref>-auth-token.0`, `.1`, etc.
 */
export const AUTH_COOKIE_PREFIX = `sb-${projectRef}-auth-token`;

/** Tabela única do MVP: a fila de avaliações. */
export const TABLE = "pacientes_fila";

/** Colunas lidas nas consultas — evita depender de `select("*")`. */
export const COLUMNS = "id, nome, status, created_at, medico";

/** Formato da linha no banco (snake_case, `created_at` como ISO string). */
export interface PacienteFilaRow {
  id: string;
  nome: string;
  medico: string;
  status: PatientStatus;
  created_at: string;
}

/**
 * Converte a linha do banco para o `Patient` usado pela UI, que trabalha com
 * `createdAt` em milissegundos (epoch).
 */
export function toPatient(row: PacienteFilaRow): Patient {
  return {
    id: row.id,
    nome: row.nome,
    medico: row.medico,
    status: row.status,
    createdAt: Date.parse(row.created_at),
  };
}
