#!/bin/bash
# ============================================================
#  Beserra Library — Atualização rápida de código
#  Uso: bash atualizar.sh TOKEN_GITHUB
#
#  - Baixa o código mais recente do GitHub
#  - Preserva o banco de dados (.wrangler/state)
#  - Faz rebuild e reinicia PM2
#  - NÃO apaga nenhum dado cadastrado
# ============================================================

TOKEN="${1:-}"
REPO_OWNER="RomualdoBeserra"
REPO_NAME="beserra-library"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"
APP_DIR="$HOME/beserra-library"
BRANCH="main"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${GREEN}✔ ${NC}$1"; }
info()    { echo -e "${BLUE}ℹ ${NC}$1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}$1"; }
error()   { echo -e "${RED}✘ ERRO: $1${NC}"; exit 1; }
section() { echo -e "\n${BOLD}${CYAN}─── $1 ───${NC}\n"; }

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   Beserra Library — Atualização de Código            ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}\n"

# Injeta token na URL se fornecido
if [ -n "$TOKEN" ]; then
  REPO_URL="https://${TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git"
  info "Usando token GitHub para autenticação"
fi

# ── 1. Verifica se o APP_DIR existe ──────────────────────
section "1. Verificando instalação"
if [ ! -d "$APP_DIR" ]; then
  error "Diretório $APP_DIR não encontrado. Execute o setup.sh primeiro."
fi
log "Diretório encontrado: $APP_DIR"

# ── 2. Para o PM2 ────────────────────────────────────────
section "2. Parando aplicação"
pm2 stop biblioteca 2>/dev/null && log "PM2 parado" || warn "PM2 não estava rodando"

# ── 3. Backup preventivo do banco ────────────────────────
section "3. Backup do banco de dados"
DB_DIR="$APP_DIR/.wrangler/state"
BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"

if [ -d "$DB_DIR" ]; then
  BACKUP_FILE="$BACKUP_DIR/db-pre-update-$(date +%Y%m%d_%H%M%S).tar.gz"
  tar -czf "$BACKUP_FILE" -C "$APP_DIR" .wrangler/state 2>/dev/null
  log "Banco salvo em: $BACKUP_FILE"

  # Cópia temporária
  TMP_DB="/tmp/beserra-wrangler-$$"
  cp -r "$APP_DIR/.wrangler" "$TMP_DB"
  log "Banco copiado para área segura temporária"
else
  warn "Banco não encontrado — continuando sem backup"
  TMP_DB=""
fi

# ── 4. Atualiza o código ──────────────────────────────────
section "4. Baixando código novo do GitHub"

if [ -d "$APP_DIR/.git" ]; then
  # Já tem .git — atualiza via git
  info "Repositório git detectado — atualizando via git pull..."
  cd "$APP_DIR"
  if [ -n "$TOKEN" ]; then
    git remote set-url origin "$REPO_URL" 2>/dev/null || true
  fi
  git fetch origin
  git reset --hard "origin/${BRANCH}"
  log "Código atualizado via git"
else
  # Sem .git — clona em temp e substitui arquivos de código
  info "Sem .git detectado — baixando via clone temporário..."
  TMP_CLONE="/tmp/beserra-clone-$$"
  git clone "$REPO_URL" "$TMP_CLONE" || error "Falha ao clonar. Verifique o token e a conexão."
  log "Repositório clonado"

  # Remove arquivos de código antigos (preserva .wrangler e node_modules)
  info "Substituindo arquivos de código..."
  find "$APP_DIR" -mindepth 1 -maxdepth 1 \
    ! -name '.wrangler' \
    ! -name 'node_modules' \
    ! -name '.git' \
    -exec rm -rf {} + 2>/dev/null || true

  # Copia o novo código
  cp -r "$TMP_CLONE"/. "$APP_DIR/"
  rm -rf "$TMP_CLONE"
  log "Arquivos de código substituídos"
fi

# ── 5. Restaura o banco ───────────────────────────────────
section "5. Restaurando banco de dados"
if [ -n "$TMP_DB" ] && [ -d "$TMP_DB" ]; then
  rm -rf "$APP_DIR/.wrangler"
  cp -r "$TMP_DB" "$APP_DIR/.wrangler"
  rm -rf "$TMP_DB"
  log "Banco de dados restaurado com sucesso"
