#!/bin/bash
# ============================================================
#  Beserra Library — Diagnóstico de problemas de acesso
#  Uso: bash diagnostico.sh [dominio.com.br]
#  Roda na VM e mostra o que está errado
# ============================================================

DOMAIN="${1:-beserralibrary.com.br}"
APP_DIR="$HOME/beserra-library"
APP_PORT=3000

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "  ${GREEN}✔ ${NC}$1"; }
fail() { echo -e "  ${RED}✘ ${NC}$1"; }
warn() { echo -e "  ${YELLOW}⚠ ${NC}$1"; }
info() { echo -e "  ${BLUE}ℹ ${NC}$1"; }
sep()  { echo -e "\n${BOLD}${CYAN}─── $1 ───${NC}"; }

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   Beserra Library — Diagnóstico de Acesso            ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}\n"

# ─── 1. IP da VM ──────────────────────────────────────────
sep "1. IP da VM"
VM_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null \
     || curl -s --max-time 5 icanhazip.com 2>/dev/null \
     || echo "")
if [ -n "$VM_IP" ]; then
  ok "IP externo da VM: ${BOLD}${VM_IP}${NC}"
else
  fail "Não foi possível obter o IP externo da VM"
fi

# ─── 2. DNS do domínio ────────────────────────────────────
sep "2. DNS — ${DOMAIN}"
DOMAIN_IP=$(dig +short "${DOMAIN}" 2>/dev/null | grep -E '^[0-9]+\.' | tail -1 \
         || nslookup "${DOMAIN}" 2>/dev/null | awk '/^Address:/{ip=$2} END{print ip}' \
         || echo "")

if [ -z "$DOMAIN_IP" ]; then
  fail "Domínio ${DOMAIN} não resolveu — DNS não configurado ou ainda propagando"
  info "Configure o registro A do domínio para apontar para: ${VM_IP:-IP_DA_VM}"
elif [ "$DOMAIN_IP" = "$VM_IP" ]; then
  ok "DNS OK — ${DOMAIN} → ${DOMAIN_IP} (aponta para esta VM)"
else
  fail "DNS ERRADO — ${DOMAIN} → ${DOMAIN_IP}  (esperado: ${VM_IP:-IP_DA_VM})"
  info "Corrija o registro A do domínio para: ${VM_IP:-IP_DA_VM}"
fi

# ─── 3. Aplicação Node.js (PM2) ───────────────────────────
sep "3. Aplicação Node.js (PM2 — porta ${APP_PORT})"
if command -v pm2 &>/dev/null; then
  PM2_STATUS=$(pm2 list --no-color 2>/dev/null | grep "biblioteca" | awk '{print $10}' | head -1)
  if [ "$PM2_STATUS" = "online" ]; then
    ok "PM2 processo 'biblioteca' está ${BOLD}online${NC}"
  elif [ -n "$PM2_STATUS" ]; then
    fail "PM2 processo 'biblioteca' está ${BOLD}${PM2_STATUS}${NC}"
    info "Reinicie com: pm2 restart biblioteca"
    info "Veja os logs: pm2 logs biblioteca --nostream --lines 30"
  else
    fail "Processo 'biblioteca' não encontrado no PM2"
    info "Inicie com: cd ${APP_DIR} && pm2 start ecosystem.config.cjs"
  fi
else
  fail "PM2 não instalado"
  info "Instale com: npm install -g pm2"
fi

# App responde localmente?
HTTP_LOCAL=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:${APP_PORT}/" 2>/dev/null)
if [ "$HTTP_LOCAL" = "200" ] || [ "$HTTP_LOCAL" = "301" ] || [ "$HTTP_LOCAL" = "302" ]; then
  ok "App responde em http://localhost:${APP_PORT} (HTTP ${HTTP_LOCAL})"
