#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "==============================================="
echo "  deep.tech - Iniciador (Frontend / Nube)"
echo "==============================================="
echo

if ! command -v bun >/dev/null 2>&1; then
    echo "[ERROR] Bun no esta instalado o no esta en el PATH."
    echo "Instalalo con: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

if [ ! -f ".env.local" ]; then
    echo "[ERROR] No existe .env.local"
    echo "Crea uno copiando .env.example y llena las credenciales de Supabase."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependencias con bun install..."
    bun install
    echo
fi

echo "[INFO] Arrancando Vite contra Supabase en la nube..."
echo "       Frontend: http://localhost:5173"
echo
echo "Presiona Ctrl+C para detener."
echo

exec bun run dev:frontend
