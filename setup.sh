#!/bin/bash
# ============================================================
#  Beserra Library — Script de instalação para Google Cloud VM
#  Ubuntu 22.04 LTS
#  Uso: bash setup.sh [--repo URL_DO_GITHUB] [--domain SEU_DOMINIO]
#
#  SEGURANÇA DO BANCO DE DADOS:
#  ✔ O banco (.wrangler/state) NUNCA é apagado automaticamente
#  ✔ Ao atualizar o código, o banco existente é PRESERVADO
#  ✔ Backups automáticos diários às 02:00
# ============================================================

set -e  # Para imediatamente em qualquer erro

# ── Cores ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # sem cor

# ── Funções de log ───────────────────────────────────────────
log()     { echo -e "${GREEN}✔ ${NC}$1"; }
info()    { echo -e "${BLUE}ℹ ${NC}$1"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}$1"; }
error()   { echo -e "${RED}✘ ERRO: $1${NC}"; exit 1; }
section() { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${NC}\n"; }

# ── Banner ───────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
echo "  ██████╗ ███████╗███████╗███████╗██████╗ ██████╗  █████╗ "
echo "  ██╔══██╗██╔════╝██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗"
echo "  ██████╔╝█████╗  ███████╗█████╗  ██████╔╝██████╔╝███████║"
echo "  ██╔══██╗██╔══╝  ╚════██║██╔══╝  ██╔══██╗██╔══██╗██╔══██║"
echo "  ██████╔╝███████╗███████║███████╗██║  ██║██║  ██║██║  ██║"
echo "  ╚═════╝ ╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "${BOLD}  Beserra Library — Instalação Automática para Google Cloud VM${NC}"
echo -e "  Ubuntu 22.04 LTS | Node.js 20 | PM2 | Nginx | SQLite\n"

# ── Argumentos ───────────────────────────────────────────────
REPO_URL=""
DOMAIN=""
APP_PORT=3000
APP_DIR="$HOME/beserra-library"

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --repo)    REPO_URL="$2"; shift ;;
    --domain)  DOMAIN="$2"; shift ;;
    --port)    APP_PORT="$2"; shift ;;
    --dir)     APP_DIR="$2"; shift ;;
    *) warn "Argumento desconhecido: $1" ;;
  esac
  shift
done

# ── Verificar sistema operacional ────────────────────────────
section "Verificando sistema"
if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
  warn "Este script foi testado no Ubuntu 22.04. Outros sistemas podem precisar de ajustes."
fi
info "Usuário: $(whoami)"
info "Diretório da aplicação: $APP_DIR"
info "Porta da aplicação: $APP_PORT"
[ -n "$REPO_URL" ] && info "Repositório: $REPO_URL"
[ -n "$DOMAIN" ]   && info "Domínio: $DOMAIN"

# ── 1. Atualizar sistema ─────────────────────────────────────
section "1/8 — Atualizando sistema"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git unzip software-properties-common ufw
log "Sistema atualizado"

# ── 2. Instalar Node.js 20 ───────────────────────────────────
section "2/8 — Instalando Node.js 20"
if command -v node &>/dev/null && [[ "$(node -v)" == v20* ]]; then
  log "Node.js 20 já instalado: $(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  log "Node.js instalado: $(node -v)"
fi
log "npm: $(npm -v)"

# ── 3. Instalar PM2 ─────────────────────────────────────────
section "3/8 — Instalando PM2"
if command -v pm2 &>/dev/null; then
  log "PM2 já instalado: $(pm2 -v)"
else
  sudo npm install -g pm2
  log "PM2 instalado: $(pm2 -v)"
fi

# ── 4. Instalar Nginx ────────────────────────────────────────
section "4/8 — Instalando Nginx"
if command -v nginx &>/dev/null; then
  log "Nginx já instalado: $(nginx -v 2>&1)"
else
  sudo apt-get install -y nginx
  log "Nginx instalado"
fi
sudo systemctl enable nginx
sudo systemctl start nginx

# ── 5. Clonar ou atualizar o projeto ─────────────────────────
section "5/8 — Configurando projeto"

# ════════════════════════════════════════════════════════════
#  PROTEÇÃO DO BANCO DE DADOS
#  O banco fica em $APP_DIR/.wrangler/state/
#  Esta pasta NUNCA é apagada pelo script — mesmo ao atualizar
# ════════════════════════════════════════════════════════════

DB_DIR="$APP_DIR/.wrangler/state"
DB_BACKUP=""

# Função: fazer backup do banco se existir
fazer_backup_banco() {
  if [ -d "$DB_DIR" ]; then
    mkdir -p "$HOME/backups"
    DB_BACKUP="$HOME/backups/db-pre-update-$(date +%Y%m%d_%H%M%S).tar.gz"
    tar -czf "$DB_BACKUP" -C "$APP_DIR" .wrangler/state 2>/dev/null || true
    echo ""
    echo -e "${GREEN}${BOLD}  💾 Backup do banco criado: ${DB_BACKUP}${NC}"
    echo ""
  fi
}

