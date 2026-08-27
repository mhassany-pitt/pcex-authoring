import os
import ssl
import urllib.parse
import urllib.request
import json

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "cid466-old_pcexlinks.txt")
    output_dir = os.path.join(script_dir, "oldpcex")
    
    os.makedirs(output_dir, exist_ok=True)
    
    with open(input_file, "r", encoding="utf-8") as f:
        links = [line.strip() for line in f if line.strip()]
        
    print(f"Found {len(links)} links. Downloading JSON files to {output_dir}...")
    
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    success_count = 0
    fail_count = 0
    
    for i, link in enumerate(links, 1):
        parsed = urllib.parse.urlparse(link)
        params = urllib.parse.parse_qs(parsed.query)
        
        lang = params.get("lang", [""])[0]
        set_name = params.get("set", [""])[0]
        
        if not lang or not set_name:
            print(f"[{i}/{len(links)}] Skipping invalid link: {link}")
            continue
            
        filename = f"{lang}_{set_name}.json"
        
        # Primary URL is under /pcex/pcex_v1/data/
        # Fallback to direct path if needed
        candidate_urls = [
            f"{parsed.scheme}://{parsed.netloc}/pcex/pcex_v1/data/{filename}",
            f"{parsed.scheme}://{parsed.netloc}/pcex/data/{filename}",
        ]
        
        out_filepath = os.path.join(output_dir, filename)
        downloaded = False
        
        for json_url in candidate_urls:
            try:
                req = urllib.request.Request(
                    json_url,
                    headers={"User-Agent": "Mozilla/5.0"}
                )
                with urllib.request.urlopen(req, context=ctx) as resp:
                    data = resp.read()
                    
                json_obj = json.loads(data.decode("utf-8"))
                
                with open(out_filepath, "w", encoding="utf-8") as out_f:
                    json.dump(json_obj, out_f, indent=2)
                    
                print(f"[{i}/{len(links)}] ✓ {filename} (from {json_url})")
                downloaded = True
                success_count += 1
                break
            except Exception as e:
                continue
                
        if not downloaded:
            print(f"[{i}/{len(links)}] ✗ Failed to download {filename}")
            fail_count += 1

    print(f"\nFinished: {success_count} downloaded, {fail_count} failed.")

if __name__ == "__main__":
    main()
