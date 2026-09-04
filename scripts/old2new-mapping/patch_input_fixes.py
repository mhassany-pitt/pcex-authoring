#!/usr/bin/env python3
import os
import sys
import json
import ssl
import urllib.request

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    token_path = os.path.join(script_dir, "api_token.txt")
    if not os.path.exists(token_path):
        print("Error: api_token.txt not found")
        sys.exit(1)
        
    with open(token_path, "r", encoding="utf-8") as f:
        token = f.read().strip()

    api_url = "https://adapt2.sis.pitt.edu/pcex-authoring/api"
    headers = {
        "api-token": token,
        "Content-Type": "application/json",
        "User-Agent": "PCEX-InputFixer/1.0"
    }
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE

    parity_dir = os.path.join(script_dir, "parity_sources")
    targets = [
        ("664e2a9091363872f0ba341a.json", "py_check_product_code Case 1"),
        ("664e2aad91363872f0ba341c.json", "py_check_product_code Case 2"),
        ("664e3ca791363872f0ba3590.json", "py_find_average Case 1"),
        ("664e3ca991363872f0ba3592.json", "py_find_average Case 2"),
        ("664e3cac91363872f0ba3594.json", "py_find_average Case 3"),
    ]

    print("=" * 70)
    print("PATCHING 5 SOURCES ON PCEX SERVER WITH NEWLINE DELIMITED INPUTS")
    print("=" * 70)

    for fname, label in targets:
        fpath = os.path.join(parity_dir, fname)
        with open(fpath, "r", encoding="utf-8") as fp:
            data = json.load(fp)

        server_id = data["id"]
        payload = dict(data)
        payload.pop("id", None)
        payload.pop("_id", None)
        payload.pop("author", None)
        payload["user"] = payload.get("user") or "moh70@pitt.edu"
        payload["compile"] = False

        url = f"{api_url}/bulk/sources/{server_id}?compile=false"
        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="PATCH")
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                print(f"✓ [{resp.status}] Patched {server_id} | {label} | input: {repr(payload.get('programInput'))}")
        except urllib.error.HTTPError as e:
            print(f"✗ [{e.code}] FAILED {server_id} | {label}: {e.read().decode('utf-8')}")
        except Exception as e:
            print(f"✗ [ERR] FAILED {server_id} | {label}: {e}")

    print("=" * 70)
    print("All targeted sources have been updated on the server.")

if __name__ == "__main__":
    main()
