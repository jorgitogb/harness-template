# Django framework checks

# Django installed
if python3 -c "import django" 2>/dev/null; then
  DJANGO_VER=$(python3 -c "import django; print(django.get_version())" 2>/dev/null || echo "unknown")
  ok "django -> $DJANGO_VER"
else
  warn "django not installed — run 'pip install django'"
fi

# manage.py exists
if [ -f "manage.py" ]; then
  ok "manage.py found"
else
  warn "manage.py not found — Django project may not be configured"
fi

# Django check command
if python3 -c "import django" 2>/dev/null && [ -f "manage.py" ]; then
  if python3 manage.py check 2>&1 | grep -q "System check identified no issues"; then
    ok "Django system checks pass"
  else
    warn "Django system check found issues — run 'python manage.py check'"
  fi
else
  warn "Skipping Django system check"
fi
