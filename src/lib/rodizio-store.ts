import { toast } from "sonner";
import { isMissingColumnError, supabase } from "@/lib/supabase";
import type { Database } from "@/types/supabase";

/**
 * Camada de acesso ao rodízio de vendedores (rota `/rodizio`).
 *
 * Mesmo desenho do `queue-store`: cache em módulo, sincronizado por Supabase
 * Realtime nas tabelas `vendedores_rodizio` e `atendimentos_vendas`. Qualquer
 * mudança feita no celular de um vendedor dispara um refetch em todas as telas.
 *
 * A ordem da fila deriva só de `entrou_fila_em`: o próximo é o disponível com o
 * timestamp mais antigo. Voltar a ficar disponível (de pausa, almoço ou de um
 * atendimento) regrava esse timestamp, o que manda o vendedor para o fim.
 *
 * Vários aparelhos escrevem ao mesmo tempo, então toda escrita leva uma guarda
 * no WHERE (`status` esperado): se outro celular chegou antes, o UPDATE não
 * casa nenhuma linha e a ação vira um no-op seguido de refetch.
 */

export type VendedorRow = Database["public"]["Tables"]["vendedores_rodizio"]["Row"];
export type AtendimentoRow = Database["public"]["Tables"]["atendimentos_vendas"]["Row"];

export type VendedorStatus = "disponivel" | "em_atendimento" | "almoco" | "pausa" | "ausente";

/** Status que o próprio vendedor ou a gerência escolhem — `em_atendimento` só via iniciar/finalizar. */
export type StatusManual = Exclude<VendedorStatus, "em_atendimento">;

export const STATUS_LABEL: Record<VendedorStatus, string> = {
  disponivel: "Disponível",
  em_atendimento: "Em atendimento",
  almoco: "Almoço",
  pausa: "Pausa",
  ausente: "Ausente",
};

export const STATUS_EMOJI: Record<VendedorStatus, string> = {
  disponivel: "🟢",
  em_atendimento: "🤝",
  almoco: "🍱",
  pausa: "☕",
  ausente: "",
};

export interface RodizioSnapshot {
  vendedores: VendedorRow[];
  /** Atendimentos em andamento (de qualquer dia) ou iniciados hoje. */
  atendimentos: AtendimentoRow[];
  /** `false` até o primeiro fetch: lista vazia aqui é "carregando", não "sem vendedores". */
  carregado: boolean;
}

const VENDEDORES = "vendedores_rodizio";
const ATENDIMENTOS = "atendimentos_vendas";

const VENDEDOR_COLUMNS =
  "id, nome, email, ativo, status, entrou_fila_em, total_atendimentos, created_at, updated_at";
const ATENDIMENTO_COLUMNS =
  "id, vendedor_id, status, inicio_atendimento, fim_atendimento, cliente_nome, cliente_telefone, created_at";

type Listener = (snapshot: RodizioSnapshot) => void;

const EMPTY: RodizioSnapshot = { vendedores: [], atendimentos: [], carregado: false };

const listeners = new Set<Listener>();
let cache: RodizioSnapshot = EMPTY;
let initialized = false;

const isBrowser = () => typeof window !== "undefined";

function emit() {
  for (const listener of listeners) listener(cache);
}

/**
 * Coluna ausente ganha mensagem própria, como no queue-store: o texto genérico
 * ("Não foi possível carregar o rodízio") esconderia que falta rodar migração.
 */
const MIGRACAO_PENDENTE_MESSAGE =
  "O banco está desatualizado: rode as migrações pendentes de supabase/migrations.";

function reportError(message: string, error: unknown): void {
  console.error(message, error);
  toast.error(isMissingColumnError(error) ? MIGRACAO_PENDENTE_MESSAGE : message);
}

/** 00:00 de hoje no fuso do aparelho — "atendimentos do dia" é o dia local da loja. */
function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

