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

# Si node_modules se instalo desde Windows, esbuild solo tiene enlazado el
# binario nativo de win32 y bajo WSL/Linux toma una version desajustada,
# rompiendo Vite ("Host version X does not match binary version Y").
# Recableamos el binario nativo de la plataforma actual para cada esbuild@*.
fix_esbuild_binaries() {
    local bun_dir="node_modules/.bun"
    [ -d "$bun_dir" ] || return 0

    case "$(uname -m)" in
        x86_64|amd64) local arch="x64" ;;
        aarch64|arm64) local arch="arm64" ;;
        *) return 0 ;;
    esac
    local plat="linux-${arch}"

    local fixed=0
    local pkg ver target link
    for pkg in "$bun_dir"/esbuild@*; do
        [ -d "$pkg" ] || continue
        ver="${pkg##*esbuild@}"
        target="$bun_dir/@esbuild+${plat}@${ver}/node_modules/@esbuild/${plat}"
        link="$pkg/node_modules/@esbuild/${plat}"
        # Solo recableamos si el binario correcto existe y el enlace falta o esta roto.
        if [ -d "$target" ] && [ ! -e "$link" ]; then
            mkdir -p "$pkg/node_modules/@esbuild"
            ln -sfn "$(pwd)/$target" "$link"
            fixed=$((fixed + 1))
        fi
    done

    if [ "$fixed" -gt 0 ]; then
        echo "[INFO] Recableados $fixed binario(s) de esbuild para ${plat}."
    fi
}
fix_esbuild_binaries

echo "[INFO] Arrancando Vite contra Supabase en la nube..."
echo "       Frontend: http://localhost:5173"
echo
echo "Presiona Ctrl+C para detener."
echo

exec bun run dev:frontend
