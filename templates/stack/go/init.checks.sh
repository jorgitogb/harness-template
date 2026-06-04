# Go runtime checks for init.sh

# Go available
if ! command -v go >/dev/null 2>&1; then
  fail "go is not installed"
  exit 1
fi
ok "go -> $(go version)"
