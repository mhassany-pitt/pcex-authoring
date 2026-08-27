# PCEX Old-to-New Mapping & LLM Augmentation Pipeline

This directory contains scripts to map old PCEX activities to Hub bundles, extract their sources, and augment them with LLM-generated explanations and distractors.

---

### Execution Workflow

| Step | Script | Description |
| :--- | :--- | :--- |
| **01** | `01_download_old_pcex.py` | Downloads the 52 legacy PCEX JSON files into `oldpcex/`. |
| **02** | `02_download_hub.py` | Downloads all Hub preview activities from `/api/hub/<id>` into `hub/`. |
| **03** | `03_match_old_to_hub.py` | Runs hierarchical multi-feature matching and ranks the closest Hub bundles into `old_to_hub_matches.txt` and `old_to_hub_matches.json`. |
| **04** | `04_extract_matched_bundles_sources.py` | Extracts and formats exact matching bundles (`matched_bundles/`) and their individual source models (`matched_sources/`) with required tags (`gpt-5-mini`, `llm_expl+dist&expl`). |
| **05** | `05_generate_explanations_distractors.py` | Generates LLM explanations for lines with comments, distractors for blank lines, and distractor explanations. Output is saved to `augmented_sources/` with restartable caching (`genai_cache.json`). |

---

### How to Run Step 05:
```bash
python3 05_generate_explanations_distractors.py
```
*(Requires credentials saved in `auth_credentials.json` and a running server at `https://adapt2.sis.pitt.edu/pcex-authoring/api`)*
