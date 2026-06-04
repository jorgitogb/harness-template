# Rust runtime checks for init.sh

# Rust available
if ! command -v rustc >/dev/null 2>&1; then
  fail "rustc is not installed"
  exit 1
fi
ok "rustc -> $(rustc --version)"

# Cargo available
if ! command -v cargo >/dev/null 2>&1; then
  fail "cargo is not installed"
  exit 1
fi
ok "cargo -> $(cargo --version)"
