# Node.js runtime checks for init.sh

# Node available
if ! command -v node >/dev/null 2>&1; then
  fail "node is not installed"
  exit 1
fi
ok "node -> $(node --version)"

# npm available
if ! command -v npm >/dev/null 2>&1; then
  fail "npm is not installed"
  exit 1
fi
ok "npm -> $(npm --version)"
