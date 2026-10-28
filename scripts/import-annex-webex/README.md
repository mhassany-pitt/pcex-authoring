# AnnEx and WebEx Migration to PCEX

This directory hosts the complete local extraction, verification, conversion, and ingestion pipeline for migrating all **AnnEx** (604 items) and **WebEx** (231 items) activities from the SLC Catalog into PCEX Authoring.

## Migration Status: COMPLETED ✅

- **Total Activities Imported**: **834 / 834** newly ingested into PCEX Authoring Hub under `moh70@pitt.edu`.
- **Existing CSEdPad Bundles Synced**: **65 / 65** existing bundles retrofitted with `annex;color=green`, `csedpad`, and `annex_key:<id>`.
- **Total Published Bundles in Hub**: Increased from 584 to **1,418**.
- **Compilation & Previews**: 100% of imported and updated bundles were compiled with `compile=true`, successfully generating runtime preview JSONs without triggering `paws-sync`.

---

## Final Ingestion Counts in PCEX Hub

| Category | In SLC Catalog | Imported to PCEX | In Hub After Sync | Badge & Style |
|---|---|---|---|---|
| **AnnEx** | 604 | 604 | **669** *(604 new + 65 synced CSEdPad)* | `annex;color=green` (Emerald) |
| **WebEx** | 231 | 230* | **230** | `webex;color=#0d9488` (Teal) |
| **CSEdPad** | 25 | 25 | **90** *(25 new + 65 synced)* | `csedpad` + `annex;color=green` |
| **Total** | **835** | **834** | **1,418** *(1,260 under `moh70@pitt.edu`)* | |

*\* The single WebEx item excluded from ingestion is `pcex_test`, which is a legacy catalog alias pointing to native PCEX `for_loops.j_print_descendingly`.*

---

## Tag Conventions & Color Architecture

To avoid visual noise and ensure zero collisions with existing AI and validation tags (`purple`, `blue`, `orange`, `yellow`), the following non-colliding design was implemented:

1. **Primary Provenance Badge**:
   - `annex;color=green` (Emerald Mint badge: `#15803d` text on `#dcfce7` background)
   - `webex;color=#0d9488` (Deep Teal badge: `#0f766e` text on `#ccfbf1` background)
2. **Traceability Keys**:
   - `annex_key:<original_id>` (e.g., `annex_key:AccessorMutatorDemo`, `annex_key:TableCreation1`)
   - `webex_key:<original_id>` (e.g., `webex_key:pyt10.23`, `webex_key:abcounting.c`)
3. **Course & Topic Sub-collections** (clean neutral gray pills):
   - `python-intro` (102 WebEx Python items)
   - `pitt-c` (66 WebEx C items by Peter Brusilovsky)
   - `deitel-cpp` (60 WebEx C/C++ textbook items)
   - `acos-sql` (132 AnnEx SQL items)
   - `is17-java` (78 AnnEx Java items)
   - `csedpad` (90 AnnEx Java items)
   - `javatutorial` (29 AnnEx Java items)
   - `acos-cpp` (129 AnnEx C++ items)
4. **Author Attribution**:
   - `author:Peter Brusilovsky` (90), `author:Hardik Vasa` (81), `author:Rafael Araujo` (66), `author:Roya Hosseini` (31), etc.

---

## Directory Structure

```
scripts/import-annex-webex/
├── downloads/
│   ├── annex/                 # 604 normalized JSON files (<id>.json)
│   ├── webex/                 # 231 normalized JSON files (<id>.json)
│   ├── annex_summary.json     # Catalog metadata summary for AnnEx
│   ├── webex_summary.json     # Catalog metadata summary for WebEx
│   ├── pcex_sources.json      # 834 converted PCEX Source objects
│   ├── pcex_activities.json   # 834 converted PCEX Activity bundle objects
│   └── import_progress.json   # Complete ledger of all 834 imported IDs & timestamps
├── scripts/
│   ├── download_all.py        # Automated download & line-ending extraction script
│   ├── verify_integrity.py   # Comprehensive 835-file integrity audit script
│   ├── convert_to_pcex.py     # Maps normalized items to PCEX source/activity schemas
│   └── import_to_pcex.py      # Bulk API ingestion & CSEdPad tag synchronization
└── README.md
```

---

## Pipeline Execution Commands

```bash
# 1. Download and normalize raw data from SLC Catalog & caches
python3 scripts/import-annex-webex/scripts/download_all.py

# 2. Verify integrity and line alignment across all 835 items
python3 scripts/import-annex-webex/scripts/verify_integrity.py

# 3. Transform to PCEX Source and Activity payloads
python3 scripts/import-annex-webex/scripts/convert_to_pcex.py

# 4. Synchronize tags and compile previews on existing 65 CSEdPad bundles
python3 scripts/import-annex-webex/scripts/import_to_pcex.py --update-csedpad

# 5. Ingest and compile all 834 activities into PCEX Hub
python3 scripts/import-annex-webex/scripts/import_to_pcex.py
```
