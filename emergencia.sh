#!/bin/bash
# ============================================================
#  Beserra Library — Script de EMERGÊNCIA (correção rápida)
#  Uso: bash emergencia.sh TOKEN_GITHUB
#
#  Corrige o erro 500 baixando apenas o _worker.js compilado
#  do GitHub e reiniciando o PM2, SEM fazer rebuild local.
#  Ideal quando o build não consegue rodar na VM.
# ============================================================

TOKEN="${1:-}"
REPO_OWNER="RomualdoBeserra"
REPO_NAME="beserra-library"
APP_DIR="$HOME/beserra-library"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()   { echo -e "${GREEN}✔ ${NC}$1"; }
info()  { echo -e "${BLUE}ℹ ${NC}$1"; }
warn()  { echo -e "${YELLOW}⚠ ${NC}$1"; }
error() { echo -e "${RED}✘ ERRO: $1${NC}"; exit 1; }

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   Beserra Library — Emergência (sem rebuild)         ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}\n"

# Verifica diretório
[ ! -d "$APP_DIR" ] && error "Diretório $APP_DIR não encontrado. Execute o setup.sh primeiro."

# ── 1. Baixa o código atualizado do GitHub ────────────────
echo -e "\n${BOLD}${CYAN}─── 1. Atualizando código do GitHub ───${NC}\n"

cd "$APP_DIR"
if [ -d ".git" ]; then
  info "Atualizando via git pull..."
  if [ -n "$TOKEN" ]; then
    git remote set-url origin "https://${TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git" 2>/dev/null || true
  fi
  git fetch origin
  git reset --hard origin/main
  log "Código atualizado"
else
  error "Repositório git não encontrado. Use o atualizar.sh completo."
fi

# ── 2. Copia dist/ pré-compilado do repositório (se existir) ──
echo -e "\n${BOLD}${CYAN}─── 2. Verificando dist/ ───${NC}\n"

DIST_DIR="$APP_DIR/dist"
if [ -f "$DIST_DIR/_worker.js" ]; then
  log "dist/_worker.js encontrado ($(du -sh "$DIST_DIR/_worker.js" | cut -f1))"
else
  warn "dist/ não encontrado — tentando rebuild rápido..."
  
  # Restaura binário nativo do esbuild
  NATIVE_REAL=$(find "$APP_DIR/node_modules" -name 'esbuild.real' 2>/dev/null | head -1)
  if [ -f "$NATIVE_REAL" ]; then
    NATIVE_BIN="${NATIVE_REAL%.real}"
    cp "$NATIVE_REAL" "$NATIVE_BIN"
    chmod +x "$NATIVE_BIN"
    log "Binário nativo esbuild restaurado"
  fi
  
  # Tenta build com heap limitado
  HEAP_MB=384
  info "Tentando build com ${HEAP_MB}MB heap..."
  NODE_OPTIONS="--max-old-space-size=${HEAP_MB}" npm run build 2>&1 | tail -5 \
    && log "Build concluído" \
    || warn "Build falhou — use o atualizar.sh completo para rebuild com esbuild-wasm"
fi

# ── 3. Verifica arquivos estáticos ────────────────────────
echo -e "\n${BOLD}${CYAN}─── 3. Verificando assets estáticos ───${NC}\n"

if [ -f "$DIST_DIR/static/brasao-beserra.jpg" ]; then
  log "Brasão encontrado em dist/static/"
elif [ -f "$APP_DIR/public/static/brasao-beserra.jpg" ]; then
  info "Brasão encontrado em public/static/ — copiando para dist/..."
  mkdir -p "$DIST_DIR/static"
  cp "$APP_DIR/public/static/brasao-beserra.jpg" "$DIST_DIR/static/"
  log "Brasão copiado"
else
  warn "Brasão não encontrado — a logo pode aparecer quebrada"
fi

# ── 4. Reinicia PM2 ───────────────────────────────────────
echo -e "\n${BOLD}${CYAN}─── 4. Reiniciando PM2 ───${NC}\n"

if pm2 list | grep -q "biblioteca"; then
  pm2 restart biblioteca
  log "PM2 reiniciado"
else
  cd "$APP_DIR"
  pm2 start ecosystem.config.cjs
  log "PM2 iniciado"
fi

# ── 5. Testa ──────────────────────────────────────────────
sleep 4
HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/ 2>/dev/null)
BRASAO=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/static/brasao-beserra.jpg 2>/dev/null)

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   Resultado                                          ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$HTTP" = "200" ]; then
  echo -e "  ${GREEN}✔${NC} Site respondendo: HTTP ${HTTP}"
else
  echo -e "  ${RED}✘${NC} Site com problema: HTTP ${HTTP:-timeout}"
  echo -e "  ${YELLOW}⚠${NC} Verifique: pm2 logs biblioteca --nostream"
fi

if [ "$BRASAO" = "200" ]; then
  echo -e "  ${GREEN}✔${NC} Brasão acessível: HTTP ${BRASAO}"
else
  echo -e "  ${YELLOW}⚠${NC} Brasão: HTTP ${BRASAO:-timeout}"
fi

echo ""
COMMIT=$(cd "$APP_DIR" && git log --oneline -1 2>/dev/null || echo "N/A")
log "Versão: ${COMMIT}"
echo ""
echo -e "  ${BOLD}Logs:${NC} pm2 logs biblioteca --nostream"
echo ""
