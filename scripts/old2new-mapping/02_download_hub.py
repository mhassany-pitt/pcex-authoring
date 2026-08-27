import os
import ssl
import time
import urllib.request
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

def fetch_hub_item(item_id, output_dir, ctx):
    url = f"https://adapt2.sis.pitt.edu/pcex-authoring/api/hub/{item_id}?_t={int(time.time() * 1000)}"
    out_filepath = os.path.join(output_dir, f"{item_id}.json")
    
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            data = resp.read()
            
        json_obj = json.loads(data.decode("utf-8"))
        
        with open(out_filepath, "w", encoding="utf-8") as f:
            json.dump(json_obj, f, indent=2)
            
        return item_id, True, None
    except Exception as e:
        return item_id, False, str(e)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "hub.json")
    output_dir = os.path.join(script_dir, "hub")
    
    os.makedirs(output_dir, exist_ok=True)
    
    with open(input_file, "r", encoding="utf-8") as f:
        hub_data = json.load(f)
        
    ids = [entry["id"] for entry in hub_data if "id" in entry]
    print(f"Found {len(ids)} IDs in hub.json. Downloading JSON files to {output_dir}...")
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    success_count = 0
    fail_count = 0
    
    # Use concurrent threads for faster downloads
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_hub_item, item_id, output_dir, ctx): item_id for item_id in ids}
        
        for i, future in enumerate(as_completed(futures), 1):
            item_id, success, error = future.result()
            if success:
                success_count += 1
                print(f"[{i}/{len(ids)}] ✓ {item_id}.json")
            else:
                fail_count += 1
                print(f"[{i}/{len(ids)}] ✗ Failed {item_id}: {error}")

    print(f"\nFinished: {success_count} downloaded, {fail_count} failed.")

if __name__ == "__main__":
    main()