# Função: restaurar banco após update de código
restaurar_banco() {
  if [ -n "$DB_BACKUP" ] && [ -f "$DB_BACKUP" ]; then
    # Remove apenas os arquivos de código, preserva .wrangler
    info "Restaurando banco de dados preservado..."
    mkdir -p "$APP_DIR/.wrangler"
    tar -xzf "$DB_BACKUP" -C "$APP_DIR" 2>/dev/null || true
    log "Banco de dados restaurado com sucesso"
  fi
}

if [ -d "$APP_DIR" ]; then
  # ── Instalação já existe ──────────────────────────────────
  echo ""
  echo -e "${YELLOW}${BOLD}  O diretório $APP_DIR já existe.${NC}"
  echo -e "${YELLOW}  Escolha uma opção:${NC}"
  echo -e "  ${BOLD}[1]${NC} Atualizar código (mantém banco de dados) ${GREEN}← RECOMENDADO${NC}"
  echo -e "  ${BOLD}[2]${NC} Reinstalar tudo (apaga TUDO incluindo banco) ${RED}← PERIGO${NC}"
  echo -e "  ${BOLD}[3]${NC} Cancelar"
  echo ""
  read -rp "  Opção [1/2/3] (padrão: 1): " OPCAO
  OPCAO="${OPCAO:-1}"

  case "$OPCAO" in
    1)
      # ── ATUALIZAR CÓDIGO — BANCO PRESERVADO ──────────────
      echo ""
      echo -e "${GREEN}${BOLD}  Modo: Atualizar código — banco de dados PRESERVADO${NC}"
      echo ""

      # Para PM2
      pm2 stop biblioteca 2>/dev/null || true

      # Faz backup preventivo do banco
      fazer_backup_banco

      if [ -n "$REPO_URL" ]; then
        # Tem repositório: atualiza via git
        cd "$APP_DIR"
        # Configura remote se não existir
        if ! git remote get-url origin &>/dev/null; then
          git remote add origin "$REPO_URL"
        fi

        # Salva o banco temporariamente fora do APP_DIR
        TMP_DB="/tmp/beserra-db-backup-$$"
        if [ -d "$DB_DIR" ]; then
          cp -r "$APP_DIR/.wrangler" "$TMP_DB"
          log "Banco copiado para área segura temporária"
        fi

        # Atualiza código
        git fetch origin
        git reset --hard origin/main
        log "Código atualizado do GitHub"

        # Restaura o banco
        if [ -d "$TMP_DB" ]; then
          rm -rf "$APP_DIR/.wrangler"
          cp -r "$TMP_DB" "$APP_DIR/.wrangler"
          rm -rf "$TMP_DB"
          log "Banco de dados restaurado após update"
        fi
      else
        # Sem repositório: apenas atualiza dependências e build
        info "Sem repositório informado. Atualizando dependências e build..."
        cd "$APP_DIR"

        # Salva banco
        TMP_DB="/tmp/beserra-db-backup-$$"
        if [ -d "$DB_DIR" ]; then
          cp -r "$APP_DIR/.wrangler" "$TMP_DB"
        fi

        npm install --legacy-peer-deps
        npm run build

        # Restaura banco
        if [ -d "$TMP_DB" ]; then
          rm -rf "$APP_DIR/.wrangler"
          cp -r "$TMP_DB" "$APP_DIR/.wrangler"
          rm -rf "$TMP_DB"
          log "Banco de dados restaurado após build"
        fi
      fi
      ;;

    2)
      # ── REINSTALAÇÃO TOTAL — PERIGO ───────────────────────
      echo ""
      echo -e "${RED}${BOLD}  ⚠ ATENÇÃO: Isso vai APAGAR todos os dados cadastrados!${NC}"
      echo -e "${RED}  Livros, usuários, empréstimos, configurações PIX — tudo será perdido.${NC}"
      echo ""
      read -rp "  Digite CONFIRMAR para prosseguir: " CONFIRMACAO
      if [ "$CONFIRMACAO" != "CONFIRMAR" ]; then
        echo -e "${GREEN}  Operação cancelada. Nada foi apagado.${NC}"
        exit 0
      fi

      # Faz backup mesmo assim
      fazer_backup_banco
      if [ -n "$DB_BACKUP" ]; then
        echo -e "${YELLOW}  Backup salvo em: $DB_BACKUP${NC}"
        echo -e "${YELLOW}  Para restaurar: tar -xzf $DB_BACKUP -C $APP_DIR${NC}"
        echo ""
      fi

      pm2 stop biblioteca 2>/dev/null || true
      pm2 delete biblioteca 2>/dev/null || true
      rm -rf "$APP_DIR"
      log "Diretório removido"
      ;;

    3)
      echo -e "${GREEN}  Operação cancelada.${NC}"
      exit 0
      ;;

    *)
      warn "Opção inválida. Usando opção 1 (atualizar código)."
      OPCAO=1
      ;;
  esac
