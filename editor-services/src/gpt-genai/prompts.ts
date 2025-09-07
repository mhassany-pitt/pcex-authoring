export const prepLn2Solution = (code: string) => {
    return code.split('\n').map((l, i) => `/*Line ${i + 1}*/${l}`).join('\n');
}

export const $schema = `"$schema":"http://json-schema.org/draft-07/schema#"`;
export const expJsonSchema = `{${$schema},"type":"object","properties": {},"patternProperties":{"^[0-9]+$":{"type":"array","items":{"type":"string"}}},"required":[],"additionalProperties":false}`;
export const distJsonSchema = `{${$schema},"type":"object","properties": {},"patternProperties":{"^[0-9]+$":{"type":"array","items":{"type":"object","properties":{"distractor":{"type":"string"},"misconceptions":{"type":"array","items":{"type":"string"}},"explanation":{"type":"string"}},"required":["distractor","misconceptions","explanation"]}}},"required":[],"additionalProperties":false}`;
export const distExpJsonSchema = `{${$schema},"type": "object","properties": {"explanation": {"type": "string"}},"required": ["explanation"],"additionalProperties": false}`;

// --------------

export const assistantTemplate = `You are a learning support bot focused on introductory programming.`;

export const expTaskIdentifyAndExplain = `Given the following PCEX, explain the essential lines<<target_language>>.`;
export const expTaskExplainLn = `Given the following PCEX, explain Line <<line_number>><<target_language>>.`;
export const expTemplate = `
A program construction example (PCEX) includes a problem statement and solution. 

In a PCEX, only essential lines are explained. These explanations:

    a) Clarify the purpose of the line within the program and how it contributes to the intended outcome, 
    b) Break down the syntax and semantics of the code to address any complexities, 
    c) Highlight potential errors and common misconceptions to provide insight into what learners might misunderstand, and 
    d) Suggest best practices for effective usage to encourage sound coding habits. 

These explanations should directly address the reader using 'you' to make the guidance personal and engaging.

An essential line implement the core logic of the solution, excluding common <<problem_language>> elements like main class and method definitions.

YOUR TASK:
<<task>>

PROBLEM STATEMENT:
<<problem_statement>>

PROBLEM SOLUTION:
'''<<problem_language>>
<<problem_solution>>
'''

EXAMPLE OUTPUT:
Format your output strictly in the following JSON structure, without including anything else.
{
    "line number": ["explanation 1", ..., "explanation n"], 
    ... 
}`.trim();

// --------------

export const distTaskGenerate = `Given the following problem statement and solution, generate <<n_distractors>>plausible distractors solely for Line <<line_number>>. The generated distractors must target common misconceptions that students may have and are valid for this program and specifically for Line <<line_number>>.<<target_language_instruction>>`;
export const distTemplate = `
The following problem statement and solution will serve as a program construction challenge question, with Line <<line_number>> masked. In an introductory programming course, e.g.: CS1, students will be asked to choose the correct answer from several options, including one correct answer and multiple incorrect alternatives.

YOUR TASK:
<<task>>

PROBLEM STATEMENT:
<<problem_statement>>

PROBLEM SOLUTION:
'''<<problem_language>>
<<problem_solution>>
'''

LINE <<line_number>>:
'''<<problem_language>>
<<line_content>>
'''

EXAMPLE OUTPUT:
Format your output strictly in the following JSON structure, without including anything else.
{
    "<<line_number>>": [
        {
            "distractor": "The distractor line",
            "misconceptions": [ "Targeted misconception A", ... ],
            "explanation": "A step-by-step explanation, explaining the targeted misconceptions, detailing why a student might select it due to the misconceptions. Describe how using the distractor instead of the correct line would impact the program, noting any errors or unintended behaviors. Contrast the distractor with the correct line by highlighting what key aspects are missing or misimplemented, and clarify why the distractor is invalid. Do not reveal or mention the correct answer in the explanation. These explanations should directly address the reader using 'you' to make the guidance personal and engaging. Ensure the explanation is clear and provides enough context to understand why the distractor is a plausible but incorrect choice."
        }, ...
    ]
}
`.trim();

// --------------

export const distExpTemplate = `
The following problem statement and solution will serve as a program construction challenge question, with Line <<line_number>> masked. In an introductory programming course, e.g.: CS1, students will be asked to choose the correct answer from several options, including one correct answer and multiple incorrect alternatives.

YOUR TASK:
Given the following problem statement and solution, explain the DISTRACTOR for Line <<line_number>>. <<target_language_instruction>> Keep the explanation concise and very short.

DISTRACTOR:
<<candidate_distractor>>

PROBLEM STATEMENT:
<<problem_statement>>

PROBLEM SOLUTION:
'''<<problem_language>>
<<problem_solution>>
'''

EXAMPLE OUTPUT:
Format your output strictly in the following JSON structure, without including anything else.
{
    "explanation": "A step-by-step explanation, explaining the targeted misconceptions, detailing why a student might select it due to the misconceptions. Describe how using the distractor instead of the correct line would impact the program, noting any errors or unintended behaviors. Contrast the distractor with the correct line by highlighting what key aspects are missing or misimplemented, and clarify why the distractor is invalid. Do not reveal or mention the correct answer in the explanation. These explanations should directly address the reader using 'you' to make the guidance personal and engaging. Ensure the explanation is clear and provides enough context to understand why the distractor is a plausible but incorrect choice."
}
`.trim();

// --------------

export const transAssistantTemplate = `You are a helpful assistant that translates programming worked examples into other natural languages, maintaining both technical accuracy and the original code formatting.`;
export const transModelTemplate = `
[[TASK-DEFINITION]]
You will be given a worked example. Your job is to translate the [[WORKED-EXAMPLE]] according to the [[TASK-INSTRUCTIONS]].

[[WORKED-EXAMPLE]]
[[PROGRAM-NAME]]
<<program-name>>

[[PROGRAM-DESCRIPTION]]
<<program-description>>

[[SOURCE-CODE]]
<<source-code>>
<<line-explanations>><<line-distractors>>
[[TASK-INSTRUCTIONS]]
Translate the given worked example into <<target-language>>. Be sure to specifically translate the sections labeled <<translate-sections>>. <<src-translation-instruction>>Preserve the original format and Do NOT add, remove, or change any content beyond translation.
`.trim();

export const transModelSrcLine = "[[LINE<<line-number>>]] <<line-content>>";
export const transModelLnExp = "[[LINE<<line-number>>.EXPL<<explanation-number>>]] <<explanation-content>>";
export const transModelDistLn = "[[DIST<<distractor-number>>.LC]] <<line-content>>";
export const transModelDistLnExp = "[[DIST<<distractor-number>>.EXPL]] <<line-explanation>>";
export const transSrcCodeElmsInst = `In the [[SOURCE-CODE]] section, translate ONLY user-defined <<elements>>; make sure they are ASCII-folded (i.e., remove any accents or non-ASCII characters). `;

// --------------

export const transInst = ` Ensure the explanations are in <<target_language>> language.`;