else
  fail "App NÃO responde em http://localhost:${APP_PORT} (HTTP ${HTTP_LOCAL:-timeout})"
  info "Verifique: pm2 logs biblioteca --nostream --lines 50"
fi

# ─── 4. Nginx ─────────────────────────────────────────────
sep "4. Nginx"
if command -v nginx &>/dev/null; then
  NGINX_STATUS=$(sudo systemctl is-active nginx 2>/dev/null || echo "unknown")
  if [ "$NGINX_STATUS" = "active" ]; then
    ok "Nginx está rodando"
  else
    fail "Nginx está ${NGINX_STATUS}"
    info "Inicie com: sudo systemctl start nginx"
  fi

  # Testa config
  NGINX_TEST=$(sudo nginx -t 2>&1)
  if echo "$NGINX_TEST" | grep -q "syntax is ok"; then
    ok "Configuração do Nginx sem erros de sintaxe"
  else
    fail "Erro na configuração do Nginx:"
    echo "$NGINX_TEST" | grep -i "error" | while read -r line; do
      echo -e "     ${RED}→ $line${NC}"
    done
    info "Corrija e recarregue: sudo nginx -t && sudo systemctl reload nginx"
  fi

  # Verifica se o site beserra-library está ativo
  if [ -f /etc/nginx/sites-enabled/beserra-library ]; then
    ok "Site beserra-library habilitado no Nginx"
  else
    fail "Site beserra-library NÃO está habilitado"
    info "Ative com: sudo ln -sf /etc/nginx/sites-available/beserra-library /etc/nginx/sites-enabled/"
    info "E recarregue: sudo systemctl reload nginx"
  fi

  # Mostra server_name configurado
  SERVER_NAME_CONF=$(grep "server_name" /etc/nginx/sites-available/beserra-library 2>/dev/null | head -1 | xargs)
  [ -n "$SERVER_NAME_CONF" ] && info "server_name configurado: ${SERVER_NAME_CONF}"

else
  fail "Nginx não instalado"
  info "Instale com: sudo apt install -y nginx"
fi

# ─── 5. Firewall (portas 80 e 443) ───────────────────────
sep "5. Firewall (portas 80 e 443)"
if command -v ufw &>/dev/null; then
  UFW_STATUS=$(sudo ufw status 2>/dev/null | head -1)
  info "UFW status: ${UFW_STATUS}"
  if sudo ufw status 2>/dev/null | grep -q "80\|Nginx"; then
    ok "Porta 80 (HTTP) liberada no firewall"
  else
    fail "Porta 80 pode estar bloqueada no UFW"
    info "Libere com: sudo ufw allow 'Nginx Full'"
  fi
else
  warn "UFW não instalado — verifique regras de firewall da GCP (VPC Firewall Rules)"
fi

# Verifica regras de firewall GCP (metadata server)
info "Verificando regras de firewall GCP..."
GCP_TAGS=$(curl -s --max-time 3 -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/tags" 2>/dev/null || echo "")
[ -n "$GCP_TAGS" ] && info "Tags da instância GCP: ${GCP_TAGS}" \
  || warn "Não foi possível ler metadados GCP — verifique as regras de firewall no Console GCP"

# ─── 6. SSL / HTTPS ───────────────────────────────────────
sep "6. SSL / HTTPS"
if command -v certbot &>/dev/null; then
  CERT_LIST=$(sudo certbot certificates 2>/dev/null | grep "Domains:" | head -3)
  if echo "$CERT_LIST" | grep -q "$DOMAIN"; then
    ok "Certificado SSL válido para ${DOMAIN}"
    EXPIRY=$(sudo certbot certificates 2>/dev/null | grep -A3 "$DOMAIN" | grep "Expiry" | head -1 | xargs)
    [ -n "$EXPIRY" ] && info "${EXPIRY}"
  else
    warn "Nenhum certificado SSL para ${DOMAIN}"
    if [ "$DOMAIN_IP" = "$VM_IP" ] && [ "$HTTP_LOCAL" = "200" ]; then
      info "DNS OK e app rodando — instale o SSL com:"
      echo -e "     ${CYAN}sudo certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect${NC}"
    else
      warn "Resolva os problemas de DNS/App antes de instalar SSL"
    fi
  fi
else
  warn "Certbot não instalado"
  info "Instale com: sudo apt install -y certbot python3-certbot-nginx"
fi

# Testa HTTPS
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://${DOMAIN}/" 2>/dev/null)
if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] || [ "$HTTPS_CODE" = "302" ]; then
  ok "HTTPS respondendo para https://${DOMAIN} (HTTP ${HTTPS_CODE})"
