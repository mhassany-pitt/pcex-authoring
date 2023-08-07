# Identify and Explain Important Steps

Given the following problem statement, identify and explain the important steps of the given program, provide one or more reasons why each step is important.

You can also use the inline comments in support or addition to problem statement.

Note that the solution is written in Java programming language.

DO NOT explain the following parts of the program.

- common java import statements
- common java class object instantiation
- main class and method definition

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
[
  {
    "lineNum": "[the line number]",
    "content", "[the line content]",
    "plain": "[explanation of the current line in plain english]",
    "reason_1": "[according to problem statement, the 1st reason why the line is important]" ,
    ... more reasons
  },
  ...
]
```

Generated Output:

```json
[
  {
    "lineNum": "7",
    "content": "Scanner input = new Scanner(System.in);",
    "plain": "Create a Scanner object to read input from the standard input stream (keyboard).",
    "reason_1": "This line is important because it allows the program to read user input.",
    "reason_2": "Since the problem statement states that the total income is given as input, we need to read this value to perform calculations.",
    "reason_3": "The Scanner object is used to parse the input data and convert it into the appropriate data type, in this case, an integer."
  },
  {
    "lineNum": "8",
    "content": "int numOfTestCases = input.nextInt();",
    "plain": "Read the number of test cases from the input.",
    "reason_1": "This line is important because it determines how many times the subsequent code block will be executed.",
    "reason_2": "The problem states that there are multiple test cases, so we need to know the number of test cases to loop through each one.",
    "reason_3": "The variable 'numOfTestCases' holds the count of test cases, which is later used in the while loop condition (line 9)."
  },
  {
    "lineNum": "9",
    "content": "while (numOfTestCases > 0) {",
    "plain": "Start a loop that will execute as long as there are test cases remaining.",
    "reason_1": "This line is important because it sets up a loop to process each test case one by one.",
    "reason_2": "The loop ensures that the program reads and processes each test case until there are no more left to process.",
    "reason_3": "Since the problem states that there are multiple test cases, the while loop helps iterate through each case."
  },
  {
    "lineNum": "10",
    "content": "int income = input.nextInt();",
    "plain": "Read the income value for the current test case.",
    "reason_1": "This line is important because it reads the income value, which is required to calculate the final amount of money received.",
    "reason_2": "Since the problem statement specifies that the total income is given for each test case, we need to read this value.",
    "reason_3": "The variable 'income' holds the total income for the current test case, which is used for further calculations."
  },
  {
    "lineNum": "11",
    "content": "if (income > 100)",
    "plain": "Check if the income is strictly greater than 100.",
    "reason_1": "This line is important because it determines whether the tax of rupees 10 will be deducted from the income.",
    "reason_2": "The problem statement states that a tax of rupees 10 is deducted if the total income is strictly greater than 100.",
    "reason_3": "Based on this condition, the program decides whether to subtract the tax amount from the income or not."
  },
  {
    "lineNum": "12",
    "content": "System.out.println(income - 10);",
    "plain": "Print the amount of money received after deducting the tax.",
    "reason_1": "This line is important because it displays the final amount of money received after deducting the tax (if applicable).",
    "reason_2": "The problem statement requires finding out how much money you get after the tax deduction.",
    "reason_3": "By printing the value of 'income - 10', the program outputs the result for each test case."
  },
  {
    "lineNum": "13",
    "content": "else System.out.println(income);",
    "plain": "Print the income without any tax deduction.",
    "reason_1": "This line is important because it handles the case where the income is not greater than 100.",
    "reason_2": "If the income is 100 or less, there is no tax deduction, so the original income amount should be printed.",
    "reason_3": "By printing 'income' directly, the program outputs the result for the cases where no tax is deducted."
  },
  {
    "lineNum": "14",
    "content": "numOfTestCases--;",
    "plain": "Decrement the number of test cases to keep track of processed cases.",
    "reason_1": "This line is important because it ensures that the loop iterates through each test case.",
    "reason_2": "By decrementing the 'numOfTestCases' variable, the program moves to the next test case in the next iteration of the loop.",
    "reason_3": "Without this line, the loop would become an infinite loop, as 'numOfTestCases' would always remain greater than 0."
  }
]
```