async function fetchSnapshot(): Promise<RodizioSnapshot | null> {
  const [vendedores, atendimentos] = await Promise.all([
    supabase
      .from(VENDEDORES)
      .select(VENDEDOR_COLUMNS)
      .eq("ativo", true)
      .order("entrou_fila_em", { ascending: true }),
    supabase
      .from(ATENDIMENTOS)
      .select(ATENDIMENTO_COLUMNS)
      .or(`status.eq.em_andamento,inicio_atendimento.gte.${startOfToday().toISOString()}`)
      .order("inicio_atendimento", { ascending: true }),
  ]);

  if (vendedores.error || atendimentos.error) {
    reportError("Não foi possível carregar o rodízio.", vendedores.error ?? atendimentos.error);
    return null;
  }

  return {
    vendedores: vendedores.data as VendedorRow[],
    atendimentos: atendimentos.data as AtendimentoRow[],
    carregado: true,
  };
}

async function refetch(): Promise<void> {
  const snapshot = await fetchSnapshot();
  if (!snapshot) return;
  cache = snapshot;
  emit();
}

function ensureInit() {
  if (initialized || !isBrowser()) return;
  initialized = true;

  void refetch();

  // Refetch completo por evento, como no queue-store: o volume é pequeno e
  // evita merge incremental de payloads das duas tabelas.
  supabase
    .channel("rodizio_vendas")
    .on("postgres_changes", { event: "*", schema: "public", table: VENDEDORES }, () => {
      void refetch();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: ATENDIMENTOS }, () => {
      void refetch();
    })
    .subscribe();
}

export function getSnapshot(): RodizioSnapshot {
  ensureInit();
  return cache;
}

export function getServerSnapshot(): RodizioSnapshot {
  return EMPTY;
}

