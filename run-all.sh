#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
AMBER='\033[0;33m'
GREEN='\033[0;32m'
DIM='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${AMBER}${BOLD}  GRIT${DIM}ZONE${NC}  ${DIM}— local dev setup${NC}"
echo ""

# 1. Check .env.local
if [ ! -f .env.local ]; then
  echo -e "${RED}✗ .env.local not found${NC}"
  echo ""
  echo "  Create it with your Supabase credentials:"
  echo ""
  echo "    cp .env.local.example .env.local"
  echo "    # Then edit .env.local with your values"
  echo ""
  exit 1
fi

# Validate env vars are filled in
source <(grep -v '^#' .env.local | sed 's/^/export /')
if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" || "$NEXT_PUBLIC_SUPABASE_URL" == "your-"* ]]; then
  echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL not configured in .env.local${NC}"
  exit 1
fi
if [[ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" || "$NEXT_PUBLIC_SUPABASE_ANON_KEY" == "your-"* ]]; then
  echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_ANON_KEY not configured in .env.local${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} .env.local configured"

# 2. Install deps if needed
if [ ! -d node_modules ]; then
  echo -e "${DIM}Installing dependencies...${NC}"
  npm install
else
  echo -e "${GREEN}✓${NC} node_modules exists"
fi

# 3. Type check
echo -e "${DIM}Running type check...${NC}"
npx tsc --noEmit 2>&1 && echo -e "${GREEN}✓${NC} Types OK" || {
  echo -e "${RED}✗ Type errors found${NC}"
  exit 1
}

# 4. Build
echo -e "${DIM}Building...${NC}"
npm run build 2>&1 | tail -5
echo -e "${GREEN}✓${NC} Build OK"

# 5. Start dev server
echo ""
echo -e "${AMBER}${BOLD}Starting dev server...${NC}"
echo -e "${DIM}  http://localhost:3000${NC}"
echo ""
npm run dev
