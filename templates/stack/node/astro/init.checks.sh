# Astro framework checks

# Astro CLI available
if command -v pnpm >/dev/null 2>&1; then
  if pnpm astro --version >/dev/null 2>&1; then
    ok "Astro CLI available via pnpm"
  else
    warn "Astro CLI not found — run 'pnpm add -D astro' if needed"
  fi
else
  warn "pnpm not found — skipping Astro check"
fi

# TypeScript (Astro uses .ts files)
if command -v pnpm >/dev/null 2>&1; then
  if pnpm tsc --version >/dev/null 2>&1; then
    ok "TypeScript available via pnpm"
  else
    warn "TypeScript not found — run 'pnpm add -D typescript' if needed"
  fi
else
  warn "pnpm not found — skipping TypeScript check"
fi
