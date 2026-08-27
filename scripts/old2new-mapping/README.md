# PCEX Old-to-New Mapping & LLM Augmentation Pipeline

This directory contains scripts to map old PCEX activities to Hub bundles, extract their sources, and augment them with LLM-generated explanations and distractors.

---

### Execution Workflow

| Step | Script | Description |
| :--- | :--- | :--- |
| **01** | `01_download_old_pcex.py` | Downloads the 52 legacy PCEX JSON files into `oldpcex/`. |
| **02** | `02_download_hub.py` | Downloads all Hub preview activities from `/api/hub/<id>` into `hub/`. |
| **03** | `03_match_old_to_hub.py` | Runs hierarchical multi-feature matching and ranks the closest Hub bundles into `old_to_hub_matches.txt` and `old_to_hub_matches.json`. |
| **04** | `04_extract_matched_bundles_sources.py` | Extracts and formats exact matching bundles (`matched_bundles/`) and their individual source models (`matched_sources/`) with required tags (`gpt5mini`, `llm_expl+dist&expl`). |
| **05** | `05_generate_explanations_distractors.py` | Generates LLM explanations for lines with comments, distractors for blank lines, and distractor explanations. Output is saved to `augmented_sources/` with restartable caching (`genai_cache.json`). |
| **06** | `06_create_augmented_bundles.py` | Generates `augmented_bundles/` by updating bundle source items (tags, names, descriptions, languages) and setting collaborator emails. |
| **07** | `07_bulk_insert_augmented_items.py` | Bulk inserts augmented sources and bundles as new clones via the bulk API (`/bulk/sources` and `/bulk/activities`), maintaining an `id` remapping cache in `bulk_import_mapping.json`. |
| **08** | `08_bulk_delete_augmented_items.py` | Rollback/reset script that bulk deletes all previously imported augmented bundles and sources via the bulk API (`DELETE /bulk/activities` and `DELETE /bulk/sources`). |

---

### How to Run:

```bash
# Step 05: Generate LLM explanations & distractors
python3 05_generate_explanations_distractors.py

# Step 06: Assemble augmented bundles
python3 06_create_augmented_bundles.py

# Step 07: Bulk insert as new clones into PCEX Authoring database
# (Defaults to local: http://localhost:3000/api)
python3 07_bulk_insert_augmented_items.py

# Or target production:
python3 07_bulk_insert_augmented_items.py --api https://adapt2.sis.pitt.edu/pcex-authoring/api

# Step 08: Rollback / Delete all imported items at any time
python3 08_bulk_delete_augmented_items.py
```
*(Requires credentials saved in `auth_credentials.json` for Step 05, and `api_token.txt` for Step 07/08)*
