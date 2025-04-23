# Saúde na Mão - Sistema de Gestão de Saúde

## Descrição

Saúde na Mão é um sistema completo de gestão de saúde desenvolvido para facilitar o gerenciamento de médicos, consultas, exames e postos de saúde. O sistema oferece uma interface intuitiva e moderna para profissionais de saúde e administradores, permitindo o controle eficiente de todos os aspectos de uma rede de saúde.

## Funcionalidades Principais

1. **Dashboard**: Visão geral das atividades diárias, estatísticas e informações importantes para tomada de decisão.
2. **Gestão de Médicos**: Cadastro, visualização e edição de informações dos médicos, incluindo documentos e serviços oferecidos.
3. **Agendamento de Consultas**: Marcação e acompanhamento de consultas médicas, respeitando a disponibilidade dos médicos.
4. **Gerenciamento de Exames**: Agendamento e controle de exames médicos, com tipos personalizáveis por posto de saúde.
5. **Gestão de Postos de Saúde**: Cadastro e gerenciamento de unidades de saúde, com horários de funcionamento.
6. **Calendário Integrado**: Visualização de consultas e exames em um calendário interativo.
7. **Autenticação de Usuários**: Sistema de login e registro para diferentes tipos de usuários (administradores, recepcionistas, enfermeiros, médicos e pacientes).
8. **Controle de Permissões**: Diferentes níveis de acesso baseados no tipo de usuário.
9. **Notificações**: Sistema de notificações para alertar sobre consultas, exames e outras atividades.
10. **Relatórios**: Geração de relatórios em Excel para análise de dados.

## Tipos de Usuários e Permissões

- **Administrador**: Acesso total ao sistema, pode gerenciar todos os aspectos.
- **Recepcionista**: Pode agendar consultas e exames, cadastrar médicos e gerenciar pacientes.
- **Enfermeiro**: Pode agendar consultas e exames, cadastrar médicos e gerenciar pacientes.
- **Médico**: Pode visualizar e gerenciar suas próprias consultas e exames.
- **Paciente**: Pode visualizar suas consultas e exames agendados.

## Tecnologias Utilizadas

- **Next.js**: Framework React para renderização do lado do servidor e geração de sites estáticos.
- **React**: Biblioteca JavaScript para construção de interfaces de usuário.
- **TypeScript**: Superset tipado de JavaScript para desenvolvimento mais seguro e produtivo.
- **Firebase**: Plataforma de desenvolvimento de aplicativos que fornece:
  - **Authentication**: Sistema de autenticação seguro.
  - **Firestore**: Banco de dados NoSQL em tempo real.
  - **Storage**: Armazenamento de arquivos (documentos médicos, imagens, etc.).
- **Tailwind CSS**: Framework CSS utilitário para design rápido e responsivo.
- **Shadcn UI**: Componentes de UI reutilizáveis e personalizáveis.
- **React Hook Form**: Biblioteca para gerenciamento de formulários em React.
- **Zod**: Biblioteca de validação de esquema TypeScript-first.
- **date-fns**: Biblioteca moderna de utilitários de data JavaScript.
- **ExcelJS**: Biblioteca para geração de relatórios em Excel.

## Estrutura do Projeto

- `app/`: Diretório principal do Next.js 13 com App Router.
  - `(auth)/`: Rotas de autenticação (login, registro).
  - `dashboard/`: Página principal do dashboard.
  - `medicos/`: Gerenciamento de médicos.
  - `consultas/`: Gerenciamento de consultas.
  - `exames/`: Gerenciamento de exames.
  - `postinhos/`: Gerenciamento de postos de saúde.
  - `usuarios/`: Gerenciamento de usuários.
  - `configuracoes/`: Configurações do sistema.
  - `atividades/`: Registro de atividades.
  - `clientes/`: Gerenciamento de pacientes.
  - `notificacoes/`: Sistema de notificações.
  - `historico/`: Histórico de consultas e exames.
- `components/`: Componentes React reutilizáveis.
  - `ui/`: Componentes de interface do usuário (botões, cards, etc.).
  - `doctor-registration/`: Componentes para cadastro de médicos.
- `contexts/`: Contextos React para gerenciamento de estado global.
  - `auth-context.tsx`: Contexto de autenticação.
- `hooks/`: Hooks personalizados.
  - `use-permissions.ts`: Hook para verificação de permissões.
  - `use-auth.ts`: Hook para autenticação.
- `lib/`: Funções utilitárias e configurações.
  - `firebase.ts`: Funções para interação com o Firebase.
  - `utils.ts`: Funções utilitárias gerais.
  - `excel.ts`: Funções para geração de relatórios Excel.
- `public/`: Arquivos estáticos como imagens e ícones.

## Configuração e Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/saude-na-mao.git
   cd saude-na-mao

