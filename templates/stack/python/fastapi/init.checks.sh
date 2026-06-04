# FastAPI framework checks

# FastAPI installed
if python3 -c "import fastapi" 2>/dev/null; then
  FASTAPI_VER=$(python3 -c "import fastapi; print(fastapi.__version__)" 2>/dev/null || echo "unknown")
  ok "fastapi -> $FASTAPI_VER"
else
  warn "fastapi not installed — run 'pip install fastapi'"
fi

# Uvicorn available (ASGI server)
if command -v uvicorn >/dev/null 2>&1; then
  ok "uvicorn -> $(uvicorn --version 2>&1 || echo 'installed')"
else
  warn "uvicorn not found — run 'pip install uvicorn[standard]'"
fi

# Pydantic available
if python3 -c "import pydantic" 2>/dev/null; then
  PYDANTIC_VER=$(python3 -c "import pydantic; print(pydantic.__version__)" 2>/dev/null || echo "unknown")
  ok "pydantic -> $PYDANTIC_VER"
else
  warn "pydantic not installed — required by FastAPI"
fi
