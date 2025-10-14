# Crypto Trading Leaderboard

A full-stack application that displays a leaderboard of user wallet addresses based on their trading PNL (Profit and Loss). Built with **Next.js** for the frontend and **Rust (Axum)** for the backend, with PostgreSQL as the database.

## 🧰 Features

- **Real-time Leaderboard**: Displays users/wallets ranked by PNL (highest first)
- **Pagination**: Choose 10, 20, or 30 entries per page
- **REST API**: `/api/leaderboard`
- **GraphQL API**: `/graphql`
- **Error Handling**: Proper error responses
- **Logging**: Using `tracing` for detailed logs
- **Environment Variables**: Secure configuration management

## 🛠️ Tech Stack

### Backend (Rust)
- **Framework**: [Axum](https://github.com/tokio-rs/axum)
- **Database**: PostgreSQL with [SQLx](https://github.com/launchbadge/sqlx)
- **GraphQL**: [async-graphql](https://github.com/async-graphql/async-graphql)
- **Error Handling**: [thiserror](https://github.com/dtolnay/thiserror)
- **Logging**: [tracing](https://github.com/tokio-rs/tracing)

### Frontend (Next.js)
- **Framework**: [Next.js](https://nextjs.org/)
- **Language**: TypeScript
- **Styling**: CSS Modules or Tailwind (optional)

## 📁 Project Structure

```
├── backend/
│ ├── src/
│ │ ├── main.rs
│ │ ├── models.rs
│ │ ├── handlers.rs
│ │ └── error.rs
│ ├── migrations/
│ └── .env
├── frontend/
│ ├── src/
│ │ ├── pages/
│ │ ├── components/
│ │ └── lib/
│ └── .env.local
```

## 🚀 Setup Instructions

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) (v22+)
- [PostgreSQL](https://www.postgresql.org/)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <your-project-name>
```

### 2. Setup Backend (Rust)

```
cd backend
```

#### Install dependencies

```
cargo build
```

#### Set up environment variables
```
cp .env.example .env
```

#### Edit .env with your database credentials

#### Run database migrations

#### Start the server
```
cargo run
```

### 3. Setup Frontend (Next.js)
```
cd frontend
```
#### Install dependencies
```
npm install
```

#### Set up environment variables
```
cp .env.local.example .env.local
```
#### Edit .env.local if needed

#### Start the development server
```
npm run dev
```






