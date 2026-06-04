# React framework checks

# TypeScript available (common in React projects)
if command -v pnpm >/dev/null 2>&1; then
  if pnpm tsc --version >/dev/null 2>&1; then
    ok "TypeScript available via pnpm"
  else
    warn "TypeScript not found — run 'pnpm add -D typescript' if needed"
  fi
else
  warn "pnpm not found — skipping TypeScript check"
fi

# Vite available (common React bundler)
if command -v pnpm >/dev/null 2>&1; then
  if pnpm vite --version >/dev/null 2>&1; then
    ok "Vite available via pnpm"
  else
    warn "Vite not found — not required if using another bundler"
  fi
else
  warn "pnpm not found — skipping Vite check"
fi
