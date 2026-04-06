# TaskManager

A Trello-inspired collaborative task management app built with .NET Aspire, ASP.NET Core 10, and Next.js 16. Create boards, organize tasks into columns, and collaborate with your team in real time via SignalR.

![.NET](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![SQL Server](https://img.shields.io/badge/SQL%20Server-2022-CC2927?logo=microsoftsqlserver)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)

## Features

- **Boards & Columns** — Create boards with customizable columns to organize work
- **Cards** — Add task cards with titles, descriptions, due dates, and position ordering
- **Card Messages** — Comment and discuss directly on cards
- **Real-time Updates** — Instant board notifications via SignalR (card created, column created, user joined)
- **Role-based Access** — Four-tier permission model: Owner, Admin, Member, Viewer
- **JWT Authentication** — Secure token-based auth with refresh token rotation
- **Responsive UI** — Next.js frontend with Tailwind CSS

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  .NET Aspire AppHost                  │
│                  (Orchestration)                      │
├──────────────┬───────────────────┬────────────────────┤
│  SQL Server  │  ASP.NET Core 10  │   Next.js 16       │
│  (Database)  │  (Backend API +   │   (Frontend SPA)   │
│              │   SignalR Hub)    │                    │
└──────────────┴───────────────────┴────────────────────┘
```

| Layer | Project | Tech |
|-------|---------|------|
| Orchestrator | `TaskManager.AppHost` | .NET Aspire |
| Backend | `TaskManager.Backend` | ASP.NET Core 10, EF Core 10, SignalR |
| Frontend | `taskmanager.frontend` | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| Shared | `TaskManager.ServiceDefaults` | OpenTelemetry, health checks, resilience |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 22+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for SQL Server container)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/<your-username>/TaskManager.git
   cd TaskManager
   ```

2. **Install frontend dependencies**
   ```bash
   cd taskmanager.frontend
   npm install
   cd ..
   ```

3. **Run with .NET Aspire**
   ```bash
   dotnet run --project TaskManager.AppHost
   ```
   Aspire will start SQL Server (via Docker), the backend API, and the frontend automatically.

4. **Open the app**
   - Aspire Dashboard: `https://localhost:17043`
   - Frontend: `https://localhost:3000` (or the port assigned by Aspire)

## API Endpoints

All endpoints except auth require a JWT bearer token.

### Authentication — `/api/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login and receive JWT + refresh token |
| POST | `/refresh` | Rotate refresh token |

### Boards — `/api/board`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Create a new board |
| POST | `/delete` | Delete a board (Owner only) |
| POST | `/adduser` | Add a user to a board (Owner/Admin) |

### List Columns — `/api/listcolumn`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Create a column on a board |
| POST | `/delete` | Delete a column |

### Cards — `/api/card`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create` | Create a card in a column |
| POST | `/update` | Update card details |

### Card Messages — `/api/cardmessage`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/getbycard` | Get all messages for a card |
| POST | `/send` | Send a message on a card |

API documentation UI is available at `/scalar/v1` when running in development.

## Real-time Notifications

The SignalR hub at `/hubs/notifications` pushes these events to board members:

| Event | Trigger |
|-------|---------|
| `BoardJoinedNotification` | User added to board |
| `CardCreatedNotification` | Card created |
| `ColumnCreatedNotification` | Column created |

Clients join a board group via `JoinBoardAsync(boardId)` and leave via `LeaveBoardAsync(boardId)`.

## Roles & Permissions

| Role | Create/Edit Cards | Manage Columns | Add Members | Delete Board |
|------|:-:|:-:|:-:|:-:|
| **Owner** | ✓ | ✓ | ✓ | ✓ |
| **Admin** | ✓ | ✓ | ✓ (limited) | ✗ |
| **Member** | ✓ | ✓ | ✗ | ✗ |
| **Viewer** | ✗ | ✗ | ✗ | ✗ |

## Project Structure

```
TaskManager.slnx                    # Solution file
TaskManager.AppHost/                # .NET Aspire orchestrator
TaskManager.Backend/
├── Controllers/                    # API controllers
├── Data/                           # EF Core DbContext & seeder
├── Hubs/                           # SignalR notification hub
├── Models/                         # Entity models & DTOs
├── Repositories/                   # Data access layer
├── Services/                       # Business logic
└── Migrations/                     # EF Core migrations
taskmanager.frontend/
├── app/                            # Next.js App Router pages
│   ├── login/                      # Login page
│   ├── register/                   # Registration page
│   ├── dashboard/                  # User dashboard
│   └── board/[boardId]/            # Dynamic board view
└── lib/                            # Shared utilities & API client
TaskManager.ServiceDefaults/        # Shared observability & resilience
```

## Deployment

The project includes Docker support and Azure Container Apps configuration:

```bash
# Deploy to Azure with azd
azd init
azd up
```

Both backend and frontend have multi-stage Dockerfiles optimized for production.