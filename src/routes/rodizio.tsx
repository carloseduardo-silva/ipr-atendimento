import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { ClinicHeader } from "@/components/ClinicHeader";
import { AtendimentoAtivoCard } from "@/components/rodizio/AtendimentoAtivoCard";
import { GestaoPanel } from "@/components/rodizio/GestaoPanel";
import { MeuStatusCard } from "@/components/rodizio/MeuStatusCard";
import { QuemEVoceCard } from "@/components/rodizio/QuemEVoceCard";
import { RodizioQueue } from "@/components/rodizio/RodizioQueue";
import { RodizioStepper } from "@/components/rodizio/RodizioStepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUserEmail } from "@/hooks/use-current-user-email";
import { useNow } from "@/hooks/use-now";
import { useRodizio } from "@/hooks/use-rodizio";
import { useVendedorDoAparelho } from "@/hooks/use-vendedor-do-aparelho";
import { GERENCIA_EMAIL, isAuthenticated, signOut } from "@/lib/auth";
import {
  addVendedor,
  atendimentoAberto,
  finalizarAtendimento,
  iniciarAtendimento,
  moveVendedor,
  removeVendedor,
  setStatus,
  sortFila,
  updateVendedor,
} from "@/lib/rodizio-store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/rodizio")({
  head: () => ({
    meta: [
      { title: "Fila de Atendimento | Instituto Pedro Ruiz" },
      {
        name: "description",
        content: "Fila de rodízio dos vendedores do Instituto Pedro Ruiz, em tempo real.",
      },
    ],
  }),
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/login", search: { redirect: "/rodizio" } });
    }
  },
  component: RodizioPage,
});

function RodizioPage() {
  const router = useRouter();
  const snapshot = useRodizio();
  // Relógio de 1 s: o cronômetro do atendimento e os tempos da lista andam juntos.
  const now = useNow(1000);
  const email = useCurrentUserEmail();
  const isGerencia = email === GERENCIA_EMAIL;
  const { vendedorId, pronto, escolher, trocar } = useVendedorDoAparelho();
  const [aba, setAba] = useState<"rodizio" | "gestao">("rodizio");

  async function handleSignOut() {
    await signOut();
    await router.invalidate();
    await router.navigate({ to: "/login", search: { redirect: "/rodizio" } });
  }

  // Sessão encerrada em outra aba ou token expirado: volta para o login em vez
  // de deixar a tela aberta com toda escrita falhando por RLS.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void router
          .invalidate()
          .then(() => router.navigate({ to: "/login", search: { redirect: "/rodizio" } }));
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  // Login de vendas é compartilhado: quem é o vendedor vem da escolha salva
  // neste aparelho, não da sessão. A gerência também atende e se identifica
  // do mesmo jeito (precisa estar cadastrada como vendedora).
  const meuVendedor = (vendedorId && snapshot.vendedores.find((v) => v.id === vendedorId)) || null;

  // Vendedor salvo foi removido pela gerência: volta a pedir o nome. Só depois
  // do primeiro fetch, senão a lista ainda vazia apagaria toda escolha no load.
  useEffect(() => {
    if (snapshot.carregado && vendedorId && !snapshot.vendedores.some((v) => v.id === vendedorId)) {
      trocar();
    }
  }, [snapshot, vendedorId, trocar]);

  // Etapas do vendedor: primeiro só o "Quem é você", depois o rodízio. Enquanto
  // a sessão, o aparelho ou a lista não carregaram (ou o id salvo ainda não foi
  // conferido), mostra carregando — sem isso a fila piscaria antes do seletor.
  const etapa: "carregando" | "identificacao" | "rodizio" =
    !email || !pronto || !snapshot.carregado
      ? "carregando"
      : meuVendedor
        ? "rodizio"
        : vendedorId
          ? "carregando"
          : "identificacao";

  const fila = sortFila(snapshot.vendedores);
  const minhaPosicao = meuVendedor ? fila.findIndex((v) => v.id === meuVendedor.id) + 1 : 0;

  const rodizio = (
    <div className="space-y-5">
      {meuVendedor ? (
        <>
          {meuVendedor.status === "em_atendimento" ? (
            <AtendimentoAtivoCard
              atendimento={atendimentoAberto(snapshot.atendimentos, meuVendedor.id)}
              now={now}
              onFinalizar={() => finalizarAtendimento(meuVendedor.id)}
            />
          ) : null}
          <MeuStatusCard
            vendedor={meuVendedor}
            posicao={minhaPosicao}
            proximoNome={fila[0]?.nome ?? null}
            onSetStatus={(status) => setStatus(meuVendedor.id, status)}
            onIniciar={() => iniciarAtendimento(meuVendedor.id)}
            onTrocar={trocar}
          />
        </>
      ) : null}

      <RodizioQueue snapshot={snapshot} now={now} meuId={meuVendedor?.id ?? null} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader
        subtitle="Fila de atendimento IPR Brooklin"
        right={
          <div className="flex flex-wrap items-center gap-2">
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

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
        {isGerencia ? (
          <>
            <Titulo />
            <div className="mt-6">
              <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
                <TabsList className="grid w-full grid-cols-2 rounded-xl p-1">
                  <TabsTrigger value="rodizio" className="rounded-lg py-2">
                    Rodízio
                  </TabsTrigger>
                  <TabsTrigger value="gestao" className="rounded-lg py-2">
                    Gestão
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="rodizio" className="mt-5">
                  {/* Como no login de vendas: sem se identificar, só o "Quem é você".
                      A aba Gestão continua acessível (ex.: para a gerente se cadastrar). */}
                  {etapa === "carregando" ? (
                    <p className="py-16 text-center text-sm text-muted-foreground" role="status">
                      Carregando…
                    </p>
                  ) : etapa === "identificacao" ? (
                    <QuemEVoceCard vendedores={snapshot.vendedores} onEscolher={escolher} />
                  ) : (
                    rodizio
                  )}
                </TabsContent>
                <TabsContent value="gestao" className="mt-5">
                  <GestaoPanel
                    snapshot={snapshot}
                    now={now}
                    onSetStatus={setStatus}
                    onFinalizar={finalizarAtendimento}
                    onMove={moveVendedor}
                    onAdd={addVendedor}
                    onUpdate={updateVendedor}
                    onRemove={removeVendedor}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : etapa === "carregando" ? (
          <p className="py-16 text-center text-sm text-muted-foreground" role="status">
            Carregando…
          </p>
        ) : etapa === "identificacao" ? (
          <div className="mx-auto max-w-md space-y-6">
            <RodizioStepper atual={0} />
            <QuemEVoceCard vendedores={snapshot.vendedores} onEscolher={escolher} />
          </div>
        ) : (
          <>
            <Titulo />
            <div className="mt-6">{rodizio}</div>
          </>
        )}
      </main>
    </div>
  );
}

function Titulo() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground">Fila de atendimento IPR Brooklin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O próximo a atender é o disponível há mais tempo. <br /> Voltar da pausa ou terminar um
        atendimento leva você para o fim da fila. <br /> Quem estiver disponível também pode iniciar
        fora da vez, com confirmação.
      </p>
    </>
  );
}
