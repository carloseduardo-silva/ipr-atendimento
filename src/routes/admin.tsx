import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, EyeOff, LogOut, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { ClinicHeader } from "@/components/ClinicHeader";
import { ATENDIMENTO_EMAIL, isAuthenticated, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AddPatientForm } from "@/components/admin/AddPatientForm";
import { PatientLinkCard } from "@/components/admin/PatientLinkCard";
import { QueueList } from "@/components/admin/QueueList";
import { QueueMetrics } from "@/components/admin/QueueMetrics";
import { CurrentPatientCard } from "@/components/admin/CurrentPatientCard";
import { ClearQueueDialog } from "@/components/admin/ClearQueueDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNow } from "@/hooks/use-now";
import { useQueue } from "@/hooks/use-queue";
import { useHiddenMedicos } from "@/hooks/use-hidden-medicos";
import { useHideAddPatientForm } from "@/hooks/use-hide-add-patient-form";
import { useCurrentUserEmail } from "@/hooks/use-current-user-email";
import { cn } from "@/lib/utils";
import { MEDICO_UNIDADE, MEDICOS, UNIDADES, type Medico, type Unidade } from "@/lib/medicos";
import {
  callNext,
  finishCurrentPatient,
  movePatient,
  removePatient,
  resetQueue,
  returnPatientToQueue,
  sortWaiting,
  transferPatient,
} from "@/lib/queue-store";
import type { Patient } from "@/types/patient";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel da Fila | Instituto Pedro Ruiz" },
      {
        name: "description",
        content:
          "Painel do atendente para adicionar pacientes, gerar links de sala de espera e chamar a próxima da fila.",
      },
      { property: "og:title", content: "Painel da Fila | Instituto Pedro Ruiz" },
      {
        property: "og:description",
        content:
          "Gerencie a fila de avaliações online do Instituto Pedro Ruiz em tempo real.",
      },
    ],
  }),
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const router = useRouter();
  const patients = useQueue();
  // Um único relógio para o painel: prazos dos cards e métricas avançam juntos,
  // sem que o atendente precise recarregar a página.
  const now = useNow();
  const [lastAdded, setLastAdded] = useState<Patient | null>(null);
  const [medicoAtivo, setMedicoAtivo] = useState<string>(MEDICOS[0]);
  const [search, setSearch] = useState("");
  const { hidden: hiddenMedicos, toggle: toggleMedicoHidden } = useHiddenMedicos();
  const { hidden: hideAddForm, toggle: toggleAddForm } = useHideAddPatientForm();
  const currentUserEmail = useCurrentUserEmail();
  const isAtendimentoUser = currentUserEmail === ATENDIMENTO_EMAIL;
  const [unidadeFiltro, setUnidadeFiltro] = useState<Unidade | "todas">("todas");

  async function handleSignOut() {
    await signOut();
    await router.invalidate();
    await router.navigate({ to: "/login" });
  }

  // Sessão encerrada em outra aba ou token expirado: sem isto o painel ficaria
  // aberto com sessão morta e toda escrita falharia por RLS, sem explicação.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void router.invalidate().then(() => router.navigate({ to: "/login" }));
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  // Abas: os médicos da constante mais qualquer outro já presente no banco, para
  // que linhas antigas (ou de um médico removido da lista) não fiquem invisíveis.
  const medicos = [
    ...MEDICOS,
    ...[...new Set(patients.map((p) => p.medico))]
      .filter((m) => m && !MEDICOS.includes(m as (typeof MEDICOS)[number]))
      .sort(),
  ];

  // Filtro por unidade: só o usuário de atendimento tem acesso, e afeta
  // apenas as abas exibidas — os seletores de "Adicionar"/"Transferir"
  // continuam oferecendo todos os médicos, sem essa restrição.
  const medicosDaUnidade =
    isAtendimentoUser && unidadeFiltro !== "todas"
      ? medicos.filter((m) => MEDICO_UNIDADE[m as Medico] === unidadeFiltro)
      : medicos;

  // Vendedores só gerenciam algumas filas: a oculta some das abas, mas nunca
  // some da lista de gerenciamento nem perde pacientes — é só visualização.
  const medicosVisiveis = medicosDaUnidade.filter((m) => !hiddenMedicos.has(m));

  // Se a aba ativa foi ocultada (por este vendedor ou em outra aba), cai para
  // a primeira ainda visível em vez de deixar o painel preso numa fila oculta.
  useEffect(() => {
    const [primeiroVisivel] = medicosVisiveis;
    if (primeiroVisivel && !medicosVisiveis.includes(medicoAtivo)) {
      setMedicoAtivo(primeiroVisivel);
    }
  }, [medicoAtivo, medicosVisiveis]);

  const waiting = sortWaiting(patients, medicoAtivo);
  const current =
    patients.find((p) => p.status === "em_atendimento" && p.medico === medicoAtivo) ?? null;
  const done = patients.filter(
    (p) => p.status === "concluido" && p.medico === medicoAtivo,
  );

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader
        subtitle="Painel de gestão da fila"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label={
                hideAddForm
                  ? "Mostrar o formulário de adicionar paciente"
                  : "Ocultar o formulário de adicionar paciente"
              }
              title={
                hideAddForm
                  ? "Mostrar o formulário de adicionar paciente"
                  : "Ocultar o formulário de adicionar paciente (cadastro é feito pelo SDR do atendimento)"
              }
              onClick={toggleAddForm}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              {hideAddForm ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {hideAddForm ? "Mostrar cadastro" : "Ocultar cadastro"}
              </span>
            </button>
            <Link
              to="/espera"
              search={{ id: undefined }}
              aria-label="Ver sala de espera"
              title="Ver sala de espera"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Ver sala de espera</span>
            </Link>
            <button
              type="button"
              aria-label="Sair"
              title="Sair"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-5 sm:py-8">
        <h1 className="text-2xl font-semibold text-foreground">Fila de avaliações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada médico tem a sua fila independente. As pacientes acompanham a posição em tempo
          real pela sala de espera virtual.
        </p>

        <div
          className={cn(
            // `grid-cols-1` explícito é essencial: sem coluna definida, o grid usa
            // sizing "auto" abaixo do `lg:` e deixa a única coluna crescer até o
            // maior conteúdo (ex.: as abas de médico sem quebra), estourando a
            // largura da página inteira no mobile.
            "mt-8 grid grid-cols-1 gap-6",
            hideAddForm ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]",
          )}
        >
          {!hideAddForm ? (
            <div className="space-y-5">
              <AddPatientForm onAdded={setLastAdded} />
              {lastAdded ? <PatientLinkCard patient={lastAdded} /> : null}
            </div>
          ) : null}

          <div className="space-y-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou telefone…"
                aria-label="Buscar paciente na fila"
                className="w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <QueueMetrics waiting={waiting} now={now} />

            {/* Só o TabsList: o conteúdo abaixo é único e já derivado de `medicoAtivo`,
                o que evita duplicar a árvore por médico e preserva o estado do QueueList. */}
            {isAtendimentoUser ? (
              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border p-1">
                {(["todas", ...UNIDADES] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnidadeFiltro(u)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      unidadeFiltro === u
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary",
                    )}
                  >
                    {u === "todas" ? "Todas as unidades" : u}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-start gap-2">
              {medicosVisiveis.length > 0 ? (
                <Tabs value={medicoAtivo} onValueChange={setMedicoAtivo} className="min-w-0 flex-1">
                  <TabsList className="h-auto w-full max-w-full justify-start overflow-x-auto rounded-xl p-1">
                    {medicosVisiveis.map((m) => (
                      <TabsTrigger key={m} value={m} className="rounded-lg px-3 py-2">
                        {m}
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                          {sortWaiting(patients, m).length}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              ) : (
                <p className="min-w-0 flex-1 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  Nenhuma fila visível. Use "Filas visíveis" para exibir alguma.
                </p>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Escolher quais filas de médico aparecem neste painel"
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                  >
                    <EyeOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Filas visíveis</span>
                    
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Filas exibidas neste painel</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {medicos.map((m) => (
                    <DropdownMenuCheckboxItem
                      key={m}
                      checked={!hiddenMedicos.has(m)}
                      onCheckedChange={() => toggleMedicoHidden(m)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {m}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CurrentPatientCard
              patient={current}
              onDelete={(id) => void removePatient(id)}
              onFinish={() => void finishCurrentPatient(medicoAtivo)}
              onReturnToQueue={(id) => void returnPatientToQueue(id, medicoAtivo)}
            />
            <QueueList
              waiting={waiting}
              medico={medicoAtivo}
              search={search}
              now={now}
              onCallNext={() => void callNext(medicoAtivo)}
              onDelete={(id) => void removePatient(id)}
              onMove={(index, direction) => movePatient(medicoAtivo, index, direction)}
              onTransfer={(id, medico) => transferPatient(id, medico)}
            />

            {done.length > 0 ? (
              <details className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Atendimentos concluídos ({done.length})
                </summary>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {done.map((p) => (
                    <li key={p.id}>{p.nome}</li>
                  ))}
                </ul>
                {isAtendimentoUser ? (
                  <ClearQueueDialog onConfirm={() => void resetQueue()} />
                ) : null}
              </details>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
