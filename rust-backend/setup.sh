#!/bin/bash

# Setup script untuk leaderboard system

echo "Setting up Leaderboard System..."

# 1. Install Rust jika belum ada
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# 2. Install sqlx-cli
echo "Installing sqlx-cli..."
cargo install sqlx-cli

# 3. Setup database
echo "Setting up database..."
sqlx database create
sqlx migrate run

# 4. Build Rust backend
echo "Building Rust backend..."
cd rust-backend
cargo build --release

# 5. Setup frontend
echo "Setting up Next.js frontend..."
cd ../frontend
npm install
npm run build

echo "Setup complete!"
echo "To run the system: docker-compose up"