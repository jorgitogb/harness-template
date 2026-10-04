echo "── 3. Validating feature_list.json and specs ───────────"

HARNESS_RIGOR="${HARNESS_RIGOR:-standard}" python3 - <<'PY'
import hashlib, json, os, re, sys

RIGOR = os.environ.get("HARNESS_RIGOR", "standard")
SPEC_FILES = ("requirements.md", "design.md", "tasks.md")

# A test file is anything under a tests/test/__tests__/spec folder, or named like a test.
TEST_FILE = re.compile(
    r"(^|/)(tests?|__tests__|spec)/"
    r"|(^|/)test_[^/]*\.py$|_test\.(py|go|exs?)$|_spec\.rb$"
    r"|\.(test|spec)\.[cm]?[jt]sx?$|Tests?\.(java|kt|cs)$"
)
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", "target",
             "vendor", ".next", ".astro", "coverage", "specs", "progress", "docs", "openspec", ".opencode"}
TAG = re.compile(r"(?<![A-Za-z0-9_-])([A-Za-z0-9][A-Za-z0-9_-]*)/R(\d+)\b")
REQ_ID = re.compile(r"\bR(\d+)\b")

# Must match specHash() in harness-init's src/approve.ts.
def spec_hash(spec_dir):
    h = hashlib.sha256()
    for fname in SPEC_FILES:
        with open(os.path.join(spec_dir, fname), encoding="utf-8", newline="") as fh:
            text = fh.read().replace("\r\n", "\n")
        if fname == "tasks.md":
            text = re.sub(r"(?m)^(\s*[-*]\s+)\[[xX]\]", r"\1[ ]", text)
        h.update(f"{fname}\0{text}\0".encode("utf-8"))
    return h.hexdigest()

def approved_hash(spec_dir):
    path = os.path.join(spec_dir, "APPROVED")
    if not os.path.isfile(path):
        return None
    for line in open(path, encoding="utf-8"):
        if line.startswith("sha256:"):
            return line.split(":", 1)[1].strip()
    return ""

def test_tags():
    """{feature: {requirement number}} from `<feature>/R<n>` tags in test files."""
    tags = {}
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            rel = os.path.relpath(os.path.join(root, name), ".").replace(os.sep, "/")
            if not TEST_FILE.search(rel):
                continue
            try:
                with open(rel, encoding="utf-8", errors="ignore") as fh:
                    text = fh.read(2_000_000)
            except OSError:
                continue
            for feature, n in TAG.findall(text):
                tags.setdefault(feature, set()).add(int(n))
    return tags

def ids(numbers):
    return ", ".join(f"R{n}" for n in sorted(numbers))

try:
    data = json.load(open("feature_list.json"))
    valid = {"pending", "spec_ready", "in_progress", "done", "blocked"}
    in_progress = [f for f in data["features"] if f["status"] == "in_progress"]
    if len(in_progress) > 1:
        print(f"[FAIL]  {len(in_progress)} features in in_progress (max 1)")
        sys.exit(1)

    errors, warnings = [], []
    # In light rigor, gate problems are reported but do not block.
    gate = warnings if RIGOR == "light" else errors
    tags = None

    for f in data["features"]:
        if f["status"] not in valid:
            print(f"[FAIL]  Invalid status in feature {f['id']}: {f['status']}")
            sys.exit(1)
        if not f.get("sdd") or f["status"] not in {"spec_ready", "in_progress", "done"}:
            continue

        name = f["name"]
        spec_dir = os.path.join("specs", name)
        missing = [n for n in SPEC_FILES if not os.path.isfile(os.path.join(spec_dir, n))]
        for fname in missing:
            errors.append(f"feature {f['id']} ({name}) in {f['status']} missing {spec_dir}/{fname}")
        if missing or f["status"] == "spec_ready":
            continue

        approved = approved_hash(spec_dir)
        if approved is None:
            gate.append(
                f"feature {f['id']} ({name}) is {f['status']} but its spec is not approved. "
                f"A human must run: npx @jorgegb/harness-init approve {name}"
            )
        elif approved != spec_hash(spec_dir):
            gate.append(
                f"feature {f['id']} ({name}): spec changed after approval. "
                f"Review the change, then a human must re-run: npx @jorgegb/harness-init approve {name}"
            )

        # Traceability: every R<n> needs a test tagged `<feature>/R<n>`, and no tag may point nowhere.
        if tags is None:
            tags = test_tags()
        with open(os.path.join(spec_dir, "requirements.md"), encoding="utf-8") as fh:
            required = {int(n) for n in REQ_ID.findall(fh.read())}
        tagged = tags.get(name, set())
        untested = required - tagged
        unknown = tagged - required
        if untested:
            verb = "has" if len(untested) == 1 else "have"
            msg = f"{name}: {ids(untested)} {verb} no test tagged {name}/R<n>"
            (gate if f["status"] == "done" else warnings).append(msg)
        if unknown:
            gate.append(f"{name}: tests tag {', '.join(f'{name}/R{n}' for n in sorted(unknown))}, not in {spec_dir}/requirements.md")

    for w in warnings:
        print(f"[WARN]  {w}")
    if errors:
        for e in errors:
            print(f"[FAIL]  {e}")
        sys.exit(1)
    print(f"[OK]    feature_list.json valid ({len(data['features'])} features, rigor: {RIGOR})")
    print(f"[OK]    Specs present, approved and traced for in-progress/done features")
except SystemExit:
    raise
except Exception as e:
    print(f"[FAIL]  feature_list.json or specs invalid: {e}")
    sys.exit(1)
PY

if [ $? -ne 0 ]; then EXIT_CODE=1; fi
