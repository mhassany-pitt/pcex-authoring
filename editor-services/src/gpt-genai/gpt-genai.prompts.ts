export const preparePrompt1 = ({ description, source, prompt, language }) => {
  return (
`Given the following program description and accompanying source code, ` +
`identify and explain lines of the code that contributes directly to the program objectives and goals. ` +
`${prompt.inclusion} ${prompt.exclusion}

${prompt.explanation}

Program Description:
${description}

Program Source Code:
The line number is defined as /*line_num*/ at the start of each line.

'''${language?.toLowerCase()}
${source.split('\n').map((line, i) => `/*${i + 1}*/${line}`).join('\n')}
'''

Output format:
Reply ONLY with a JSON array where each element, representing a "line of code," includes "line_num" and an "explanations" array. For example:
'''json
[ { "line_num": "2", "explanations": [ "explanation ...", "explanation ...", ... ] }, ... ]
'''`
  );
};
export const preparePrompt2 = () =>
  `Update your explanations with additional insightful and complementary YET COMPLETELY new explanations. If you missed a line, this is the time to include them.`;
export const preparePrompt3 = () => `Please repeat that once more.`;
