# Astro framework checks

# Astro CLI available
if command -v npx >/dev/null 2>&1; then
  if npx astro --version >/dev/null 2>&1; then
    ok "Astro CLI available via npx"
  else
    warn "Astro CLI not found — run 'npm i -D astro' if needed"
  fi
else
  warn "npx not found — skipping Astro check"
fi

# TypeScript (Astro uses .ts files)
if command -v npx >/dev/null 2>&1; then
  if npx tsc --version >/dev/null 2>&1; then
    ok "TypeScript available via npx"
  else
    warn "TypeScript not found — run 'npm i -D typescript' if needed"
  fi
else
  warn "npx not found — skipping TypeScript check"
fi
