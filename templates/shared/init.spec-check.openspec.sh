echo "── 3. Validating OpenSpec specs and changes ────────────"

if [ ! -f "openspec/config.yaml" ]; then
  fail "Missing openspec/config.yaml — run \`openspec init\`"
  EXIT_CODE=1
elif command -v openspec >/dev/null 2>&1; then
  if openspec validate --all --no-interactive 2>&1; then
    ok "OpenSpec specs and changes valid"
  else
    fail "openspec validate reported problems"
    EXIT_CODE=1
  fi
else
  warn "openspec CLI not installed — skipping spec validation (npm i -g @fission-ai/openspec)"
fi
