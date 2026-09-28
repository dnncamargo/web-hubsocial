# Nxt_Planner - Seu Hub de Conexão e Organização de Eventos 🔗🗓️

[![Vercel](https://vercel.com/button)](https://nxtplanner.vercel.app/)

Nxt_Planner é uma plataforma web construída com React e Vite para facilitar a organização e o acompanhamento de eventos 📅, além de gerenciar seu diretório de contatos 🧑‍🤝‍🧑 e tarefas ✅. Acesse a versão online em [https://nxtplanner.vercel.app/](https://nxtplanner.vercel.app/).

## Funcionalidades Atuais (v2.0.1)

* **Dashboard de Eventos Futuros:** Visualize de forma clara os próximos eventos 🗓️.
* **Diretório de Pessoas:** Gerencie seus contatos 🧑‍🤝‍🧑 com informações relevantes.
* **Histórico de Eventos:** Acompanhe os eventos passados ⏪ para referência.
* **Lista de Tarefas:** Organize suas atividades ✅ e mantenha-se produtivo.
* **Autenticação de Usuário:** Segurança 🔒🛡️ e personalização através do Firebase Authentication.
* **Persistência de Dados na Nuvem:** Dados seguros ☁️ e acessíveis utilizando o Firebase.
* **Sugestões de Eventos:** Receba ideias e sugestões ✨ para seus próximos eventos.
* **Compatibilidade com Google API** Os contatos são importados 👤 e eventos são exportados para o Google Agenda 📲 
* **Avaliação de Eventos:** Colete feedback ⭐ e avalie o sucesso de seus eventos.
* **Tarefas com Subníveis:** Divida tarefas complexas em subtarefas gerenciáveis 🪜.
* **Opções Personalizadas** Eventos e Pessoas com novos campos para adicionar ✍️

## Próximas Funcionalidades

A próxima versão do Nxt_Planner trará ainda mais poder para sua organização:

* **Filtros e Pesquisa:** Encontre rapidamente eventos, pessoas e tarefas específicas 🔍.
* **Rotinas:** Organize seu passo a passo 🏹 até atingir suas metas. 🎯

## Tecnologias Utilizadas 💻

* [React](https://react.dev/): Biblioteca para construção da interface.
* [Vite](https://vite.dev/): Build tool e servidor de desenvolvimento.
* [React Router](https://reactrouter.com/): Roteamento client-side da aplicação.
* [Tailwind CSS](https://tailwindcss.com/): Framework CSS utilitário para estilização rápida e responsiva.
* [Lucide](https://lucide.dev/): Biblioteca canônica de ícones SVG.
* [Firebase](https://firebase.google.com/): Plataforma de desenvolvimento da Google Cloud para persistência de dados na nuvem (Firestore) e autenticação de usuários (Firebase Authentication).

## Como Executar Localmente (Para Desenvolvedores 🧑‍💻)

Se você deseja executar o Nxt_Planner localmente para desenvolvimento ou contribuição, siga estas etapas:

1.  **Clone o repositório (se o código for público):**
    ```bash
    git clone [https://docs.github.com/articles/referencing-and-citing-content](https://docs.github.com/articles/referencing-and-citing-content)
    ```
2.  **Navegue até o diretório do projeto:**
    ```bash
    cd web-hubsocial
    ```
3.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    # ou
    pnpm install
    ```
4.  **Configure o Firebase:**
    * Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
    * Configure a autenticação (Firebase Authentication).
    * Crie um banco de dados Firestore.
    * Obtenha as configurações do seu projeto Firebase (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
    * Crie um arquivo `.env.local` na raiz do seu projeto e adicione suas configurações do Firebase como variáveis de ambiente:
        ```env
        VITE_FIREBASE_API_KEY=SUA_API_KEY
        VITE_FIREBASE_AUTH_DOMAIN=SEU_AUTH_DOMAIN
        VITE_FIREBASE_PROJECT_ID=SEU_PROJECT_ID
        VITE_FIREBASE_STORAGE_BUCKET=SEU_STORAGE_BUCKET
        VITE_FIREBASE_MESSAGING_SENDER_ID=SEU_MESSAGING_SENDER_ID
        VITE_FIREBASE_APP_ID=SEU_APP_ID
        ```
5.  **Execute o servidor de desenvolvimento:**
    ```bash
    npm run dev
    # ou
    yarn dev
    # ou
    pnpm dev
    ```
6.  **Abra seu navegador em `http://localhost:5173` para visualizar o Nxt_Planner.**

## Contribuição 🙏

Contribuições são sempre bem-vindas! Se você tiver ideias para melhorias 💡, encontrou bugs 🐛 ou quer adicionar novas funcionalidades ✨, siga estas etapas:

1.  Faça um **fork** do repositório.
2.  Crie uma **branch** para sua contribuição (`git checkout -b feature/sua-melhoria`).
3.  Faça seus **commits** com mensagens claras e descritivas (`git commit -m 'Adiciona funcionalidade X'`).
4.  Faça **push** para a sua branch (`git push origin feature/sua-melhoria`).
5.  Abra um **Pull Request** para o repositório principal.

## Licença 📄

Este projeto está sob a licença [INSERIR LICENÇA AQUI - Ex: MIT]. Consulte o arquivo `LICENSE` para obter mais detalhes.

## Autores ✍️

* [Seu Nome/Nome da Equipe]([Link para seu GitHub ou outro perfil])

## Status do Projeto 🚦

Em desenvolvimento ativo. Versão atual: `2.0.1`.

---

Feito com ❤️ usando React, Vite, Tailwind CSS e Firebase.