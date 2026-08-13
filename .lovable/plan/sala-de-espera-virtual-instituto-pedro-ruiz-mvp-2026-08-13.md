# Sala de Espera Virtual — Instituto Pedro Ruiz (MVP)

Sistema com duas frentes: painel do atendente para gerir a fila e tela mobile-first para a paciente acompanhar sua posição em tempo real.

## Identidade visual

- Rosa IPR `#F54273` como cor primária, branco como base, cinzas suaves para superfícies.
- Verde de destaque reservado exclusivamente para o estado "Sua vez!".
- Tipografia limpa e generosa, cantos arredondados, sombras suaves — clima calmo e premium.
- Logo enviado vira asset da marca no header das duas telas e também o favicon do app.

## Telas

### `/admin` — Painel de Gestão (desktop)

- Coluna esquerda: campo "Nome da Paciente" + botão "Adicionar à Fila". Após adicionar, aparece um card com o link único `/espera?id=UUID` e botão "Copiar Link" com confirmação visual.
- Coluna direita: bloco "Em Atendimento" (paciente atual em destaque) e lista "Aguardando" numerada por ordem de chegada.
- Botão "Chamar Próximo": move o primeiro da fila para `em_atendimento` e o atual para `concluido`.
- Seção recolhida com atendimentos concluídos e ação de limpar a fila.

### `/espera` — Sala de Espera (mobile-first)

- Header com logo IPR e "Olá, [Nome]".
- Card de status:
  - `aguardando`: posição em número grande ("Você é a 3ª na fila") + tempo estimado (15 min × posição) + indicação de atualização automática.
  - `em_atendimento`: card verde, animação de pulso, alerta sonoro curto via Web Audio (com fallback puramente visual) e a mensagem "Sua vez! O médico está te aguardando no grupo do WhatsApp."
  - `concluido` / id inválido: mensagem neutra de orientação.
- Carrossel de FAQ abaixo do status, deslizável no touch com setas no desktop: "Como funciona a cirurgia?", "Tempo de recuperação", "Formas de pagamento", "O que levar no dia" e afins.
- A tela reage sozinha às mudanças feitas no painel, em outra aba, sem recarregar.

## Estado e preparo para o backend

- Fila persistida em `localStorage` e sincronizada entre abas via evento `storage`, de modo que admin e paciente vejam o mesmo dado em tempo real.
- Todo o acesso passa por uma única camada de serviço com API assíncrona (`listPatients`, `addPatient`, `callNext`, `subscribe`). Trocar essa camada por Lovable Cloud/Supabase Realtime depois não exige mexer nos componentes.

## Detalhes técnicos

- TanStack Start (router já existente do projeto) — rotas `src/routes/admin.tsx` e `src/routes/espera.tsx`; `/` redireciona para `/espera` ou apresenta um índice simples com atalho para as duas telas.
- `id` da paciente lido como search param tipado via `validateSearch`.
- Tipos rigorosos em `src/types/patient.ts`: `Patient` com `id` (UUID), `nome`, `status: 'aguardando' | 'em_atendimento' | 'concluido'`, `createdAt` (timestamp).
- Serviço em `src/lib/queue-store.ts` + hook `src/hooks/use-queue.ts` (`useSyncExternalStore`), acesso ao `localStorage` protegido para SSR.
- Componentes separados: `AddPatientForm`, `PatientLinkCard`, `QueueList`, `QueueItem`, `CurrentPatientCard`, `WaitingStatusCard`, `NowServingCard`, `FaqCarousel`, `ClinicHeader`.
- Tokens de cor em `src/styles.css` (oklch), Tailwind v4; ícones com `lucide-react`.
- `head()` próprio em cada rota com título/descrição específicos.
