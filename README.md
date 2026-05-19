# Habitus 🌱

Sistema de gamificação para uma vida mais produtiva e saudável.

## Funcionalidades

- 💧 Controle de consumo de água (com lembretes via WhatsApp)
- 🏃 Registro de atividade física diária
- 📚 Registro de leitura diária
- 🇺🇸 Check de estudo de inglês
- ⚖️ Acompanhamento de peso com IMC
- 🔥 Streaks e pontuação diária
- 📱 PWA — instale como app no celular

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS (PWA)
- **Backend**: Fastify + TypeScript + Prisma
- **Banco**: PostgreSQL
- **WhatsApp**: Evolution API
- **Deploy**: Docker + Easypanel

## Rodando localmente

### 1. Configurar variáveis de ambiente

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Edite `backend/.env` com as configurações da sua Evolution API.

### 2. Backend

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

## Deploy no Easypanel

1. Copie `.env.example` para `.env` e preencha os valores
2. No Easypanel, crie um projeto e aponte para este repositório
3. Use o `docker-compose.yml` na raiz
4. Configure as variáveis de ambiente no painel

## Evolution API — configuração dos lembretes

O backend envia mensagens no WhatsApp nos seguintes momentos:

- **Água**: a cada X horas se a pessoa não registrou consumo (configurável por usuário)
- **Peso**: quando passar X dias desde o último registro (configurável)  
- **Resumo diário**: todo dia às 21h com o resumo das atividades

Configure o endpoint e a chave da Evolution API nas variáveis de ambiente.

## Instalação como app (PWA)

1. Acesse o app no celular pelo navegador
2. No Chrome/Safari, toque em "Adicionar à tela inicial"
3. O app aparecerá como ícone no celular
