# React framework checks

# TypeScript available (common in React projects)
if command -v npx >/dev/null 2>&1; then
  if npx tsc --version >/dev/null 2>&1; then
    ok "TypeScript available via npx"
  else
    warn "TypeScript not found — run 'npm i -D typescript' if needed"
  fi
else
  warn "npx not found — skipping TypeScript check"
fi

# Vite available (common React bundler)
if command -v npx >/dev/null 2>&1; then
  if npx vite --version >/dev/null 2>&1; then
    ok "Vite available via npx"
  else
    warn "Vite not found — not required if using another bundler"
  fi
else
  warn "npx not found — skipping Vite check"
fi
