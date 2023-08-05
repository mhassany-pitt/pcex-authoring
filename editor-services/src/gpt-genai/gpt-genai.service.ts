import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, OpenAIApi } from 'openai';

@Injectable()
export class GptGenaiService {
  private openai: OpenAIApi;

  constructor(private config: ConfigService) {
    const configuration = new Configuration({
      apiKey: this.config.get('OPENAI_API_KEY'),
    });
    this.openai = new OpenAIApi(configuration);

    this.tryExample();
  }
  prompt(messages: any[]) {
    return this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      temperature: 0.4,
      max_tokens: 1024,
      messages,
    });
  }

  tryExample() {
    const prompt = this.genAllPrompt(
      `
Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M.

Symbol       Value
I             1
V             5
X             10
L             50
C             100
D             500
M             1000
For example, 2 is written as II in Roman numeral, just two ones added together. 12 is written as XII, which is simply X + II. The number 27 is written as XXVII, which is XX + V + II.

Roman numerals are usually written largest to smallest from left to right. However, the numeral for four is not IIII. Instead, the number four is written as IV. Because the one is before the five we subtract it making four. The same principle applies to the number nine, which is written as IX. There are six instances where subtraction is used:

I can be placed before V (5) and X (10) to make 4 and 9. 
X can be placed before L (50) and C (100) to make 40 and 90. 
C can be placed before D (500) and M (1000) to make 400 and 900.
Given a roman numeral, convert it to an integer.
`,
      `
public class Roman2Integer {
  public int romanToInt(String roman) {
    int answer = 0, num = 0;
    for (int i = roman.length() - 1; i >= 0; i--) {
      switch (roman.charAt(i)) {
        case 'I':
          num = 1;
          break;
        case 'V':
          num = 5;
          break;
        case 'X':
          num = 10;
          break;
        case 'L':
          num = 50;
          break;
        case 'C':
          num = 100;
          break;
        case 'D':
          num = 500;
          break;
        case 'M':
          num = 1000;
          break;
      }
      if (4 * num < answer)
        answer -= num;
      else
        answer += num;
    }
    return answer;
  }
}      
`,
    );
    // this.genExps();
    // this.genExp();

    console.log(prompt);
  }
  genAllPrompt(statement, solution) {
    const prompt = `
Given the following problem statement, explain the important steps of the given program, including why each step is important in the solution.

Note that the solution is written in Java programming language.

DO NOT explain the following parts of the program.

- common java import statements
- common java class object instantiation
- main class and method definition

You can also use the inline comments in support or addition to problem statement.

Here is the problem statement:
${statement}

Here is the json format of problem solution:

'''json
{
    "line number": "line content",
    ...
}
'''

Here is the problem solution:

'''json
${JSON.stringify(
  solution.split('\n').reduce((acc, line, i) => {
    acc[i + 1] = line;
    return acc;
  }, {}),
  null,
  2,
)}
'''

You must respond ONLY with JSON that looks like this:

'''json
[
    {
          "lineNum": "[the line number]",
          "content", "[the line content]",
          "plain": "[explanation of the current line in plain english]",
          "why_1": "[according to problem statement, the 1st reason why the line is important]" ,
          "why_2": "[according to problem statement, the 2nd reason why the line is important - if applicable]",
          "why_n", "[more reasons - if applicable]"
        "why_n", "..."
    },
    ...
]
'''`;

    return prompt;
  }
  genExps() {
    // ...
  }
  genExp() {
    // ...
  }
}