elif [ -z "$HTTPS_CODE" ] || [ "$HTTPS_CODE" = "000" ]; then
  fail "HTTPS não responde em https://${DOMAIN} (timeout)"
else
  fail "HTTPS retornou HTTP ${HTTPS_CODE} em https://${DOMAIN}"
fi

# ─── 7. Banco de dados ────────────────────────────────────
sep "7. Banco de dados (SQLite)"
DB_PATH="${APP_DIR}/.wrangler/state/v3/d1"
if [ -d "$DB_PATH" ]; then
  DB_SIZE=$(du -sh "$DB_PATH" 2>/dev/null | cut -f1)
  ok "Banco de dados encontrado em: ${DB_PATH} (${DB_SIZE})"
else
  warn "Banco de dados não encontrado em: ${DB_PATH}"
  info "Pode ser que a aplicação ainda não foi iniciada pela primeira vez"
fi

# ─── Resumo ───────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗"
echo -e "║   RESUMO E PRÓXIMOS PASSOS                           ║"
echo -e "╚══════════════════════════════════════════════════════╝${NC}"
echo ""

PROBLEMS=0

[ -z "$VM_IP" ] && { echo -e "  ${RED}✘${NC} VM sem IP externo"; PROBLEMS=$((PROBLEMS+1)); }
[ -z "$DOMAIN_IP" ] && { echo -e "  ${RED}✘${NC} DNS não configurado para ${DOMAIN} → configure o registro A para ${VM_IP:-IP_DA_VM}"; PROBLEMS=$((PROBLEMS+1)); }
[ -n "$DOMAIN_IP" ] && [ "$DOMAIN_IP" != "$VM_IP" ] && { echo -e "  ${RED}✘${NC} DNS aponta para ${DOMAIN_IP} mas VM é ${VM_IP} → corrija o registro A"; PROBLEMS=$((PROBLEMS+1)); }
[ "$HTTP_LOCAL" != "200" ] && [ "$HTTP_LOCAL" != "301" ] && [ "$HTTP_LOCAL" != "302" ] && { echo -e "  ${RED}✘${NC} App não responde localmente → verifique PM2: pm2 logs biblioteca --nostream"; PROBLEMS=$((PROBLEMS+1)); }
[ "$(sudo systemctl is-active nginx 2>/dev/null)" != "active" ] && { echo -e "  ${RED}✘${NC} Nginx parado → sudo systemctl start nginx"; PROBLEMS=$((PROBLEMS+1)); }

if [ $PROBLEMS -eq 0 ]; then
  echo -e "  ${GREEN}${BOLD}✔ Tudo parece OK!${NC}"
  echo -e "  Acesse: ${CYAN}http://${DOMAIN}${NC}"
  [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] && echo -e "  Acesse: ${CYAN}https://${DOMAIN}${NC}"
fi

echo ""
echo -e "  ${BOLD}Logs úteis:${NC}"
echo -e "  ${CYAN}pm2 logs biblioteca --nostream --lines 30${NC}"
echo -e "  ${CYAN}sudo tail -20 /var/log/nginx/beserra-error.log${NC}"
echo -e "  ${CYAN}sudo tail -20 /var/log/nginx/beserra-access.log${NC}"
echo ""
