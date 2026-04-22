#!/bin/bash
# ============================================================
#  Beserra Library — Restaurar banco de dados a partir de backup
#
#  Uso:
#    bash restaurar-banco.sh                    # lista backups disponíveis
#    bash restaurar-banco.sh ARQUIVO.tar.gz     # restaura arquivo específico
#
#  Exemplo:
#    bash restaurar-banco.sh ~/backups/db-pre-update-20250422_143000.tar.gz
# ============================================================

APP_DIR="$HOME/beserra-library"
BACKUP_DIR="$HOME/backups"
DB_STATE="$APP_DIR/.wrangler/state"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${GREEN}✔ ${NC}$1"; }
info()    { echo -e "${BLUE}ℹ ${NC}$1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}$1"; }
error()   { echo -e "${RED}✘ ERRO: $1${NC}"; exit 1; }
section() { echo -e "\n${BOLD}${CYAN}─── $1 ───${NC}\n"; }

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   Beserra Library — Restaurar Banco de Dados         ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}\n"

# ── Verifica diretório da aplicação ──────────────────────
[ ! -d "$APP_DIR" ] && error "Diretório $APP_DIR não encontrado. Execute setup.sh primeiro."

# ── Se não passou argumento, lista backups disponíveis ───
if [ -z "$1" ]; then
  section "Backups disponíveis em $BACKUP_DIR"

  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls "$BACKUP_DIR"/*.tar.gz 2>/dev/null)" ]; then
    warn "Nenhum backup encontrado em $BACKUP_DIR"
    echo ""
    echo -e "  Para criar um backup agora, execute:"
    echo -e "  ${CYAN}bash ~/backup-beserra.sh${NC}"
    echo ""
    exit 0
  fi

  echo -e "  ${BOLD}N°  Arquivo                                    Tamanho  Data${NC}"
  echo -e "  ─────────────────────────────────────────────────────────────"

  i=1
  declare -a BACKUP_FILES
  while IFS= read -r f; do
    NOME=$(basename "$f")
    TAMANHO=$(du -sh "$f" 2>/dev/null | cut -f1)
    DATA=$(stat -c "%y" "$f" 2>/dev/null | cut -d'.' -f1)
    printf "  ${CYAN}%-3s${NC} %-44s %-8s %s\n" "[$i]" "$NOME" "$TAMANHO" "$DATA"
    BACKUP_FILES[$i]="$f"
    i=$((i+1))
  done < <(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null)

  echo ""
  echo -e "  ${BOLD}[0]${NC} Cancelar"
  echo ""
  read -rp "  Escolha o número do backup para restaurar: " ESCOLHA

  [ "$ESCOLHA" = "0" ] || [ -z "$ESCOLHA" ] && { echo -e "${GREEN}  Operação cancelada.${NC}"; exit 0; }

  BACKUP_FILE="${BACKUP_FILES[$ESCOLHA]}"
  [ -z "$BACKUP_FILE" ] && error "Opção inválida: $ESCOLHA"
else
  BACKUP_FILE="$1"
fi

# ── Valida o arquivo escolhido ────────────────────────────
section "Validando backup"
[ ! -f "$BACKUP_FILE" ] && error "Arquivo não encontrado: $BACKUP_FILE"

info "Arquivo: $(basename "$BACKUP_FILE")"
info "Tamanho: $(du -sh "$BACKUP_FILE" | cut -f1)"

# Verifica integridade do tar.gz
if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
  log "Arquivo íntegro (sem corrupção)"
else
  error "Arquivo corrompido ou inválido: $BACKUP_FILE"
fi

# Mostra conteúdo do backup
info "Conteúdo do backup:"
tar -tzf "$BACKUP_FILE" | head -10 | while read -r line; do
  echo "     $line"
done

echo ""
echo -e "  ${YELLOW}${BOLD}⚠ ATENÇÃO: O banco atual será substituído pelo backup!${NC}"
echo -e "  ${YELLOW}  Todos os dados cadastrados APÓS este backup serão perdidos.${NC}"
echo ""
read -rp "  Confirma a restauração? [s/N]: " CONFIRMA
CONFIRMA="${CONFIRMA,,}"  # converte para minúsculo

[ "$CONFIRMA" != "s" ] && [ "$CONFIRMA" != "sim" ] && {
  echo -e "${GREEN}  Operação cancelada. Nenhum dado foi alterado.${NC}"
  exit 0
}

# ── 1. Para a aplicação ───────────────────────────────────
section "1. Parando aplicação (PM2)"
pm2 stop biblioteca 2>/dev/null && log "PM2 parado" || warn "PM2 não estava rodando"

# ── 2. Backup do banco ATUAL antes de restaurar ───────────
section "2. Backup de segurança do banco atual"
if [ -d "$DB_STATE" ]; then
  mkdir -p "$BACKUP_DIR"
  PRE_RESTORE_BACKUP="$BACKUP_DIR/db-pre-restore-$(date +%Y%m%d_%H%M%S).tar.gz"
  tar -czf "$PRE_RESTORE_BACKUP" -C "$APP_DIR" .wrangler/state 2>/dev/null
  log "Banco atual salvo em: $PRE_RESTORE_BACKUP"
  info "(Se precisar desfazer, use este arquivo)"
else
  warn "Banco atual não encontrado — nada a fazer backup"
fi

# ── 3. Remove banco atual ─────────────────────────────────
section "3. Removendo banco atual"
rm -rf "$DB_STATE"
log "Banco atual removido"

# ── 4. Restaura o backup ──────────────────────────────────
section "4. Restaurando banco do backup"
mkdir -p "$APP_DIR/.wrangler"
tar -xzf "$BACKUP_FILE" -C "$APP_DIR"
if [ $? -eq 0 ]; then
  log "Banco restaurado com sucesso"
else
  error "Falha ao restaurar. Tente manualmente: tar -xzf $BACKUP_FILE -C $APP_DIR"
fi

# Verifica se o banco foi restaurado corretamente
if [ -d "$DB_STATE" ]; then
  DB_SIZE=$(du -sh "$DB_STATE" 2>/dev/null | cut -f1)
  log "Banco verificado: $DB_STATE ($DB_SIZE)"
else
  warn "Diretório .wrangler/state não encontrado após restauração"
  info "Estrutura restaurada:"
  ls -la "$APP_DIR/.wrangler/" 2>/dev/null || true
fi

# ── 5. Reinicia a aplicação ───────────────────────────────
section "5. Reiniciando aplicação"
if pm2 list 2>/dev/null | grep -q "biblioteca"; then
  pm2 start biblioteca
else
  cd "$APP_DIR"
  pm2 start ecosystem.config.cjs
fi

sleep 4

HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 http://localhost:3000/ 2>/dev/null)
if [ "$HTTP" = "200" ] || [ "$HTTP" = "301" ] || [ "$HTTP" = "302" ]; then
  log "Aplicação online (HTTP ${HTTP})"
else
  warn "App pode ainda estar iniciando (HTTP ${HTTP:-timeout})"
  info "Verifique: pm2 logs biblioteca --nostream"
fi

# ── Relatório final ───────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   ✅ Banco restaurado com sucesso!                   ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""
log "Backup restaurado: $(basename "$BACKUP_FILE")"
[ -n "$PRE_RESTORE_BACKUP" ] && info "Banco anterior salvo em: $PRE_RESTORE_BACKUP"
echo ""
echo -e "  ${BOLD}Comandos úteis:${NC}"
echo -e "  ${CYAN}pm2 logs biblioteca --nostream${NC}   # ver logs"
echo -e "  ${CYAN}pm2 status${NC}                       # status PM2"
echo -e "  ${CYAN}ls -lh ~/backups/${NC}                # ver todos os backups"
echo ""
