# Virtual Clinic Waitlist

Atue como um Desenvolvedor Front-end Sênior especialista em React, TypeScript e Tailwind CSS. Vamos construir um MVP de um sistema de "Sala de Espera Virtual e Gestão de Fila" para uma clínica médica (Instituto Pedro Luiz). O projeto será empacotado com Vite.

# Contexto do Negócio

O sistema resolve o problema de pacientes que aguardam uma avaliação médica online via chamada de vídeo. Atualmente, elas esperam muito tempo sem feedback. O sistema terá duas frentes:

1. Uma tela para o Atendente gerenciar a fila e gerar links únicos de acesso.

2. Uma tela mobile-first para a Paciente acompanhar sua posição na fila em tempo real e visualizar dúvidas frequentes enquanto aguarda.

No futuro, integrarei este front-end com o Supabase (Banco de dados e Realtime), então construa o gerenciamento de estado local preparado para ser substituído por chamadas de API/Websockets reais.

# Especificações Técnicas e de Arquitetura

* Framework: React + Vite

* Linguagem: TypeScript (com tipagem rigorosa para os objetos de Paciente e Fila)

* Estilização: Tailwind CSS e Lucide React para ícones.

* Design System: Crie uma interface "premium", clean e tranquilizadora, utilizando tons azuis/verdes que remetem a saúde, confiança e tecnologia.

# Estrutura de Dados (Mock Inicial)

Crie uma interface `Patient` com os campos:

* id (UUID)

* nome (string)

* status ('aguardando' | 'em_atendimento' | 'concluido')

* createdAt (timestamp)

# Telas a serem desenvolvidas

## 1. Painel de Gestão (Visão do Atendente) - Rota: /admin

* Layout focado em Desktop.

* Coluna Esquerda (Adição): Um formulário simples com um input "Nome da Paciente" e um botão "Adicionar à Fila". Ao adicionar, o sistema deve gerar um ID único e exibir um card com o link de acesso da paciente (ex: /espera?id=UUID) e um botão de "Copiar Link".

* Coluna Direita (Gestão da Fila): Uma lista visual dividida em pacientes "Aguardando" e paciente "Em Atendimento".

* Ação de Avançar Fila: O paciente no topo da lista "Aguardando" deve ter um botão de destaque "Chamar Próximo". Ao clicar, o status desse paciente muda para 'em_atendimento' (e o anterior vai para 'concluido').

## 2. Sala de Espera (Visão da Paciente) - Rota: /espera

* Layout estritamente Mobile-first.

* Simule a leitura do parâmetro "id" da URL para identificar a paciente.

* Header: Logo da clínica (pode usar um ícone genérico por enquanto) e uma mensagem de boas-vindas ("Olá, [Nome]").

* Card de Status Principal:

  * Se status = 'aguardando': Mostrar a posição atual na fila de forma bem destacada (ex: "Você é a 3ª na fila") e o Tempo Estimado (calcule 15 minutos multiplicados pela posição na fila).

  * Se status = 'em_atendimento': O card deve mudar de cor para verde/destaque, tocar um som de notificação (simulado ou visual) e mostrar o aviso: "Sua vez! O médico está te aguardando no grupo do WhatsApp."

* Carrossel de Conteúdo (FAQ): Logo abaixo do status, crie um componente de carrossel ou cards empilhados com "Dúvidas Frequentes sobre a Avaliação". Exemplos de cards: "Como funciona a cirurgia?", "Tempo de recuperação", "Formas de pagamento".

* Comportamento: Simule uma atualização de estado (como se o backend estivesse enviando dados via websocket) onde a posição da paciente diminui conforme a fila anda.

Por favor, gere a estrutura completa de componentes, roteamento simples e estilos. Separe os componentes de forma lógica para facilitar minha manutenção posterior.

Paleta de cores do IPR:
#F54273
#FFFFFF

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/88d00926-9248-4ffa-8447-4f948f8112ac).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
