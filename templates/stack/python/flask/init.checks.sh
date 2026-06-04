# Flask framework checks

# Flask installed
if python3 -c "import flask" 2>/dev/null; then
  FLASK_VER=$(python3 -c "import flask; print(flask.__version__)" 2>/dev/null || echo "unknown")
  ok "flask -> $FLASK_VER"
else
  warn "flask not installed — run 'uv add flask'"
fi

# Flask CLI available
if command -v flask >/dev/null 2>&1; then
  ok "flask CLI available"
else
  warn "flask CLI not found — run 'uv add flask'"
fi

# Application factory exists
if [ -f "app/__init__.py" ] && grep -q "create_app" app/__init__.py 2>/dev/null; then
  ok "Application factory (create_app) found"
else
  warn "No application factory found — ensure app/__init__.py defines create_app()"
fi
