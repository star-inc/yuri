# Yuri: The Agentic Assistant

Yuri is a Discord bot and agentic assistant built on Node.js (v24+) and TypeScript, using LangGraph / LangChain for ReAct-style agentic reasoning, planning, and tool execution.

---

## Features

- **Agentic Chat**: A conversational ReAct agent powered by OpenAI (via LangGraph) that can decide to call tools, retrieve real-time data, and search the web.
- **Extensible Tools**:
  - `current_time`: Retrieves the current date and time with configurable timezones and locales.
  - `tavily_search`: Executes web search queries using Tavily API to obtain up-to-date real-world facts.
- **Discord Commands**:
  - `/now`: Displays the current server time.
  - `/user_id`: Returns the user's Discord username and unique Snowflake ID.
  - `/shell_command`: Runs shell commands directly from Discord (secured strictly to the `DISCORD_BOT_OWNER_ID`).
- **LowDB Persistence**: Tracks last startup details and manages slash command synchronization using a local JSON database.
- **Modern Development Flow**: Native execution of TypeScript during development using Node 24's `--experimental-strip-types`, combined with optimized Rollup bundling for production.
- **Dockerized Ready**: Multi-stage lightweight Alpine-based container build, executing under a non-privileged system user.

---

## Project Structure

```text
├── app.ts                 # Main entry point (loads env, starts DB, registers triggers)
├── rollup.config.js       # Bundles TypeScript to ES modules for production
├── tsconfig.json          # TypeScript compiler configuration
├── Dockerfile             # Multi-stage production container setup
├── src/
│   ├── agents/            # ReAct agent logic and custom tools
│   │   ├── react.ts       # LangGraph StateGraph agent definition
│   │   └── tools/         # Agent tools definition (time, Tavily search)
│   ├── clients/           # Third-party client abstractions (Discord, OpenAI, LowDB)
│   ├── commands/          # Discord slash commands definitions (/now, /user_id, etc.)
│   └── triggers/          # Discord event listeners (ClientReady, MessageCreate, etc.)
└── web/
    └── index.html         # A minimal web landing page template
```

---

## Prerequisites

- **Node.js** v24 or higher
- **npm** v10 or higher
- **Discord Developer App** (Bot Token and Application ID)
- **OpenAI API Key** (or compatible OpenAI-format endpoint)
- **Tavily API Key** (optional, for web search tool capability)

---

## Setup & Installation

### 1. Clone the repository and install dependencies

```bash
git clone <repository-url>
cd yuri
npm install
```

### 2. Configure Environment Variables

Copy `.env.sample` to `.env` and fill in your configurations:

```bash
cp .env.sample .env
```

| Variable Name | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Your OpenAI API key or compatible credential. |
| `OPENAI_CHAT_MODEL` | Yes | OpenAI chat model (e.g., `gpt-4o`, `gpt-3.5-turbo`, or `auto`). |
| `SYSTEM_PROMPT` | Yes | System instructions defining Yuri's behavior. |
| `OPENAI_BASE_URL` | No | Custom API base URL if using a proxy or custom LLM provider. |
| `DISCORD_APP_ID` | Yes | Your Discord Developer application client ID. |
| `DISCORD_BOT_TOKEN` | Yes | Your Discord bot user token. |
| `DISCORD_BOT_OWNER_ID` | Yes | Discord User ID of the bot owner. Needed for restart alerts and `/shell_command` access. |
| `TAVILY_API_KEY` | No | API Key for web search tool. If omitted, search capability will be disabled. |
| `LOWDB_FILENAME` | No | Custom path/name for LowDB state storage (Default: `state.json`). |

---

## Running the Application

### Development Mode

Runs the TypeScript file natively via Node 24's watch mode and experimental type stripping:

```bash
npm run dev
```

### Production Build & Run

Bundle the application using Rollup, and run the optimized build:

```bash
npm run build
npm start
```

### Formatting & Linting

Check and fix code format issues using ESLint:

```bash
npm run lint         # Runs lint-staged
npm run lint:es      # Checks TS files with ESLint
npm run lint:es:fix  # Fixes autofixable ESLint rules
```

---

## Docker Deployment

To build and run Yuri in a secure, non-privileged Docker container:

1. **Build the image**:

   ```bash
   docker build -t yuri-bot .
   ```

2. **Run the container**:

   ```bash
   docker run -d \
     --name yuri-assistant \
     --env-file .env \
     -v $(pwd)/state.json:/workplace/state.json \
     yuri-bot
   ```

---

## Security Notice

The Discord command `/shell_command` allows running arbitrary terminal commands on the host machine.

- This command is **restricted exclusively** to the user ID matched in `DISCORD_BOT_OWNER_ID`.
- Ensure `DISCORD_BOT_OWNER_ID` is set correctly and never shared.
- When running in production, it is highly recommended to run Yuri inside a sandboxed container (such as the provided Docker setup) to limit host system access.
