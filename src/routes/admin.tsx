import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, LogOut, Trash2 } from "lucide-react";
import { ClinicHeader } from "@/components/ClinicHeader";
import { isAuthenticated, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AddPatientForm } from "@/components/admin/AddPatientForm";
import { PatientLinkCard } from "@/components/admin/PatientLinkCard";
import { QueueList } from "@/components/admin/QueueList";
import { CurrentPatientCard } from "@/components/admin/CurrentPatientCard";
import { useQueue } from "@/hooks/use-queue";
import { callNext, resetQueue, sortWaiting } from "@/lib/queue-store";
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
  const [lastAdded, setLastAdded] = useState<Patient | null>(null);

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

  const waiting = sortWaiting(patients);
  const current = patients.find((p) => p.status === "em_atendimento") ?? null;
  const done = patients.filter((p) => p.status === "concluido");

  return (
    <div className="min-h-screen bg-background">
      <ClinicHeader
        subtitle="Painel de gestão da fila"
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/espera"
              search={{ id: undefined }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              <ExternalLink className="h-4 w-4" />
              Ver sala de espera
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <h1 className="text-2xl font-semibold text-foreground">Fila de avaliações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          As pacientes acompanham a posição em tempo real pela sala de espera virtual.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="space-y-5">
            <AddPatientForm onAdded={setLastAdded} />
            {lastAdded ? <PatientLinkCard patient={lastAdded} /> : null}
          </div>

          <div className="space-y-5">
            <CurrentPatientCard patient={current} />
            <QueueList waiting={waiting} onCallNext={() => void callNext()} />

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
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Apagar todas as pacientes da fila? Esta ação remove os registros do banco e afeta todas as telas abertas.",
                      )
                    ) {
                      void resetQueue();
                    }
                  }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar fila
                </button>
              </details>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
