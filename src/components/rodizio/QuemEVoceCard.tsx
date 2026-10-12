import { useId, useState, type KeyboardEvent } from "react";
import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MIN_LETRAS_SUGESTAO,
  normalizarBusca,
  sugerirVendedores,
  type VendedorRow,
} from "@/lib/rodizio-store";

interface QuemEVoceCardProps {
  vendedores: VendedorRow[];
  onEscolher: (vendedorId: string) => void;
}

const INPUT_CLASS =
  "mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

/**
 * Identificação do vendedor no login compartilhado de vendas. Em vez de uma
 * lista com todos os nomes, um autocomplete que só sugere depois de algumas
 * letras, seguido de confirmação ("Você é Fulana?") — o caminho natural é
 * digitar e confirmar o próprio nome.
 */
export function QuemEVoceCard({ vendedores, onEscolher }: QuemEVoceCardProps) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [confirmando, setConfirmando] = useState<VendedorRow | null>(null);
  const inputId = useId();
  const listboxId = useId();

  const sugestoes = sugerirVendedores(vendedores, texto);
  const letras = normalizarBusca(texto).replace(/\s/g, "").length;
  const mostrarLista = aberto && letras >= MIN_LETRAS_SUGESTAO;
  const optionId = (index: number) => `${listboxId}-opcao-${index}`;

  function selecionar(vendedor: VendedorRow) {
    setConfirmando(vendedor);
    setAberto(false);
  }

  function voltar() {
    setConfirmando(null);
    setTexto("");
    setAtivo(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAberto(true);
      if (sugestoes.length > 0) setAtivo((i) => (i + 1) % sugestoes.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (sugestoes.length > 0) setAtivo((i) => (i - 1 + sugestoes.length) % sugestoes.length);
    } else if (event.key === "Enter") {
      const escolhido = mostrarLista ? sugestoes[ativo] : undefined;
      if (escolhido) {
        event.preventDefault();
        selecionar(escolhido);
      }
    } else if (event.key === "Escape") {
      setAberto(false);
    }
  }

  if (confirmando) {
    return (
      <section className="rounded-2xl border-2 border-primary/40 bg-card p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Confirme sua identidade
        </p>
        <p className="mt-2 text-xl font-semibold text-foreground">
          Você é <span className="text-primary">{confirmando.nome}</span>?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Este celular ficará identificado com o seu nome no rodízio.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onEscolher(confirmando.id)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <UserCheck className="h-5 w-5" />
            Sim, sou eu
          </button>
          <button
            type="button"
            onClick={voltar}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3.5 text-base font-medium text-foreground transition hover:border-primary hover:text-primary"
          >
            Não, voltar
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Quem está usando este celular?
      </p>

      <label htmlFor={inputId} className="mt-3 block text-sm font-medium text-foreground">
        Digite o seu nome
      </label>
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mostrarLista}
          aria-controls={listboxId}
          aria-activedescendant={mostrarLista && sugestoes[ativo] ? optionId(ativo) : undefined}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAtivo(0);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          // Atraso para o toque na opção registrar antes de a lista sumir.
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Comece a digitar…"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          className={INPUT_CLASS}
        />

        {mostrarLista ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Vendedores encontrados"
            className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            {sugestoes.length > 0 ? (
              sugestoes.map((vendedor, index) => (
                <li
                  key={vendedor.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === ativo}
                  // onMouseDown (e não onClick): dispara antes do blur do input.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selecionar(vendedor);
                  }}
                  onMouseEnter={() => setAtivo(index)}
                  className={cn(
                    "cursor-pointer px-4 py-3.5 text-base text-popover-foreground",
                    index === ativo && "bg-secondary",
                  )}
                >
                  {vendedor.nome}
                </li>
              ))
            ) : (
              <li className="px-4 py-3.5 text-sm text-muted-foreground">
                Nenhum vendedor encontrado. Confira com a gerência.
              </li>
            )}
          </ul>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        A escolha fica salva neste aparelho. Você só precisa fazer isso uma vez.
      </p>
    </section>
  );
}