fi

# ── Clonar repositório (nova instalação ou reinstalação) ─────
if [ ! -d "$APP_DIR" ]; then
  if [ -n "$REPO_URL" ]; then
    info "Clonando repositório: $REPO_URL"
    git clone "$REPO_URL" "$APP_DIR"
    log "Repositório clonado"
  else
    warn "Nenhum repositório informado."
    info "Criando diretório $APP_DIR..."
    mkdir -p "$APP_DIR"
    echo -e "\n${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW} Copie os arquivos do projeto para: $APP_DIR${NC}"
    echo -e "${YELLOW} Em seguida, execute novamente: bash setup.sh${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    echo -e "${BOLD}Como enviar os arquivos do seu computador para a VM:${NC}"
    echo ""
    echo -e "  ${CYAN}# No seu computador local, execute:${NC}"
    echo -e "  ${BOLD}gcloud compute scp --recurse ./beserra-library/* beserra-library:$APP_DIR/ --zone=ZONA${NC}"
    echo ""
    echo -e "  ${CYAN}# Ou usando scp comum:${NC}"
    echo -e "  ${BOLD}scp -r ./beserra-library/* usuario@IP_DA_VM:$APP_DIR/${NC}"
    echo ""
    exit 0
  fi
fi

# ── 6. Instalar dependências e build ─────────────────────────
section "6/8 — Instalando dependências e fazendo build"
cd "$APP_DIR"

if [ ! -f "package.json" ]; then
  error "package.json não encontrado em $APP_DIR. Verifique se os arquivos foram copiados corretamente."
fi

info "Instalando dependências npm..."
npm install --legacy-peer-deps
log "Dependências instaladas"

info "Fazendo build da aplicação..."
npm run build
log "Build concluído — dist/ gerado"

# ── 7. Configurar PM2 ────────────────────────────────────────
section "7/8 — Configurando PM2"

