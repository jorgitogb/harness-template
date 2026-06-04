# Python runtime checks for init.sh

# Python available
if ! command -v python3 >/dev/null 2>&1; then
  fail "python3 is not installed"
  exit 1
fi
ok "python3 -> $(python3 --version)"

# Minimum version 3.9
PY_VERSION_OK=$(python3 -c 'import sys; print(int(sys.version_info >= (3, 9)))')
if [ "$PY_VERSION_OK" != "1" ]; then
  fail "Python >= 3.9 required"
  exit 1
fi
ok "Python version compatible"
