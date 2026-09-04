# 📊 PCEX Distractor Sourcing & Provenance Report

This report provides the full architectural and research breakdown of all **520 distractors** synchronized across the **123 PCEX activities** to achieve exact parity with the legacy PCEX / LAK25 dataset.

The corresponding activity-by-activity and distractor-by-distractor machine-readable dataset is stored in:
📄 [`distractor_sourcing_breakdown.json`](distractor_sourcing_breakdown.json)

---

### Sourcing & Provenance Summary (All 520 Distractors)

#### 1. Research Category Breakdown
| Provenance Category | Distractor Count | Percentage | Description |
| :--- | :---: | :---: | :--- |
| `llm_only` | **345** | **66.35%** | Purely LLM-generated options (novel distractors created during AI augmentation) |
| `llm_matched_legacy` | **131** | **25.19%** | LLM-generated options that identically match human-authored legacy distractors |
| `top_legacy_with_llm_exp` | **44** | **8.46%** | Top legacy student distractors paired with LLM-generated pedagogical explanations |
| **Total** | **520** | **100.0%** | **Exact legacy count match across all 123 activities** |

#### 2. 4-Tier Hierarchy Sourcing Breakdown
```
Total Distractors Sourced: 520
├── Tier 2.1 (Current server baseline):                368 distractors (70.77%)
├── Tier 2.2 (Kept from backfilled pool):               37 distractors  (7.12%)
├── Tier 2.3 (From augmented pool):                     71 distractors (13.65%)
└── Tier 2.4 (Top legacy distractors + English LLM):    44 distractors  (8.46%)
```

| Tier | Pool / Origin | Count | Percentage | Role in Parity |
| :--- | :--- | :---: | :---: | :--- |
| **Tier 2.1** | Validated Server Baseline (`backups/2026-09-03/sources/`) | **368** | 70.77% | Foundation: 3 expert-validated LLM distractors per activity (2 for the single 2-distractor activity). |
| **Tier 2.2** | Backfilled Pool (`backfilled_sources/`) | **37** | 7.12% | LLM distractors kept after pruning excessive options during augmentation. |
| **Tier 2.3** | Augmented Pool (`augmented_sources/`) | **71** | 13.65% | Additional LLM-generated options from multi-blank activities. |
| **Tier 2.4** | Top Legacy Pool (`matched_sources/` + English LLM Exp) | **44** | 8.46% | Top legacy distractors ranked by empirical student choice frequency, paired with English LLM explanations. |

---

### Distractor Count Distribution (Matches Legacy 1:1)

Every activity was backfilled only up to its exact target count from legacy PCEX:

| Target Distractor Count | Number of Activities | Total Distractors in Group |
| :---: | :---: | :---: |
| **2 distractors** | 1 activity (`664e273d91363872f0ba33c1`) | 2 |
| **3 distractors** | 14 activities | 42 |
| **4 distractors** | 73 activities | 292 |
| **5 distractors** | 26 activities | 130 |
| **6 distractors** | 9 activities | 54 |
| **Total** | **123 activities** | **520 distractors** |

---

### Methodology & Sourcing Rules

1. **Strict Multi-Tier Order:** For each activity, distractor selection advanced to the next tier only if the activity needed additional options to reach its legacy distractor count.
2. **Distinctness Guaranteed:** Across all 123 activities, every distractor set is strictly unique (0 duplicate code options within any activity).
3. **100% LLM Pedagogical Explanations:** Every distractor is paired with a comprehensive, step-by-step English explanation diagnosing why a student might select the option, the underlying programming misconception, and the runtime/logical impact on the program.
4. **Zero Spanish Content:** All 520 distractors and their explanations are verified 100% in English (0 Spanish words or markers).
5. **Empirical Grounding (LAK25):** Tier 2.4 distractors were cross-referenced against **28,472 student interaction events** from the PAWS / LAK25 dataset (`paws_cc_2026_merged.csv`) to prioritize the misconceptions that real students encountered most frequently.

---

### Schema Reference for `distractor_sourcing_breakdown.json`

The JSON file contains the complete dataset with the following attributes per distractor:
* **`index`:** 1-based index within the activity.
* **`code`:** Raw distractor code snippet.
* **`norm_code`:** Whitespace-normalized code used for deduplication.
* **`line_number`:** Target line number in the source code.
* **`tier`:** Hierarchy tier (`Tier 2.1`, `Tier 2.2`, `Tier 2.3`, or `Tier 2.4`).
* **`tier_label`:** Human-readable tier label.
* **`tier_description`:** Description of the tier source.
* **`provenance_category`:** One of `"llm_only"`, `"llm_matched_legacy"`, or `"top_legacy_with_llm_exp"`.
* **`provenance_description`:** Detailed description of the research category.
* **`in_legacy_matched`:** Boolean flag (`true` / `false`) indicating presence in legacy PCEX.
* **`student_picks_logged`:** Number of times this distractor was picked in the PAWS student interaction logs.
* **`explanation`:** Complete English LLM-generated pedagogical explanation.

---

### Audit & Parity Verification Results

An automated audit across all 123 staged sources in [`parity_sources/`](parity_sources/) confirmed:

| Verification Check | Target | Result | Status |
| :--- | :---: | :---: | :---: |
| **Total Activities Synchronized** | 123 | 123 | ✅ Passed (100.0%) |
| **Total Distractors Across Dataset** | 520 | 520 | ✅ Exact Match |
| **Activities with Exact Distractor Count** | 123 | 123 | ✅ Exact Match (100.0%) |
| **Total Blank Lines** | 234 | 234 | ✅ Exact Match (100.0%) |
| **Total Lines Explained** | 1,349 | 1,349 | ✅ Exact Match (100.0%) |
| **Non-Empty Explanations** | 520 | 520 | ✅ 100.0% Complete |
| **Duplicate Distractors** | 0 | 0 | ✅ 100.0% Distinct |
| **Spanish Text Detected** | 0 | 0 | ✅ 100% English |
