export const prepLn2Solution = (code: string) => {
    return code.split('\n').map((l, i) => `/*Line ${i + 1}*/${l}`).join('\n');
}

export const $schema = `"$schema":"http://json-schema.org/draft-07/schema#"`;
export const expJsonSchema = `{${$schema},"type":"object","properties": {},"patternProperties":{"^[0-9]+$":{"type":"array","items":{"type":"string"}}},"required":[],"additionalProperties":false}`;
export const distJsonSchema = `{${$schema},"type":"object","properties": {},"patternProperties":{"^[0-9]+$":{"type":"array","items":{"type":"object","properties":{"distractor":{"type":"string"},"misconceptions":{"type":"array","items":{"type":"string"}},"explanation":{"type":"string"}},"required":["distractor","misconceptions","explanation"]}}},"required":[],"additionalProperties":false}`;

export const assistantTemplate = `You are  a learning support bot focused on introductory programming.`;

export const expTaskIdentifyAndExplain = `Given the following PCEX, explain the essential lines.`;
export const expTaskExplainLn = `Given the following PCEX, explain Line <<line_number>>.`;
export const explanationTemplate = `
A program construction example (PCEX) includes a problem statement and solution. 

In a PCEX, only essential lines are explained. These explanations:
    a) Clarify the purpose of the line within the program and how it contributes to the intended outcome, 
    b) Break down the syntax and semantics of the code to address any complexities, 
    c) Highlight potential errors and common misconceptions to provide insight into what learners might misunderstand, and 
    d) Suggest best practices for effective usage to encourage sound coding habits. 

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

export const distTaskGenerate = `Given the following problem statement and solution, generate <<n_distractors>>plausible distractors for Line <<line_number>>. The generated distractors must target common misconceptions that students may have and are valid for this program, specifically for Line <<line_number>>.`;
export const distractorTemplate = `
The following problem statement and solution will serve as a program construction challenge question, with Line <<line_number>> masked. In an introductory programming course, e.g.: CS1, students will be asked to choose the correct answer from several options, including one correct answer and multiple incorrect alternatives.		

YOUR TASK:
<<task>>

PROBLEM STATEMENT:
<<problem_statement>>

PROBLEM SOLUTION:
'''<<problem_language>>
<<problem_solution>>
'''

EXAMPLE OUTPUT:
Format your output strictly in the following JSON structure, without including anything else."	
{
    "<<line_number>>": [
        {
            "distractor": "The distractor line",
            "misconceptions": [ "Targeted misconception A", ... ],
            "explanation": "A step-by-step explanation, explaining the targeted misconceptions, detailing why a student might select it due to the misconceptions. Describe how using the distractor instead of the correct line would impact the program, noting any errors or unintended behaviors. Contrast the distractor with the correct line by highlighting what key aspects are missing or misimplemented, and clarify why the distractor is invalid. Ensure the explanation is clear and provides enough context to understand why the distractor is a plausible but incorrect choice."
        }, ...
    ]
}
`.trim();