export function subscribe(listener: Listener): () => void {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/* ------------------------------------------------------------------ */
/* Seletores                                                           */
/* ------------------------------------------------------------------ */

/** Fila do rodízio: disponíveis, do mais antigo em `entrou_fila_em` para o mais novo. */
export function sortFila(vendedores: VendedorRow[]): VendedorRow[] {
  return vendedores
    .filter((v) => v.status === "disponivel")
    .sort((a, b) => Date.parse(a.entrou_fila_em) - Date.parse(b.entrou_fila_em));
}

export function emAtendimento(vendedores: VendedorRow[]): VendedorRow[] {
  return vendedores.filter((v) => v.status === "em_atendimento");
}

/** Fora da fila temporariamente: almoço, pausa ou ausente. */
export function emPausa(vendedores: VendedorRow[]): VendedorRow[] {
  return vendedores
    .filter((v) => v.status !== "disponivel" && v.status !== "em_atendimento")
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function atendimentoAberto(
  atendimentos: AtendimentoRow[],
  vendedorId: string,
): AtendimentoRow | null {
  return (
    atendimentos.find((a) => a.vendedor_id === vendedorId && a.status === "em_andamento") ?? null
  );
}

/** Atendimentos concluídos hoje pelo vendedor. */
export function atendimentosHoje(atendimentos: AtendimentoRow[], vendedorId: string): number {
  const inicioDoDia = startOfToday().getTime();
  return atendimentos.filter(
    (a) =>
      a.vendedor_id === vendedorId &&
      a.status === "concluido" &&
      Date.parse(a.inicio_atendimento) >= inicioDoDia,
  ).length;
}

/** `ms` → "42 seg" abaixo de 1 min, "07 min 42 seg" depois (com horas quando passa de 60 min). */
export function formatDuracao(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (totalSeconds < 60) return `${seconds} seg`;
  const pad = (n: number) => String(n).padStart(2, "0");
  const base = `${pad(minutes)} min ${pad(seconds)} seg`;
  return hours > 0 ? `${hours} h ${base}` : base;
}

/** Minúsculas, sem acentos e sem espaços extras: "  Aná  " e "ana" casam. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Mínimo de letras antes de sugerir nomes: abaixo disso a lista exporia quase todos. */
export const MIN_LETRAS_SUGESTAO = 2;
const MAX_SUGESTOES = 5;

/**
 * Sugestões do "Digite o seu nome". Só casa o começo de uma palavra do nome
 * (ou o nome inteiro, para "ana so") — digitar duas letras soltas do meio de
 * um nome não revela ninguém, o que induz cada um a digitar o próprio nome.
 */
export function sugerirVendedores(vendedores: VendedorRow[], texto: string): VendedorRow[] {
  const busca = normalizarBusca(texto);
  if (busca.replace(/\s/g, "").length < MIN_LETRAS_SUGESTAO) return [];

  return vendedores
    .filter((v) => {
      const nome = normalizarBusca(v.nome);
      return nome.startsWith(busca) || nome.split(" ").some((parte) => parte.startsWith(busca));
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .slice(0, MAX_SUGESTOES);
}

export function statusLabel(status: string): string {
  return STATUS_LABEL[status as VendedorStatus] ?? status;
}

export function statusEmoji(status: string): string {
  return STATUS_EMOJI[status as VendedorStatus] ?? "⚪";
}

/* ------------------------------------------------------------------ */
/* Ações                                                               */
/* ------------------------------------------------------------------ */

/**
 * Troca o status do vendedor. Ficar disponível regrava `entrou_fila_em`, o que
 * o coloca no fim da fila — quem volta do almoço não fura a vez.
 *
 * Guardas: quem está em atendimento precisa finalizar antes (senão o
 * atendimento ficaria aberto para sempre), e reaplicar o status atual não faz
 * nada (clicar de novo em "Disponível" não perde a posição).
 */
export async function setStatus(vendedorId: string, status: StatusManual): Promise<void> {
  ensureInit();

  const { error } = await supabase
    .from(VENDEDORES)
    .update(
      status === "disponivel" ? { status, entrou_fila_em: new Date().toISOString() } : { status },
    )
    .eq("id", vendedorId)
    .neq("status", "em_atendimento")
    .neq("status", status);

  if (error) reportError("Não foi possível alterar o status.", error);

  await refetch();
}

/**
 * Move o vendedor uma posição para cima/baixo na fila trocando `entrou_fila_em`
 * com o adjacente. Relê a fila no banco (por id, não por índice) porque a tela
 * pode estar atrasada em relação a outro aparelho.
 */
export async function moveVendedor(vendedorId: string, direction: "up" | "down"): Promise<void> {
  ensureInit();

  const { data, error: readError } = await supabase
    .from(VENDEDORES)
    .select("id, entrou_fila_em")
    .eq("status", "disponivel")
    .eq("ativo", true)
    .order("entrou_fila_em", { ascending: true });

  if (readError || !data) {
    reportError("Não foi possível reordenar a fila.", readError);
    return;
  }

  const rows = data as Pick<VendedorRow, "id" | "entrou_fila_em">[];
  const index = rows.findIndex((r) => r.id === vendedorId);
  const current = rows[index];
  const target = rows[direction === "up" ? index - 1 : index + 1];

  // Fora da fila ou sem vizinho: a fila mudou entre o render e o clique.
  if (!current || !target) {
    await refetch();
    return;
  }

  const [{ error: currentError }, { error: targetError }] = await Promise.all([
    supabase
      .from(VENDEDORES)
      .update({ entrou_fila_em: target.entrou_fila_em })
      .eq("id", current.id)
      .eq("status", "disponivel"),
    supabase
      .from(VENDEDORES)
      .update({ entrou_fila_em: current.entrou_fila_em })
      .eq("id", target.id)
      .eq("status", "disponivel"),
  ]);

  if (currentError || targetError) {
    reportError("Não foi possível reordenar a fila.", currentError ?? targetError);
  }

  await refetch();
}

/**
 * O vendedor assume o cliente. Qualquer disponível pode iniciar, não só o 1º
 * (ex.: cliente que procurou alguém específico): a tela pede confirmação para
 * quem está fora da vez. Quem fica na frente não perde a posição, porque o
 * `entrou_fila_em` dele não muda.
 */
export async function iniciarAtendimento(vendedorId: string): Promise<void> {
  ensureInit();

  // Reserva a vez: se outro aparelho já tirou este vendedor de `disponivel`,
  // o UPDATE não casa nenhuma linha.
  const { data: claimed, error: claimError } = await supabase
    .from(VENDEDORES)
    .update({ status: "em_atendimento" })
    .eq("id", vendedorId)
    .eq("status", "disponivel")
    .select("id");

  if (claimError) {
    reportError("Não foi possível iniciar o atendimento.", claimError);
    return;
  }

  if (!claimed || claimed.length === 0) {
    await refetch();
    return;
  }

  const { error: insertError } = await supabase.from(ATENDIMENTOS).insert({
    vendedor_id: vendedorId,
    inicio_atendimento: new Date().toISOString(),
    status: "em_andamento",
  });

  if (insertError) {
    // Desfaz a reserva sem tocar em `entrou_fila_em`: o vendedor volta para a
    // mesma posição em vez de ir para o fim da fila por uma falha nossa.
    await supabase
      .from(VENDEDORES)
      .update({ status: "disponivel" })
      .eq("id", vendedorId)
      .eq("status", "em_atendimento");
    reportError("Não foi possível registrar o atendimento.", insertError);
  }

  await refetch();
}

/**
 * Fecha o atendimento aberto e devolve o vendedor ao fim da fila, somando 1 ao
 * acumulado. O UPDATE do atendimento vem primeiro e serve de trava: num duplo
 * clique, o segundo não encontra atendimento aberto e não incrementa de novo.
 */
export async function finalizarAtendimento(vendedorId: string): Promise<void> {
  ensureInit();

  const agora = new Date().toISOString();

  const { data: fechados, error: closeError } = await supabase
    .from(ATENDIMENTOS)
    .update({ fim_atendimento: agora, status: "concluido" })
    .eq("vendedor_id", vendedorId)
    .eq("status", "em_andamento")
    .select("id");

  if (closeError) {
    reportError("Não foi possível finalizar o atendimento.", closeError);
    return;
  }

  const { data: vendedor, error: readError } = await supabase
    .from(VENDEDORES)
    .select("total_atendimentos, status")
    .eq("id", vendedorId)
    .single();

  if (readError || !vendedor) {
    reportError("Não foi possível atualizar o vendedor.", readError);
    await refetch();
    return;
  }

  const atual = vendedor as Pick<VendedorRow, "total_atendimentos" | "status">;

  // Nenhum atendimento aberto e o vendedor já fora de `em_atendimento`: outro
  // clique/aparelho já finalizou. Se ainda está em atendimento sem registro
  // aberto (ex.: falha no meio do caminho), liberamos sem incrementar.
  if (!fechados || fechados.length === 0) {
    if (atual.status === "em_atendimento") {
      await supabase
        .from(VENDEDORES)
        .update({ status: "disponivel", entrou_fila_em: agora })
        .eq("id", vendedorId)
        .eq("status", "em_atendimento");
    }
    await refetch();
    return;
  }

  const { error: updateError } = await supabase
    .from(VENDEDORES)
    .update({
      status: "disponivel",
      entrou_fila_em: agora,
      total_atendimentos: atual.total_atendimentos + 1,
    })
    .eq("id", vendedorId)
    .eq("status", "em_atendimento");

  if (updateError) reportError("Não foi possível devolver o vendedor à fila.", updateError);

  await refetch();
}

/* ------------------------------------------------------------------ */
/* Cadastro (aba Gestão)                                               */
/* ------------------------------------------------------------------ */

/**
 * Cadastra o vendedor como Ausente: ele entra na fila só quando tocar em
 * "Disponível", e aí vai para o fim — não cai no meio da fila antes de chegar.
 *
 * Retorna `true` em caso de sucesso, para o modal decidir se fecha.
 */
export async function addVendedor(nome: string): Promise<boolean> {
  ensureInit();

  const { error } = await supabase
    .from(VENDEDORES)
    .insert({ nome: nome.trim(), status: "ausente" });

  if (error) {
    reportError("Não foi possível adicionar o vendedor.", error);
    return false;
  }

  await refetch();
  return true;
}

export async function updateVendedor(vendedorId: string, nome: string): Promise<boolean> {
  ensureInit();

  const { error } = await supabase
    .from(VENDEDORES)
    .update({ nome: nome.trim() })
    .eq("id", vendedorId);

  if (error) {
    reportError("Não foi possível salvar o vendedor.", error);
    return false;
  }

  await refetch();
  return true;
}

/**
 * Tira o vendedor do rodízio (soft delete, ver migração `vendedores_ativo`).
 * Quem está atendendo precisa finalizar antes: senão o atendimento ficaria
 * aberto para sempre, sem ninguém na tela para encerrá-lo.
 */
export async function removeVendedor(vendedorId: string): Promise<void> {
  ensureInit();

  const { data, error } = await supabase
    .from(VENDEDORES)
    .update({ ativo: false, status: "ausente" })
    .eq("id", vendedorId)
    .neq("status", "em_atendimento")
    .select("id");

  if (error) {
    reportError("Não foi possível remover o vendedor.", error);
  } else if (!data || data.length === 0) {
    toast.warning("Finalize o atendimento antes de remover o vendedor.");
  }

  await refetch();
}
