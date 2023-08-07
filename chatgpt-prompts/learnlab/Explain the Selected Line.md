# Explain the Selected Line

Given the following problem statement, explain why the line 9 of the given program is important.

Note that the solution is written in Java programming language.

You can also use the inline comments in support or addition to problem statement.

Here is the problem statement:
In Chefland, a tax of rupees 10 is deducted if the total income is strictly greater than rupees 100.

Given that total income is X rupees, find out how much money you get.

Here is the json format of problem solution:

```json
{
    "line number": "line content",
    ...
}
```

Here is the problem solution:

```json
{
  "1": "import java.util.*;",
  "2": "import java.lang.*;",
  "3": "import java.io.*;",
  "4": " ",
  "5": "public class Codechef {",
  "6": "  public static void main(String[] args) throws java.lang.Exception {",
  "7": "    Scanner input = new Scanner(System.in);",
  "8": "    int numOfTestCases = input.nextInt();",
  "9": "    while (numOfTestCases > 0) {",
  "10": "      int income = input.nextInt();",
  "11": "      if (income > 100)",
  "12": "        System.out.println(income - 10);",
  "13": "      else System.out.println(income);",
  "14": "      numOfTestCases--;",
  "15": "    }",
  "16": "  }",
  "17": "}"
}
```

You must respond ONLY with JSON that looks like this:

```json
{
          "lineNum": "[the line number]",
          "content", "[the line content]",
          "plain": "[explanation of the current line in plain english]",
          "why_1": "[according to problem statement, the 1st reason why the line is important]" ,
          "why_2": "[according to problem statement, the 2nd reason why the line is important]",
         "why_n", "..."
    },
```

Generated Output:

```json
{
  "lineNum": "9",
  "content": "while (numOfTestCases > 0) {",
  "plain": "This line initiates a while loop that will iterate as long as the variable 'numOfTestCases' is greater than 0.",
  "why_1": "The line is important because it allows the program to handle multiple test cases efficiently. The variable 'numOfTestCases' represents the number of test cases the program needs to process.",
  "why_2": "Within each iteration of the loop, the program reads the 'income' value for a particular test case (line 10) and then checks whether it is greater than 100 (line 11). Depending on the condition, it deducts the tax and prints the final money you get (lines 12 and 13). Then, it decrements 'numOfTestCases' to move on to the next test case (line 14). This process continues until all test cases are processed.",
  "why_n": "By using this loop, the solution can efficiently handle multiple test cases, making it scalable and suitable for real-world scenarios where a large number of inputs need to be processed in one go."
}
```
