echo "── 3. Validating feature_list.json and specs ───────────"

python3 - <<'PY'
import hashlib, json, os, re, sys

# Must match specHash() in harness-init's src/approve.ts.
def spec_hash(spec_dir):
    h = hashlib.sha256()
    for fname in ("requirements.md", "design.md", "tasks.md"):
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

try:
    data = json.load(open("feature_list.json"))
    valid = {"pending", "spec_ready", "in_progress", "done", "blocked"}
    in_progress = [f for f in data["features"] if f["status"] == "in_progress"]
    if len(in_progress) > 1:
        print(f"[FAIL]  {len(in_progress)} features in in_progress (max 1)")
        sys.exit(1)
    requires_spec = {"spec_ready", "in_progress", "done"}
    requires_approval = {"in_progress", "done"}
    spec_errors = []
    for f in data["features"]:
        if f["status"] not in valid:
            print(f"[FAIL]  Invalid status in feature {f['id']}: {f['status']}")
            sys.exit(1)
        if f.get("sdd") and f["status"] in requires_spec:
            spec_dir = os.path.join("specs", f["name"])
            missing = [n for n in ("requirements.md", "design.md", "tasks.md")
                       if not os.path.isfile(os.path.join(spec_dir, n))]
            for fname in missing:
                spec_errors.append(
                    f"feature {f['id']} ({f['name']}) in {f['status']} "
                    f"missing {spec_dir}/{fname}"
                )
            if not missing and f["status"] in requires_approval:
                approved = approved_hash(spec_dir)
                if approved is None:
                    spec_errors.append(
                        f"feature {f['id']} ({f['name']}) is {f['status']} but its spec is not approved. "
                        f"A human must run: npx @jorgegb/harness-init approve {f['name']}"
                    )
                elif approved != spec_hash(spec_dir):
                    spec_errors.append(
                        f"feature {f['id']} ({f['name']}): spec changed after approval. "
                        f"Review the change, then a human must re-run: npx @jorgegb/harness-init approve {f['name']}"
                    )
    if spec_errors:
        for e in spec_errors:
            print(f"[FAIL]  {e}")
        sys.exit(1)
    print(f"[OK]    feature_list.json valid ({len(data['features'])} features)")
    print(f"[OK]    Specs present for sdd features with non-pending status")
    print(f"[OK]    In-progress/done specs approved and unchanged since approval")
except SystemExit:
    raise
except Exception as e:
    print(f"[FAIL]  feature_list.json or specs invalid: {e}")
    sys.exit(1)
PY

if [ $? -ne 0 ]; then EXIT_CODE=1; fi