else
  warn "Banco temporário não encontrado — mantendo o atual"
fi

# ── 6. Instala dependências ───────────────────────────────
section "6. Instalando dependências"
cd "$APP_DIR"
npm install --legacy-peer-deps 2>&1 | tail -3
log "Dependências instaladas"

# ── 7. esbuild-wasm (evita Bus error) ────────────────────
section "7. Configurando esbuild-wasm"
ESBUILD_VERSION=$(node -e "console.log(require('./node_modules/esbuild/package.json').version)" 2>/dev/null || echo "0.25.0")
info "esbuild versão: $ESBUILD_VERSION"

npm install --save-dev "esbuild-wasm@${ESBUILD_VERSION}" --legacy-peer-deps 2>/dev/null \
  || npm install --save-dev esbuild-wasm --legacy-peer-deps 2>/dev/null || true

ESBUILD_PKG="$APP_DIR/node_modules/esbuild/lib/main.js"
if [ -f "$ESBUILD_PKG" ]; then
  node -e "
    const fs = require('fs');
    const src = fs.readFileSync('$ESBUILD_PKG', 'utf8');
    if (!src.includes('esbuild-wasm')) {
      fs.writeFileSync('$ESBUILD_PKG', 'module.exports = require(\"esbuild-wasm\");');
      console.log('esbuild redirecionado para esbuild-wasm');
    } else {
      console.log('esbuild já usa wasm');
    }
  " 2>/dev/null || true
fi
log "esbuild-wasm configurado"

# ── 8. Swap (evita OOM) ───────────────────────────────────
section "8. Verificando swap"
SWAP_MB=$(swapon --show=SIZE --noheadings --bytes 2>/dev/null | awk '{sum+=$1} END {printf "%d", sum/1024/1024}')
if [ "${SWAP_MB:-0}" -lt 512 ]; then
  info "Pouco swap (${SWAP_MB:-0}MB) — criando 2GB..."
  sudo swapoff /swapfile 2>/dev/null || true
  sudo rm -f /swapfile
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none && \
  sudo chmod 600 /swapfile && sudo mkswap /swapfile -q && sudo swapon /swapfile && \
  log "Swap de 2GB ativado" || warn "Falha ao criar swap"
else
  log "Swap OK (${SWAP_MB}MB)"
fi
sudo sysctl -w vm.swappiness=60 2>/dev/null || true

# ── 9. Build ─────────────────────────────────────────────
section "9. Fazendo build"
cd "$APP_DIR"
TOTAL_MEM=$(free -m | awk '/^Mem/{m=$2} /^Swap/{s=$2} END{printf "%d", (m+s)*0.4}')
HEAP_MB=$(( TOTAL_MEM > 1024 ? 1024 : (TOTAL_MEM < 256 ? 256 : TOTAL_MEM) ))
info "Heap Node.js: ${HEAP_MB}MB"

NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" npm run build
if [ $? -ne 0 ]; then
  error "Build falhou. Verifique: free -h"
fi
log "Build concluído — dist/ atualizado"

# ── 10. Reinicia PM2 ──────────────────────────────────────
section "10. Reiniciando aplicação"
if pm2 list | grep -q "biblioteca"; then
  pm2 restart biblioteca
else
  cd "$APP_DIR"
  pm2 start ecosystem.config.cjs
fi
sleep 3

# Testa
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/ 2>/dev/null)
if [ "$HTTP" = "200" ] || [ "$HTTP" = "301" ] || [ "$HTTP" = "302" ]; then
  log "Aplicação respondendo (HTTP ${HTTP})"
else
  warn "App pode ainda estar iniciando (HTTP ${HTTP:-timeout})"
  info "Verifique: pm2 logs biblioteca --nostream"
fi

# ── Relatório ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   ✅ Atualização concluída!                          ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""
COMMIT=$(cd "$APP_DIR" && git log --oneline -1 2>/dev/null || echo "N/A")
log "Versão instalada: ${COMMIT}"
log "Banco preservado: $( [ -d "$APP_DIR/.wrangler/state" ] && echo 'SIM ✔' || echo 'não encontrado')"
echo ""
echo -e "  ${BOLD}Comandos úteis:${NC}"
echo -e "  ${CYAN}pm2 logs biblioteca --nostream${NC}   # ver logs"
echo -e "  ${CYAN}pm2 status${NC}                       # status"
echo ""
