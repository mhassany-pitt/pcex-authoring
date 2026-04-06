# PCEX Multi-Language Support: Linking Translation Variations

To enable multi-language support in PCEX, you must link the different natural language variations of your **Sources** and **Bundles**. This allows learners to seamlessly switch between languages while interacting with the same lesson content.

This tutorial covers the two essential steps: linking your sources and linking your bundles.

---

## 1. Linking Source Variations

In the **Sources** page, you must link each source item with its translated counterparts. 

### Steps:
1.  **Open the Source Editor:** Click on the title of a source you want to link.
2.  **Locate Translations:** In the **Metadata & Info** section at the top, find the **Translations** field.
3.  **Add a Link:** Click the **Link Translation Variation** button.
4.  **Select Variation:** 
    -   Choose the target **Language** from the first dropdown.
    -   Select the corresponding **Source** variation from the second dropdown.
5.  **Replication:** Note that once you link a variation in one source, the link is automatically replicated in the translated version. You only need to perform this action once for each pair of sources.

![Source Translation Section](./images/source_editor_name_desc.png)
*(The Translations section is located right below the Natural Language dropdown in the Source Editor)*

---

## 2. Linking Bundle Variations

After linking your sources, you must also ensure that the **Bundles** containing them are linked. This step is crucial for the PCEX interface to know which bundle to load when a user switches languages.

### Scenario A: Sources are already bundled
If you already have bundles for each language:
1.  **Open the Bundle Editor:** Go to the **Bundles** page and click the title of one of your bundles.
2.  **Locate Managing Translations:** Find the **Translations** section in the expanded editor row.
3.  **Add a Link:** Click the **Link Translation Variation** button.
4.  **Select Bundle:** Choose the **Language** and the corresponding **Bundle** for that language.

### Scenario B: Sources are NOT yet bundled
If you haven't created bundles for your translated sources:
1.  **Create New Bundles:** Create at least one bundle for each language (e.g., one for English sources, one for Spanish sources).
2.  **Add Sources:** Add the appropriate language-specific sources to each bundle.
3.  **Link Bundles:** Follow the steps in Scenario A to link these bundles together.

![Bundle Translation Section](./images/bundle_editor_translations.png)

---

## Why is this necessary?

Linking these variations is the final step to enable **multi-language support for PCEX**. Without these links, the system cannot identify which "Spanish" source corresponds to which "English" source, preventing the language toggle from appearing or functioning correctly for the learners.

By ensuring there is one bundle (containing the correct sources) for each language and that they are linked, you provide a truly global learning experience!
