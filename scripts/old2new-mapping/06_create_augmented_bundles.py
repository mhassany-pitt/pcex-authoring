import os
import glob
import json

COLLABORATOR_EMAILS = [
    "rah225@pitt.edu",
    "peterb@pitt.edu",
    "arl122@pitt.edu",
    "quinnkwolter@pitt.edu",
    "hua1007.yu@connect.polyu.hk"
]

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    matched_bundles_dir = os.path.join(script_dir, "matched_bundles")
    augmented_sources_dir = os.path.join(script_dir, "augmented_sources")
    matched_sources_dir = os.path.join(script_dir, "matched_sources")
    output_dir = os.path.join(script_dir, "augmented_bundles")
    
    os.makedirs(output_dir, exist_ok=True)
    
    bundle_files = sorted(glob.glob(os.path.join(matched_bundles_dir, "*.json")))
    print(f"Found {len(bundle_files)} matched bundle files.")
    print(f"Reading augmented sources from: {augmented_sources_dir}")
    print(f"Saving augmented bundles to: {output_dir}\n")
    
    saved_bundles = 0
    updated_items_count = 0
    
    for b_path in bundle_files:
        filename = os.path.basename(b_path)
        with open(b_path, "r", encoding="utf-8") as f:
            bundle_wrapper = json.load(f)
            
        bundle = bundle_wrapper.get("bundle", bundle_wrapper)
        items = bundle.get("items", [])
        
        # Update collaborators on bundle
        bundle.pop("collaborators", None)
        bundle["collaborator_emails"] = COLLABORATOR_EMAILS
        
        # Update each item's details with augmented source data
        for item in items:
            source_id = item.get("item")
            if not source_id:
                continue
                
            aug_source_path = os.path.join(augmented_sources_dir, f"{source_id}.json")
            if not os.path.exists(aug_source_path):
                aug_source_path = os.path.join(matched_sources_dir, f"{source_id}.json")
                
            if os.path.exists(aug_source_path):
                with open(aug_source_path, "r", encoding="utf-8") as sf:
                    source_data = json.load(sf)
                    
                if "details" not in item:
                    item["details"] = {}
                    
                item["details"]["name"] = source_data.get("name", item["details"].get("name", ""))
                item["details"]["description"] = source_data.get("description", item["details"].get("description", ""))
                item["details"]["language"] = source_data.get("language", item["details"].get("language", "PYTHON"))
                item["details"]["tags"] = source_data.get("tags", item["details"].get("tags", []))
                item["details"]["iso_language_code"] = source_data.get("iso_language_code", item["details"].get("iso_language_code", "en"))
                
                updated_items_count += 1
            else:
                print(f"  Warning: Source file for ID {source_id} not found in {augmented_sources_dir}")
                
        # Save updated bundle wrapper
        out_path = os.path.join(output_dir, filename)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(bundle_wrapper, f, indent=2)
            
        saved_bundles += 1
        print(f"✓ Saved augmented bundle: {filename} ({len(items)} items)")
        
    print(f"\nCompleted! Saved {saved_bundles} augmented bundles to '{output_dir}' (updated {updated_items_count} source item details).")

if __name__ == "__main__":
    main()