# Gera ecosystem.config.cjs otimizado para produção na VM
cat > "$APP_DIR/ecosystem.config.cjs" << EOF
module.exports = {
  apps: [
    {
      name: 'biblioteca',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=DB --local --persist-to .wrangler/state --ip 127.0.0.1 --port ${APP_PORT}',
      cwd: '${APP_DIR}',
      env: {
        NODE_ENV: 'production',
        PORT: ${APP_PORT}
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 10,
      restart_delay: 3000,
      error_file: '${HOME}/.pm2/logs/biblioteca-error.log',
      out_file:   '${HOME}/.pm2/logs/biblioteca-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
EOF
log "ecosystem.config.cjs gerado"

# Para qualquer instância anterior
pm2 stop biblioteca 2>/dev/null || true
pm2 delete biblioteca 2>/dev/null || true

# Inicia a aplicação
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save

# Configura PM2 para iniciar automaticamente no boot
PM2_STARTUP=$(pm2 startup | grep "sudo" | tail -1)
if [ -n "$PM2_STARTUP" ]; then
  eval "$PM2_STARTUP"
  log "PM2 configurado para iniciar no boot"
fi

log "PM2 iniciado"

# ── 8. Configurar Nginx ──────────────────────────────────────
section "8/8 — Configurando Nginx"

SERVER_NAME="${DOMAIN:-_}"
NGINX_CONF="/etc/nginx/sites-available/beserra-library"

sudo tee "$NGINX_CONF" > /dev/null << EOF
# Beserra Library — Nginx config
# Gerado automaticamente por setup.sh

# Limita requisições para evitar abuso
limit_req_zone \$binary_remote_addr zone=api:10m rate=30r/m;

server {
    listen 80;
    server_name ${SERVER_NAME};

    # Segurança básica
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # Logs
    access_log /var/log/nginx/beserra-access.log;
    error_log  /var/log/nginx/beserra-error.log;

    # Proxy para a aplicação
    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # Rate limit nas APIs
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # Bloqueia acesso direto ao banco e arquivos sensíveis
    location ~ /\.(git|env|wrangler) {
        deny all;
        return 404;
    }
}
EOF

# Ativa o site e remove o default
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/beserra-library
sudo rm -f /etc/nginx/sites-enabled/default

# Testa a configuração
sudo nginx -t && sudo systemctl reload nginx
log "Nginx configurado e recarregado"

# ── Configurar Firewall (UFW) ────────────────────────────────
section "Configurando Firewall"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
log "Firewall configurado (SSH + HTTP + HTTPS liberados)"

# ── Configurar backup automático do banco ────────────────────
section "Configurando backup automático"

BACKUP_SCRIPT="$HOME/backup-beserra.sh"
cat > "$BACKUP_SCRIPT" << 'BEOF'
#!/bin/bash
# Backup automático do banco D1 (SQLite local)
BACKUP_DIR="$HOME/backups"
APP_DIR="$HOME/beserra-library"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

if [ -d "$APP_DIR/.wrangler/state" ]; then
  tar -czf "$BACKUP_DIR/db-$DATE.tar.gz" -C "$APP_DIR" .wrangler/state
  echo "[$DATE] Backup criado: db-$DATE.tar.gz"
  # Remove backups com mais de 7 dias
  find "$BACKUP_DIR" -name "db-*.tar.gz" -mtime +$KEEP_DAYS -delete
  echo "[$DATE] Backups antigos removidos"
else
  echo "[$DATE] AVISO: Diretório .wrangler/state não encontrado"
fi
BEOF

chmod +x "$BACKUP_SCRIPT"

# Adiciona cron job: backup diário às 02:00
(crontab -l 2>/dev/null | grep -v "backup-beserra"; echo "0 2 * * * $BACKUP_SCRIPT >> $HOME/backups/backup.log 2>&1") | crontab -
log "Backup diário configurado (02:00 todos os dias)"

# ── Aguardar aplicação iniciar ───────────────────────────────
section "Verificando aplicação"
info "Aguardando aplicação iniciar (15 segundos)..."
sleep 15

MAX_TRIES=6
TRIES=0
APP_OK=false

while [ $TRIES -lt $MAX_TRIES ]; do
  if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/" | grep -q "200"; then
    APP_OK=true
    break
  fi
  TRIES=$((TRIES + 1))
  info "Tentativa $TRIES/$MAX_TRIES — aguardando mais 10 segundos..."
  sleep 10
done

# ── Relatório final ──────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║           INSTALAÇÃO CONCLUÍDA — BESERRA LIBRARY             ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Pega IP externo
EXTERNAL_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "IP_DA_VM")

if $APP_OK; then
  echo -e "  ${GREEN}${BOLD}✔ Aplicação rodando com sucesso!${NC}"
else
  echo -e "  ${YELLOW}⚠ Aplicação ainda iniciando. Verifique com: pm2 logs biblioteca${NC}"
fi

echo ""
echo -e "  ${BOLD}🌐 Acesso:${NC}"
echo -e "     http://${EXTERNAL_IP}"
[ -n "$DOMAIN" ] && echo -e "     http://${DOMAIN}"
echo ""
echo -e "  ${BOLD}📂 Diretório:${NC}    $APP_DIR"
echo -e "  ${BOLD}🔌 Porta app:${NC}    $APP_PORT (interno)"
echo -e "  ${BOLD}🗃  Banco de dados:${NC} $APP_DIR/.wrangler/state/v3/d1/"
echo -e "  ${BOLD}💾 Backups:${NC}       $HOME/backups/ (diário às 02:00)"
echo -e "  ${BOLD}📋 Logs PM2:${NC}     pm2 logs biblioteca --nostream"
echo -e "  ${BOLD}📋 Logs Nginx:${NC}   sudo tail -f /var/log/nginx/beserra-access.log"
echo ""
echo -e "  ${BOLD}🛠  Comandos úteis:${NC}"
echo -e "     ${CYAN}pm2 list${NC}                    # status dos processos"
echo -e "     ${CYAN}pm2 restart biblioteca${NC}      # reiniciar app"
echo -e "     ${CYAN}pm2 logs biblioteca${NC}         # ver logs em tempo real"
echo -e "     ${CYAN}sudo systemctl status nginx${NC} # status do Nginx"
echo -e "     ${CYAN}bash ~/backup-beserra.sh${NC}    # backup manual agora"
echo ""

if [ -n "$DOMAIN" ]; then
  echo -e "  ${BOLD}🔒 HTTPS com Let's Encrypt:${NC}"
  echo -e "     ${CYAN}sudo apt install -y certbot python3-certbot-nginx${NC}"
  echo -e "     ${CYAN}sudo certbot --nginx -d ${DOMAIN}${NC}"
  echo ""
fi

echo -e "  ${BOLD}⚙️  Configurar chave PIX:${NC}"
echo -e "     Acesse ${CYAN}http://${EXTERNAL_IP}${NC} → menu ${BOLD}Configurações${NC}"
echo ""
echo -e "  ${BOLD}🔐 Credenciais iniciais:${NC}"
echo -e "     Email: ${CYAN}admin@beserra.com${NC}"
echo -e "     Senha: ${CYAN}admin123_CHANGE_ME${NC}  ← troque no primeiro acesso!"
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
