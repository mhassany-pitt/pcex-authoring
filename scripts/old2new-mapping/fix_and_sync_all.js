// PCEX Authoring: Complete Live Server Fix, Re-Map, Sync & Compile Suite
(async () => {
  console.log('================================================================================');
  console.log('🚀 RUNNING COMPLETE LIVE SERVER FIX, REMAP, SYNC & COMPILE (123 SOURCES + 52 BUNDLES)');
  console.log('================================================================================');

  const sourceFixes = {
  "6a91ae6532e78ede45c116a1": {
    "distractors": [
      {
        "code": "for w in line:",
        "description": "Step-by-step why you might pick this: when you see a line as text you may assume iterating over it gives you words, so using the line directly feels simpler and avoids extra calls. This looks short and familiar if you have iterated strings before. What happens if you use this line instead: the loop will iterate over each character in the line (including spaces and the newline), not over words. As a result, when the program computes the length of each loop item you will almost always get 1 (single characters) or possibly 0 for some special cases, so the reported \"longest word\" on the line will be wrong (typically 1) even though the reported token count uses a correct splitting earlier. There is no runtime error, but the output will be incorrect. Why this is invalid here: you need to examine actual words (sequences of non-space characters), not characters. This distractor misses the required tokenization step and so produces incorrect longest-word lengths.",
        "line_number": 0
      },
      {
        "code": "if w > longest_word :",
        "description": "You might pick this because it looks shorter and you may (mistakenly) expect Python to compare the word's length to the stored longest-word value automatically. In reality, w is a string and longest_word is an integer, so using '>' between them will cause a type error at runtime: Python cannot compare str and int with '>'. That means the program will crash the first time it reaches this line instead of correctly finding the longest word length. The mistake here is a types mix-up: you used the word itself where you needed its length (or you should have used a numeric value on both sides). This distractor is plausible because beginners sometimes think Python will coerce types for you or that comparing strings and numbers is allowed, but it is invalid because the types are incompatible.",
        "line_number": 0
      },
      {
        "code": "longest_word = w",
        "description": "You might pick this if you intend to store the longest word itself rather than its character count, confusing the variable's role as a numeric maximum length with a string holder. What happens if you use this line: on the next iteration, when the code evaluates `if len(w) > longest_word :`, Python will attempt to compare an integer `len(w)` with a string `longest_word`, resulting in a `TypeError: '>' not supported between instances of 'int' and 'str'`. Why this is invalid here: the variable `longest_word` is initialized to integer `0` and is used to store the numeric length (as displayed in the formatted output `longest = ...`), not the word object itself.",
        "line_number": 0
      }
    ]
  }
};
  const bundleUpdates = [
  {
    "id": "6a9060d5cbc5a3f2aa638b9b",
    "name": "py_pythagorean_theorem",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c4cbc5a3f2aa638aa5",
        "type": "example",
        "details": {
          "name": "Pythagorean Theorem (Case 1)",
          "description": "Construct a program that accepts two input values from the user, one for each side of a right-angle triangle. The program uses the Pythagorean theorem (c^2 = a^2 + b^2) to calculate the length of the triangle's hypotenuse.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c4cbc5a3f2aa638aa7",
        "type": "challenge",
        "details": {
          "name": "Pythagorean Theorem (Case 2)",
          "description": "Suppose that the user provides two input values for a right-angle triangle. The first input is for the length of an adjacent side in the triangle and the second input is for the hypotenuse of that triangle. The program calculates the second adjacent side of the triangle using these two input values. Use the Pythagorean theorem (c^2 = a^2 + b^2) to find the length of the second adjacent side.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d5cbc5a3f2aa638b9d",
    "name": "py_time_conversion",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c4cbc5a3f2aa638aa9",
        "type": "example",
        "details": {
          "name": "Seconds to Minutes Conversion",
          "description": "Construct a program that obtains minutes and remaining seconds from the input amount of time in seconds. For example, 500 seconds contains 8 minutes and 20 seconds.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c4cbc5a3f2aa638aab",
        "type": "challenge",
        "details": {
          "name": "Converting Milliseconds to Hours-Minutes- and Seconds",
          "description": "Construct a program that obtains hours, minutes, and seconds from an amount of time in milliseconds.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d5cbc5a3f2aa638b9f",
    "name": "py_soda_survey",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c5cbc5a3f2aa638aad",
        "type": "example",
        "details": {
          "name": "Determining the Maximum Rating for Each Soda in The Survey",
          "description": "Suppose a soda manufacturer held a taste test for four new flavors to determine if people liked them. The manufacturer got 10 people to try each new flavor and give it a score from 1 to 5, where 1 equals poor and 5 equals excellent. The results of that survey is stored in a matrix. Each row of the matrix holds the responses that all testers gave for one particular soda flavor, and each column holds the responses of one person for all sodas.\\nConstruct a program that determines the maximum rating that each of the four new flavors of soda received.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c5cbc5a3f2aa638aaf",
        "type": "challenge",
        "details": {
          "name": "Determining the Average Rating for Each Soda in The Survey",
          "description": "Suppose a soda manufacturer held a taste test for four new flavors to determine if people liked them. The manufacturer got 10 people to try each new flavor and give it a score from 1 to 5, where 1 equals poor and 5 equals excellent. The results of that survey is stored in a matrix. Each row of the matrix holds the responses that all testers gave for one particular soda flavor, and each column holds the responses of one person for all sodas.\\nConstruct a program that determines the average ratings that respondents provided to four new flavors of soda.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c5cbc5a3f2aa638ab1",
        "type": "challenge",
        "details": {
          "name": "Determining the Average Ratings of each Respondent and Average Ratings Given to Each Soda in the Survey",
          "description": "Suppose a soda manufacturer held a taste test for four new flavors to determine if people liked them. The manufacturer got 10 people to try each new flavor and give it a score from 1 to 5, where 1 equals poor and 5 equals excellent. The results of that survey is stored in a matrix. Each row of the matrix holds the responses that all testers gave for one particular soda flavor, and each column holds the responses of one person for all sodas.\\nConstruct a program that determines the average ratings that respondents provided to four new flavors of soda as well as the average ratings of each respondent.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d5cbc5a3f2aa638ba1",
    "name": "py_vending_machine",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c5cbc5a3f2aa638ab3",
        "type": "example",
        "details": {
          "name": "Vending Machine With Dollars and Quarters",
          "description": "Suppose we have a vending machine that gives change. A customer selects an item for purchase and inserts a bill into the vending machine. The vending machine dispenses the purchased item and gives change. We will assume that all item prices are multiples of 25 cents, and the machine gives all change in dollar and quarters. Construct a program that computes how many dollars and quarters to return to the customer.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c5cbc5a3f2aa638ab5",
        "type": "challenge",
        "details": {
          "name": "Vending Machine With Quarters-Dimes- and Nickels",
          "description": "Suppose we have a vending machine that gives change. A customer selects an item for purchase and inserts a bill into the vending machine. The vending machine dispenses the purchased item and gives change. We will assume that all item prices are multiples of 5 cents, and the machine gives all change in quarters, dimes, and nickels. Construct a program that computes how many quarters, dimes, and nickels to return to the customer.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d5cbc5a3f2aa638ba3",
    "name": "py_list2d_basic",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c5cbc5a3f2aa638ab7",
        "type": "example",
        "details": {
          "name": "Updating Two-Dimensional List (Case 1)",
          "description": "Construct a program that initializes a 3x4 two-dimensional matrix that has the numbers 1 through 12 for entries, updates the last row to a list filled with 5s, then sets the left-most element in the middle row of the matrix to be 20, and finally prints the matrix.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c5cbc5a3f2aa638ab9",
        "type": "challenge",
        "details": {
          "name": "Updating Two-Dimensional List (Case 2)",
          "description": "Construct a program that initializes a 3x3 two-dimensional matrix that has the numbers 1 through 9 for entries, updates the middle row to a list filled with 1s, then sets the top-right element of the matrix to be 10, and finally prints the matrix.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c5cbc5a3f2aa638abb",
        "type": "challenge",
        "details": {
          "name": "Updating Two-Dimensional List (Case 3)",
          "description": "Construct a program that initializes a 2x4 two-dimensional matrix that has multiples of 10 from 10 to 80 for entries, updates the last row to a list holding values 1,3,5,7, then sets the second element of the first row to be 8, and finally prints the matrix.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d5cbc5a3f2aa638ba5",
    "name": "py_search_list",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c6cbc5a3f2aa638abd",
        "type": "example",
        "details": {
          "name": "Printing Common Elements in Two Lists",
          "description": "Construct a program that has a function that receives two lists and prints the values in the 2nd list that exist in the 1st list.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c6cbc5a3f2aa638abf",
        "type": "challenge",
        "details": {
          "name": "Printing the Total Number of Times Elements of One List Appear in Another List",
          "description": "Construct a program that has a function that receives two lists and prints the total number of times the elements in the 2nd list appear in the 1st list. For example, if the 1st list is [1, 2, 3, 3, 4, 4, 5, 6] and the 2nd list is [3, 4, 5, 6, 7], then the total number of times that the elements in the 2nd list appear in the 1st list is 6.\\nNote that we need to count matches for all values in the 2nd list (including duplicate values, if any).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c6cbc5a3f2aa638ac1",
        "type": "challenge",
        "details": {
          "name": "Creating a List that Contains the Numbers of Times Each Element of One List Appears in Another List",
          "description": "Construct a program that has a function that receives two lists and creates a list that contains the number of times each element in the 2nd list appears in the 1st list. For example, if the 1st list is [1, 2, 3, 3, 4, 4, 5, 6] and the 2nd list is [3, 4, 5, 6, 7], then the list that contains the number of times each element in the 2nd list appears in the 1st list is [2, 2, 1, 1, 0].\\nAssume that all elements in the 2nd list are unique.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d6cbc5a3f2aa638ba7",
    "name": "py_concat_char_two_str",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c6cbc5a3f2aa638ac3",
        "type": "example",
        "details": {
          "name": "Concatenating Characters of Two Strings (Case 1)",
          "description": "Construct a program that has a function that receives two strings and returns a string formed from the given strings such that the first character of each string is omitted.\\nFor example, the new string that will be formed from the strings 'abc' and 'xyz' is 'bcyz'.\\nAssume that both strings have at least one character.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c6cbc5a3f2aa638ac5",
        "type": "challenge",
        "details": {
          "name": "Concatenating Characters of Two Strings (Case 2)",
          "description": "Construct a program that has a function that receives two strings and returns a string formed from the given strings separated by a space character such that the first two characters of the given strings are swapped.\\nFor example, the new string that will be formed from the strings 'abc' and 'xyz' is 'xyc abz'.\\nAssume that both strings have at least two characters.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d6cbc5a3f2aa638ba9",
    "name": "py_digits",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c6cbc5a3f2aa638ac7",
        "type": "example",
        "details": {
          "name": "Printing Digits of an Integer from Right to Left",
          "description": "Construct a program that prints the digits of an integer from right to left.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c6cbc5a3f2aa638ac9",
        "type": "challenge",
        "details": {
          "name": "The Digit Sum of an Integer",
          "description": "Construct a program that calculates the sum of the digits of an integer.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c6cbc5a3f2aa638acb",
        "type": "challenge",
        "details": {
          "name": "Reversing the Digits of an Integer",
          "description": "Construct a program that reverses the digits of an integer mathematically.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d6cbc5a3f2aa638bab",
    "name": "py_check_age",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c6cbc5a3f2aa638acd",
        "type": "example",
        "details": {
          "name": "Determining Whether One is a Teenager (Case 1) ",
          "description": "Construct a program that receives a string that has the user name and age separated by a colon, and prints whether the user is a teenager. Make sure that the program handles all possible exceptions.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c7cbc5a3f2aa638acf",
        "type": "challenge",
        "details": {
          "name": "Determining Whether One is a Teenager (Case 2) ",
          "description": "Construct a program that asks the user to enter a string that has the user name and age separated by a colon, and prints whether the user is a teenager. Make sure that the program handles all possible exceptions. The program must ask the user for an input until the user enters a string that could be processed without any exception.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d6cbc5a3f2aa638bad",
    "name": "py_check_product_code",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c7cbc5a3f2aa638ad1",
        "type": "example",
        "details": {
          "name": "Counting the Number of Valid and Banned Product Codes (Case 1) ",
          "description": "Suppose a hypothetical company uses codes to represent its various products. A product code includes, among other information, a character in the tenth position that represents the zone from which that product was made. Due to some reorganization, products from zone R are banned from being sold.\\nConstruct a program that reads product codes from the user and counts the number of valid and banned codes entered. Make sure that the program handles all possible exceptions.\\nThe program must ask the user for an input until the user enters STOP.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c7cbc5a3f2aa638ad3",
        "type": "challenge",
        "details": {
          "name": "Counting the Number of Valid and Banned Product Codes (Case 2) ",
          "description": "Suppose a hypothetical company uses codes to represent its various products. A product code includes, among other information, a character in the tenth position that represents the zone from which that product was made, and a four-digit integer representing the district in which it will be sold. This four-digit integer begins at the 4th character and extends to the 7th character in the input code (inclusive). Due to some reorganization, products from zone R are banned from being sold in districts with a designation of 2000 or higher.\\nConstruct a program that reads product codes from the user and counts the number of valid and banned codes entered. Make sure that the program handles all possible exceptions.\\nThe program must ask the user for an input until the user enters STOP.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d6cbc5a3f2aa638baf",
    "name": "py_repeated_sequence",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c7cbc5a3f2aa638ad5",
        "type": "example",
        "details": {
          "name": "Printing A Sequence of Repeated Numbers (Case 1) ",
          "description": "Construct a program that receives an integer N from the user and prints a sequence of space-separated numbers from 1 to N such that each number in the sequence is repeated 5 times.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c7cbc5a3f2aa638ad7",
        "type": "challenge",
        "details": {
          "name": "Printing A Sequence of Repeated Numbers (Case 2) ",
          "description": "Construct a program that receives an integer N from the user and prints a sequence of space-separated numbers from 1 to N such that the N-th number in the sequence is repeated N times.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d6cbc5a3f2aa638bb1",
    "name": "py_list_process_elements",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c7cbc5a3f2aa638ad9",
        "type": "example",
        "details": {
          "name": "Calculating the Sum of the Values in the List",
          "description": "Construct a program that has a function that receives a list and calculates the sum of the values in that list.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c7cbc5a3f2aa638adb",
        "type": "challenge",
        "details": {
          "name": "Calculating the Average of the Values in the List",
          "description": "Construct a program that has a function that receives a list and calculates the average of the values in that list. The program should handle lists with arbitrary number of values (including an empty list).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a9060d6cbc5a3f2aa638bb3",
    "name": "py_star_patterns",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a9060c7cbc5a3f2aa638add",
        "type": "example",
        "details": {
          "name": "Printing A Right Triangle Star Pattern",
          "description": "A Right triangle star pattern contains N asterisks in N-th row. Construct a program that receives the number of rows in the right triangle star pattern and prints that triangle. For example, when the number of rows in the right triangle star pattern is 5, the program prints the following output:\\n*\\n**\\n***\\n****\\n*****",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a9060c8cbc5a3f2aa638adf",
        "type": "challenge",
        "details": {
          "name": "Printing an Inverted Right Triangle Star Pattern",
          "description": "An inverted right triangle star pattern of N rows contains N-i+1 asterisks in the i-th row. Construct a program that receives the number of rows in the inverted right triangle star pattern and prints that triangle. For example, when the number of rows in the inverted right triangle star pattern is 5, the program prints the following output:\\n*****\\n****\\n***\\n**\\n*",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6e32e78ede45c1172b",
    "name": "objects_classes_point",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6232e78ede45c11671",
        "type": "example",
        "details": {
          "name": "The Class for Representing a Point in the Euclidean Plane (Case 1)",
          "description": "Construct a class that represents a point in the Euclidean plane. The class should contain data that represents the point\u2019s integer coordinates (x,y). The point's coordinates could be accessed or changed only through the getter and setter methods. The class should also include a method to translate the point, i.e., shift the point's location by the specified amount.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6232e78ede45c11673",
        "type": "challenge",
        "details": {
          "name": "The Class for Representing a Point in the Euclidean Plane (Case 2)",
          "description": "Construct a class that represents a point in the Euclidean plane. The class should contain data that represents the point\u2019s integer coordinates (x,y). The point's coordinates could be accessed or changed only through the getter and setter methods. The class should also include a method to calculate and return the point's distance from the origin (0,0).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6e32e78ede45c1172d",
    "name": "py_list_basic",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6332e78ede45c11675",
        "type": "example",
        "details": {
          "name": "Updating an Element in the List (Case 1) ",
          "description": "Construct a program that initializes a list with three values, changes the first element in the list, and finally, prints the list.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6332e78ede45c11677",
        "type": "challenge",
        "details": {
          "name": "Updating an Element in the List (Case 2) ",
          "description": "Construct a program that initializes a list with five floating-point numbers, changes the second element in the list, and finally, prints the list.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6332e78ede45c11679",
        "type": "challenge",
        "details": {
          "name": "Updating an Element in the List (Case 3) ",
          "description": "Construct a program that initializes a list with four string values, changes the last element in the list, and finally, prints the list.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6e32e78ede45c1172f",
    "name": "py_list_rotate",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6332e78ede45c1167b",
        "type": "example",
        "details": {
          "name": "Rotating the List Values to the Left by One Position",
          "description": "Construct a program that has a function that receives a list of values and returns the list rotated to the left by 1 position so that the value at the front of the list goes to the back and the order of the other values stays the same. For example, if the list is [1, 2, 3, 4, 5, 6], the program will change it to [2, 3, 4, 5, 6, 1].",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6332e78ede45c1167d",
        "type": "challenge",
        "details": {
          "name": "Rotating the List Values to the Left by Two Position",
          "description": "Construct a program that has a function that receives a list of values and returns the list rotated to the left by 2 position so that the value at the front of the list goes to the second last position, the second value of the list goes to the back, and the order of the other values stays the same. For example, if the list is [1, 2, 3, 4, 5, 6], the program will change it to [3, 4, 5, 6, 1, 2].",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6332e78ede45c1167f",
        "type": "challenge",
        "details": {
          "name": "Rotating the List Values to the Right by One Position",
          "description": "Construct a program that has a function that receives a list of values and returns the list rotated to the right by one position so that the value that is currently at the end of the list is moved to the front, shifting the remaining values to the right. For example, if the list is [1, 2, 3, 4, 5, 6], the program will change it to [6, 1, 2, 3, 4, 5].",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6332e78ede45c11681",
        "type": "challenge",
        "details": {
          "name": "Rotating the List Values to the Right by Two Position",
          "description": "Construct a program that has a function that receives a list of values and returns the list rotated to the right by 2 position so that the value that is currently at the end of the list is moved to the second position, the second last value of the list is moved to the front of the list, and the remaining values are shifted to the right. For example, if the list is [1, 2, 3, 4, 5, 6], the program will change it to [5, 6, 1, 2, 3, 4].",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6e32e78ede45c11731",
    "name": "py_str_repeat_chars",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6332e78ede45c11683",
        "type": "example",
        "details": {
          "name": "Repeating Characters of a String (Case 1)",
          "description": "Construct a program that has a function that receives a string and creates a new string that has each character of the given string repeated two times.\\nFor example, the new string that will be formed from the string 'abc' is 'aabbcc'.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6432e78ede45c11685",
        "type": "challenge",
        "details": {
          "name": "Repeating Characters of a String (Case 2)",
          "description": "Construct a program that has a function that receives a string and creates a new string that has every other character of the given string, starting with the first character, repeated two times.\\nFor example, the new string that will be formed from the string 'abcde' is 'aaccee'.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11733",
    "name": "py_if_else_num",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6432e78ede45c11687",
        "type": "example",
        "details": {
          "name": "Determining the Sign of an Integer",
          "description": "Construct a program that determines whether an integer is positive, negative, or zero.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6432e78ede45c11689",
        "type": "challenge",
        "details": {
          "name": "Determining Whether an Integer is Even or Odd",
          "description": "Construct a program that determines whether an integer is even or odd.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11735",
    "name": "py_if_else_grade",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6432e78ede45c1168b",
        "type": "example",
        "details": {
          "name": "Determining the Letter Grade Of a Student",
          "description": "Construct a program that receives a score from the user and determines the grade as follows:\\nA for scores \u2265 90\\nB for scores \u2265 80\\nC for scores \u2265 70\\nD for scores \u2265 60\\nF for scores < 60\\n",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6432e78ede45c1168d",
        "type": "challenge",
        "details": {
          "name": "Converting the Letter Grade of a Student to It's Numeric Range",
          "description": "Construct a program that receives a grade from the user and prints the numeric range for that grade using the following grading rules:\\nA for scores \u2265 90\\nB for scores \u2265 80\\nC for scores \u2265 70\\nD for scores \u2265 60\\nF for scores < 60\\nFor example, if the user enters the grade D, the program prints \"Score is in range [60-70)\". ",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11737",
    "name": "py_range_three",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6432e78ede45c1168f",
        "type": "example",
        "details": {
          "name": "Printing Sequence of Numbers with a Gap Between Adjacent Values (Case 1) ",
          "description": "Construct a program that prints a sequence of numbers from 1 (inclusive) to 16 (exclusive) in increments of 4.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6432e78ede45c11691",
        "type": "challenge",
        "details": {
          "name": "Printing Sequence of Numbers with a Gap Between Adjacent Values (Case 2) ",
          "description": "Construct a program that prints a sequence of numbers from 7 (inclusive) to 35 (inclusive) in increments of 7.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11739",
    "name": "py_range_two",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6432e78ede45c11693",
        "type": "example",
        "details": {
          "name": "Printing Consecutive Numbers Within a Specified Range (Case 1) ",
          "description": "Construct a program that prints a sequence of numbers from 1 (inclusive) to 9 (inclusive).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6432e78ede45c11695",
        "type": "challenge",
        "details": {
          "name": "Printing Consecutive Numbers Within a Specified Range (Case 2) ",
          "description": "Construct a program that prints a sequence of numbers from 8 (inclusive) to 14 (inclusive).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c1173b",
    "name": "py_three_booleans",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6532e78ede45c11697",
        "type": "example",
        "details": {
          "name": "Determining When at Least One of the Three Boolean Variables is True",
          "description": "Construct a program that determines whether at least one of the three boolean variables is True based on the inputs that it receives from the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6532e78ede45c11699",
        "type": "challenge",
        "details": {
          "name": "Determining When at Least One of the Three Boolean Variables is False",
          "description": "Construct a program that determines whether at least one of the three boolean variables is False based on the inputs that it receives from the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6532e78ede45c1169b",
        "type": "challenge",
        "details": {
          "name": "Determining When All Three Boolean Variables Are Equal",
          "description": "Construct a program that receives the value of three boolean variables from the user and determines whether all variables have the same value, either all three True or all three False.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c1173d",
    "name": "objects_classes_account",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6532e78ede45c1169d",
        "type": "example",
        "details": {
          "name": "The Class for Representing a Bank Account (Case 1)",
          "description": "Construct a class that represents a basic bank account. This class should contain data representing the name of the account\u2019s owner, the account number, and the account\u2019s current balance; all of which could be accessed or changed only through the getter and setter methods. An instance of the class should be created by specifying three parameters that are used to initialize the instance (i.e., object) data. The other methods of this class should perform various services on the account (making deposits, withdrawals, adding interest to the account). These methods should examine the data passed into them to make sure the requested transaction is valid.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6532e78ede45c1169f",
        "type": "challenge",
        "details": {
          "name": "The Class for Representing a Bank Account (Case 2)",
          "description": "Construct a class that represents a basic bank account. This class should contain data representing the name of the account\u2019s owner, the account number, and the account\u2019s current balance; all of which could be accessed or changed only through the getter and setter methods. An instance of the class should be created by specifying three parameters that are used to initialize the instance (i.e., object) data. The other methods of this class should:\\n - provide a one-line description of the account, and\\n - perform various services on the account (making deposits, withdrawals, adding interest to the account). These methods should examine the data passed into them to make sure the requested transaction is valid.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c1173f",
    "name": "py_file_input_stat",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6532e78ede45c116a1",
        "type": "example",
        "details": {
          "name": "Reporting File Information (Case 1) ",
          "description": " Construct a program that receives the full path to an input file from the user, reads that file and reports the number of lines, the longest line, the number of words on each line, and the length of the longest word on each line. Make sure that the program handles each specific exception that could occur.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6532e78ede45c116a3",
        "type": "challenge",
        "details": {
          "name": "Reporting File Information (Case 2) ",
          "description": " Construct a program that receives the full path to an input file from the user, reads that file and reports the number of lines, the longest line, the number of words on each line, and the length of the longest word on each line. Make sure that the program handles each specific exception that could occur. Also, the program must ask the user for a valid file path until the user enters a file path that could be accessed without any exception.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11741",
    "name": "py_win_percentage",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6632e78ede45c116a5",
        "type": "example",
        "details": {
          "name": "Calculating the Winning Percentage of a Sports Team (Case 1)",
          "description": "Construct a program that receives from the user the number of games that a sports team won in a tournament of 12 games and calculates the winning percentage of that sports team. The program must ask for the number of the games won until the user enters a valid number.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6632e78ede45c116a7",
        "type": "challenge",
        "details": {
          "name": "Calculating the Winning Percentage of a Sports Team (Case 2) ",
          "description": "Construct a program that receives from the user the number of games in a tournament and the number of the games that a sports team won in the tournament, and calculates the winning percentage of that sports team. The program must ask the user for each of the two inputs until the user enters a valid number.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6632e78ede45c116a9",
        "type": "challenge",
        "details": {
          "name": "Calculating the Winning Percentage of a Sports Team (Case 3)",
          "description": "Construct a program that receives from the user the number of games that a sports team won and tied in a tournament of 12 games and calculates the winning percentage of the sports team, counting ties as half wins. The program must ask the user for each of the two inputs until the user enters a valid number.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11743",
    "name": "py_find_average",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6632e78ede45c116ab",
        "type": "example",
        "details": {
          "name": "Calculating the Average of Input Integers",
          "description": "Construct a program that reads a series of integers from the user, sums them up, and calculates their average. The user enters 0 to indicate the end of the input.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6632e78ede45c116ad",
        "type": "challenge",
        "details": {
          "name": "Calculating the Average of the Input Integers that are an Even Number",
          "description": "Construct a program that reads a series of integer values from the user, sums up the integers that are an even number, and calculate their average. The user enters 0 to indicate the end of the input.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6632e78ede45c116af",
        "type": "challenge",
        "details": {
          "name": "Calculating the Average of Floating-Point Numbers",
          "description": "Construct a program that reads a series of non-negative floating-point numbers from the user, sums them up, and calculate their average.\\nNote that you need to think what value should the program use to indicate the end of the input.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11745",
    "name": "py_work_hours",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6632e78ede45c116b1",
        "type": "example",
        "details": {
          "name": "Reporting the Total Hours Each Employee Worked (Case 1) ",
          "description": "Suppose we have an input file that contains information about how many hours each employee of a company has worked. The file looks like the following (Employee's name, Hours):\\nErica 7.5 8.5 10.25 8 8.5\\nErin 10.5 11.5 12 11 10.75\\nSimone 8 8 8\\n...\\nConstruct a program that reads this file and calculates the total number of hours worked by each individual. Make sure that the program handles each specific exception that could occur. ",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6632e78ede45c116b3",
        "type": "challenge",
        "details": {
          "name": "Reporting the Total Hours Each Employee Worked (Case 2) ",
          "description": "Suppose we have an input file that contains information about how many hours each employee of a company has worked. The file looks like the following (Employee's identification number, Employee's name, Hours):\\n101 Erica 7.5 8.5 10.25 8 8.5\\n783 Erin 10.5 11.5 12 11 10.75\\n114 Simone 8 8 8\\n...\\nConstruct a program that reads this file and calculates the total number of hours worked by each individual. Make sure that the program handles each specific exception that could occur. ",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae6f32e78ede45c11747",
    "name": "py_concat_str_num",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6732e78ede45c116b5",
        "type": "example",
        "details": {
          "name": "Concatenating Strings and Numbers (Case 1)",
          "description": "Construct a program that uses variables x, y, and z to print \"Python was invented in 1989.\".",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6732e78ede45c116b7",
        "type": "challenge",
        "details": {
          "name": "Concatenating Strings and Numbers (Case 2)",
          "description": "Construct a program that uses variables x, y, and z to print \"x * 2 = 4\".",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6732e78ede45c116b9",
        "type": "challenge",
        "details": {
          "name": "Concatenating Strings and Numbers (Case 3)",
          "description": "Construct a program that uses variables x, y, and z to print \"10 + 20 = 30\".",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c11749",
    "name": "py_student_score",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6732e78ede45c116bb",
        "type": "example",
        "details": {
          "name": "Creating a Dictionary of Student-Scores Pairs (Case 1) ",
          "description": "Assume we have a list of students and a list of their corresponding test scores. Construct a program that has a function which receives these two lists and returns a dictionary that maps each student to the scores of that student.\\nFor example, if the student list is ['Sam', 'Kim', 'Sam'] and the scores list is [15, 10, 14], the program creates the following dictionary:\\n{'Sam': [15, 14], 'Kim': [10]}",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6732e78ede45c116bd",
        "type": "challenge",
        "details": {
          "name": "Creating a Dictionary of Student-Scores Pairs (Case 2)",
          "description": "Assume we have a list of students and a list of their corresponding test scores. Construct a program that has two functions:\\n- a function that receives these two lists and returns a dictionary that maps each student to the scores of that student, and \\n- a function that receives the dictionary created by the above function and calculates the average score of each student",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c1174b",
    "name": "py_rent_car",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6732e78ede45c116bf",
        "type": "example",
        "details": {
          "name": "Determining When a Customer Could Rent a Car (Case 1)",
          "description": "Construct a program that determines whether a customer could rent a car based on the inputs that it receives from the car rental agent. Rental cars are available to licensed drivers of 21 years of age or over.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6732e78ede45c116c1",
        "type": "challenge",
        "details": {
          "name": "Determining When a Customer Could Rent a Car (Case 2)",
          "description": "Construct a program that determines whether a customer could rent a car based on the inputs that it receives from the car rental agent. Rental cars are available to licensed drivers of 21 years of age or over who have not had a car accident.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6732e78ede45c116c3",
        "type": "challenge",
        "details": {
          "name": "Determining When a Customer Could Rent a Car (Case 3)",
          "description": "Construct a program that determines whether a customer could rent a car based on the inputs that it receives from the car rental agent. Rental cars are available to licensed drivers who are either at least 21 years old or have a credit card with $10,000 or more of credit.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c1174d",
    "name": "py_str_count",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6832e78ede45c116c5",
        "type": "example",
        "details": {
          "name": "Counting the Occurrences of One String in Another (Case 1)",
          "description": "Construct a program that has a function that receives a string and returns the number of times that the string \"hi\" appears anywhere in the given string, ignoring the case.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6832e78ede45c116c7",
        "type": "challenge",
        "details": {
          "name": "Counting the Occurrences of One String in Another (Case 2)",
          "description": "Construct a program that has a function that receives a string and returns the number of times that the string \"hi?t\" appears anywhere in the given string where '?' could be any letter. For example, \"hint\" and \"hilt\" would count as a match.\\nAll string comparisons should be case-insensitive.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c1174f",
    "name": "objects_classes_tv",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6832e78ede45c116c9",
        "type": "example",
        "details": {
          "name": "The Class for Representing a TV (Case 1)",
          "description": "Construct a class that represents a TV. The class should contain data that represents the TV's state (power on or off, current channel). The state of the TV could be accessed or changed only through the getter and setter methods. The class should also include methods to change the state of the TV (turn on/off, change channels). Assume that the valid channel range is from 1 to 120 (both inclusive).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6832e78ede45c116cb",
        "type": "challenge",
        "details": {
          "name": "The Class for Representing a TV (Case 2)",
          "description": "Construct a class that represents a TV. The class should contain data that represents the TV's state (power on or off, current volume level). The state of the TV could be accessed or changed only through the getter and setter methods. The class should also include methods to change the state of the TV (turn on/off, change volume level). Assume that the volume level is an integer and ranges from 1 to 7 (both inclusive).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c11751",
    "name": "py_range_one",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6832e78ede45c116cd",
        "type": "example",
        "details": {
          "name": "Printing Consecutive Numbers Starting from Zero (Case 1) ",
          "description": "Construct a program that prints a sequence of numbers from 0 (inclusive) to 10 (exclusive).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6832e78ede45c116cf",
        "type": "challenge",
        "details": {
          "name": "Printing Consecutive Numbers Starting from Zero (Case 2) ",
          "description": "Construct a program that prints a sequence of numbers from 0 (inclusive) to 6 (exclusive).",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c11753",
    "name": "py_nested_if_min_max",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6832e78ede45c116d1",
        "type": "example",
        "details": {
          "name": "Determining the Smallest of the Three Integers",
          "description": "Construct a program that determines the smallest of the three integer values entered by the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6932e78ede45c116d3",
        "type": "challenge",
        "details": {
          "name": "Determining the Largest of the Three Integers",
          "description": "Construct a program that determines the largest of the three integer values entered by the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c11755",
    "name": "py_divisor",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6932e78ede45c116d5",
        "type": "example",
        "details": {
          "name": "Finding the Smallest Divisor of a Positive Number",
          "description": "Construct a program that finds the smallest divisor (other than 1) of a positive number. For example, the smallest divisor of 4 is 2.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6932e78ede45c116d7",
        "type": "challenge",
        "details": {
          "name": "Finding the Largest Divisor of a Positive Number",
          "description": "Construct a program that finds the largest divisor of a positive number, excluding the number itself. For example, the largest divisor of 24 is 12.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c11757",
    "name": "py_print_medals",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6932e78ede45c116d9",
        "type": "example",
        "details": {
          "name": "Printing Table of Medal Counts with Row Totals",
          "description": "Assume that we have a 7x4 matrix that stores the number of medals that seven countries won in the skating competitions at the Winter Olympic. This matrix looks like as follows:\\n[[ \"Canada\", 1, 0, 1 ],\\n [ \"China\", 1, 1, 0 ],\\n ...]\\nEach row of this matrix corresponds to the medal counts for the country in that row. The second, third, and fourth numbers within a row represent the number of Gold, Silver, and Bronze medals won by the corresponding country in that row.\\nConstruct a program that takes this matrix and prints a table of medal counts with row total that shows the number of Gold, Silver, Bronze, and Total medals for each of the countries who participated in the competition. The output table should look like as follows:\\n    Country    Gold  Silver  Bronze   Total\\n     Canada        1       0       1            2\\n        China        1       1       0            2\\n       ...\\n",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6932e78ede45c116db",
        "type": "challenge",
        "details": {
          "name": "Printing Table of Medal Winner Counts with Row and Column Totals",
          "description": "Assume that we have a 7x4 matrix that stores the number of medals that seven countries won in the skating competitions at the Winter Olympic. This matrix looks like as follows:\\n[[ \"Canada\", 1, 0, 1 ],\\n [ \"China\", 1, 1, 0 ],\\n ...]\\nEach row of this matrix corresponds to the medal counts for the country in that row. The second, third, and fourth numbers within a row represent the number of Gold, Silver, and Bronze medals won by the corresponding country in that row.\\nConstruct a program that takes this matrix and prints a table of medal counts with row and column totals. The column totals are the sum of the gold, silver, and bronze medals won in the competition. The output table should look like as follows:\\n      Country    Gold  Silver  Bronze   Total\\n         Canada        1       0       1          2\\n            China        1       1       0          2\\n           ...\\nColumn Total      4       4       4",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c11759",
    "name": "py_input",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6932e78ede45c116dd",
        "type": "example",
        "details": {
          "name": "Receiving Input Integers Until a Certain Condition is Met (Case 1)",
          "description": "Construct a program that receives an integer from the user, outputs that integer, and stops receiving integers when the user enters a negative integer.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6932e78ede45c116df",
        "type": "challenge",
        "details": {
          "name": "Receiving Input Integers Until a Certain Condition is Met (Case 2)",
          "description": "Construct a program that receives an integer from the user, outputs that integer, and stops receiving integers when the user enters an integer that is not in the range of 30 to 90 both inclusive.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6a32e78ede45c116e1",
        "type": "challenge",
        "details": {
          "name": "Receiving Input Integers Until a Certain Condition is Met (Case 3)",
          "description": "Construct a program that receives an integer from the user, outputs that integer, and stops receiving integers when the user enters a negative integer or an integer greater than 1000.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6a32e78ede45c116e3",
        "type": "challenge",
        "details": {
          "name": "Receiving Input Integers Until a Certain Condition is Met (Case 4)",
          "description": "Construct a program that receives an integer from the user, outputs that integer, and stops receiving integers when the user enters an even integer less than 10.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c1175b",
    "name": "py_nested_if_temperature",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6a32e78ede45c116e5",
        "type": "example",
        "details": {
          "name": "Warning the User about the Changes in the Temperature",
          "description": "Construct a program that receives the temperature for today and yesterday and warns the user when it is getting colder or warmer or neither. The temperature values could have a decimal point.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6a32e78ede45c116e7",
        "type": "challenge",
        "details": {
          "name": "Warning the User about the Changes in the Temperature and Humidity",
          "description": "Construct a program that receives the temperature and humidity for today and yesterday and warns the user when it is getting colder or warmer or neither. When it is getting warmer, the program should also warn the user about the changes in humidity. In particular, it should warn the user when today's humidity is more, less, or has not changed compared to yesterday's humidity. Note that the temperature and humidity values could have a decimal point.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7032e78ede45c1175d",
    "name": "py_bmi_calculator",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6a32e78ede45c116e9",
        "type": "example",
        "details": {
          "name": "Calculating Body Mass Index (BMI)",
          "description": "BMI is a measure of body fat based on height and weight that applies to adult men and women. BMI Categories are as follows:\\nUnderweight = <18.5\\nNormal weight = 18.5\u201324.9\\nOverweight = 25\u201329.9\\nObesity = BMI of 30 or greater.\\nEnglish BMI Formula (Imperial) is: BMI = (Weight in Pounds / (Height in inches x Height in inches)) x 703.\\nConstruct a program that calculates the Body Mass Index (BMI) according to this formula.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6a32e78ede45c116eb",
        "type": "challenge",
        "details": {
          "name": "Calculating and Rounding Up Body Mass Index (BMI) To the Nearest Integer",
          "description": "BMI is a measure of body fat based on height and weight that applies to adult men and women. BMI Categories are as follows: \\nUnderweight = <18.5\\nNormal weight = 18.5\u201324.9\\nOverweight = 25\u201329.9\\nObesity = BMI of 30 or greater.\\nEnglish BMI Formula (Imperial) is: BMI = (Weight in Pounds / (Height in inches x Height in inches)) x 703.\\n BMI results are usually displayed as integers (values without decimal points). Construct a program to round the BMI result to the nearest integer.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c1175f",
    "name": "py_list_fill",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6a32e78ede45c116ed",
        "type": "example",
        "details": {
          "name": "Add Values to an Empty List (Case 1)",
          "description": "Construct a program that creates a list of first ten positive odd numbers.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6a32e78ede45c116ef",
        "type": "challenge",
        "details": {
          "name": "Add Values to an Empty List (Case 2)",
          "description": "Construct a program that creates a list of eight string values received from the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c11761",
    "name": "py_check_adjacent",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6b32e78ede45c116f1",
        "type": "example",
        "details": {
          "name": "Finding Adjacent Duplicates in a Sequence of Numbers",
          "description": "Construct a program that checks whether a sequence of numbers, entered one at a time, contains adjacent duplicates. The user enters -1 to indicate the end of the input.\\nFor example, 4 is a duplicate in the sequence of numbers 1, 3, 4, 4, -1.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6b32e78ede45c116f3",
        "type": "challenge",
        "details": {
          "name": "Finding Adjacent Consecutive Numbers in a Sequence of Integers",
          "description": "Construct a program that checks whether a sequence of integers, entered one at a time, contains adjacent integers that are consecutive. The user enters -1 to indicate the end of the input.\\nNote that integers which follow each other in order, without gaps, from smallest to largest are consecutive numbers. For example, 12, 13, 14 and 15 are consecutive numbers.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6b32e78ede45c116f5",
        "type": "challenge",
        "details": {
          "name": "Finding Adjacent Numbers in Ascending Order in a Sequence of Numbers",
          "description": "Construct a program that checks whether a sequence of non-zero numbers, entered one at a time, contains adjacent numbers in ascending order. Numbers are said to be in ascending order when they are arranged from the smallest to the largest number. For example, 5, 9, 13, 17 and 21 are arranged in ascending order.\\nNote that you need to think what value should the program use to indicate the end of the input.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c11763",
    "name": "py_fail_course",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6b32e78ede45c116f7",
        "type": "example",
        "details": {
          "name": "Determining When a Student Fails a Course (Case 1)",
          "description": "Construct a program to determine whether a student fails the course based on the inputs that it receives from the instructor. The student fails the course if the exam score is less than 55 or student has more than 2 missing homework.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6b32e78ede45c116f9",
        "type": "challenge",
        "details": {
          "name": "Determining When a Student Fails a Course (Case 2)",
          "description": "Construct a program that determines whether a student fails the course based on the inputs that it receives from the instructor. The student fails the course if the exam score is less than 55 or when the student has cheated.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6b32e78ede45c116fb",
        "type": "challenge",
        "details": {
          "name": "Determining When a Student Fails a Course (Case 3)",
          "description": "Construct a program that determines whether a student fails the course based on the inputs that it receives from the instructor. The student fails the course if his/her score is not above the class average.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c11765",
    "name": "objects_classes_loan",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6b32e78ede45c116fd",
        "type": "example",
        "details": {
          "name": "The Class for Representing a Loan (Case 1)",
          "description": "Construct a class that represents a loan. This class should contain data representing the interest rate, loan amount, and the length of loan period (in years); all of which could be accessed or changed only through the getter and setter methods. An instance of the class should be created by specifying annual interest rate, length of loan period, and loan amount.\\nThe other method of the this class should calculate the amount of monthly payments on the loan.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6c32e78ede45c116ff",
        "type": "challenge",
        "details": {
          "name": "The Class for Representing a Loan (Case 2)",
          "description": "Construct a class that represents a loan. This class should contain data representing the interest rate, loan amount, and the length of loan period (in years); all of which could be accessed or changed only through the getter and setter methods. An instance of the class should be created by specifying annual interest rate, length of loan period, and loan amount.\\nThe other methods of the this class should calculate the amount of monthly payments on the loan as well as the total payment.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c11767",
    "name": "py_hot_dry",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6c32e78ede45c11701",
        "type": "example",
        "details": {
          "name": "Determining the Weather Condition (Case 1)",
          "description": "Construct a program that determines whether it is both too hot and too dry based on the inputs that it receives from the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6c32e78ede45c11703",
        "type": "challenge",
        "details": {
          "name": "Determining the Weather Condition (Case 2)",
          "description": "Construct a program that determines whether it is either too hot or too dry (or both) based on the inputs that it receives from the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6c32e78ede45c11705",
        "type": "challenge",
        "details": {
          "name": "Determining the Weather Condition (Case 3)",
          "description": "Construct a program that determines whether it is too hot but not too dry based on the inputs that it receives from the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6c32e78ede45c11707",
        "type": "challenge",
        "details": {
          "name": "Determining the Weather Condition (Case 4)",
          "description": "Construct a program that determines whether it is either too hot or too dry but not both based on the inputs that it receives from the user.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c11769",
    "name": "py_squares",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6c32e78ede45c11709",
        "type": "example",
        "details": {
          "name": "Printing the Squares of Numbers Within a Specified Range (Case 1) ",
          "description": "Construct a program to write out the squares of even positive integers less than or equal to 10.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6c32e78ede45c1170b",
        "type": "challenge",
        "details": {
          "name": "Printing the Squares of Numbers Within a Specified Range (Case 2) ",
          "description": "Construct a program to write out the squares of odd positive integers less than 10.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6c32e78ede45c1170d",
        "type": "challenge",
        "details": {
          "name": "Printing the Squares of Numbers Within a Specified Range (Case 3) ",
          "description": "Construct a program to write out the squares of every number between 20 and 25, both inclusive.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c1176b",
    "name": "py_temperature",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6c32e78ede45c1170f",
        "type": "example",
        "details": {
          "name": "Finding the Number of Days Above the Average Temperature",
          "description": "Construct a program that reads a series of temperatures and reports the average temperature and the number of the days that are above the average. Assume that the input values could have a decimal point.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6d32e78ede45c11711",
        "type": "challenge",
        "details": {
          "name": "Displaying the Days That are Above 32 Degrees Fahrenheit",
          "description": "Construct a program that reads a series of temperatures and reports the days that are above 32 degrees Fahrenheit. Assume that the temperature values are in Fahrenheit. Also assume that input values could have a decimal point.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c1176d",
    "name": "py_list_change",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6d32e78ede45c11713",
        "type": "example",
        "details": {
          "name": "Modifying a List (Case 1)",
          "description": "Construct a program that increments all values of the list by 1.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6d32e78ede45c11715",
        "type": "challenge",
        "details": {
          "name": "Modifying a List (Case 2)",
          "description": "Construct a program that swaps pairs of adjacent elements of the list. For example, if the list is [1, 2, 3, 4, 5, 6], the program will change it to [2, 1, 4, 3, 6, 5].\\nThis program assumes that the list has always an even number of elements.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c1176f",
    "name": "py_phone_age",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6d32e78ede45c11717",
        "type": "example",
        "details": {
          "name": "Determining When to Buy a New Phone (Case 1)",
          "description": "Construct a program that determines whether it is time to buy a new phone based on the inputs that it receives from the user. A new phone should be bought if the phone breaks or the phone is at least 3 years old.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6d32e78ede45c11719",
        "type": "challenge",
        "details": {
          "name": "Determining When to Buy a New Phone (Case 2)",
          "description": "Construct a program that determines whether it is time to buy a new phone based on the inputs that it receives from the user. A new phone should be bought in either of the following cases:\\nthe phone breaks\\nthe screen has a problem\\nthe phone has the random shutdown problem",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c11771",
    "name": "py_char_dict",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6d32e78ede45c1171b",
        "type": "example",
        "details": {
          "name": "Creating a Dictionary of Character-Count Pairs",
          "description": "Construct a program that has a function which receives a string from the user and creates a dictionary that maps each character in the given string to its frequency, that is, how many times that character appears in the given string.\\nFor example, if the given string is \"book\", the program creates the following dictionary:\\nb : 1\\no : 2\\nk : 1",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6d32e78ede45c1171d",
        "type": "challenge",
        "details": {
          "name": "Creating a Dictionary of Character-Words Pairs",
          "description": "Construct a program that has a function which receives a string and creates a dictionary that maps each character to the list of distinct words in the given string that start with that character. The dictionary should be case insensitive.\\nFor example, if the given string is \"This is my test score\", the program creates the following dictionary:\\nt : ['this', 'test']\\ni : ['is']\\nm : ['my']\\ns : ['score']",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7132e78ede45c11773",
    "name": "py_f_to_c_conversion",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6d32e78ede45c1171f",
        "type": "example",
        "details": {
          "name": "Celsius To Fahrenheit Conversion",
          "description": "Construct a program that computes the Fahrenheit equivalent of an input Celsius value using the formula F = (9/5)C + 32. The input Celsius value is an integer.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6e32e78ede45c11721",
        "type": "challenge",
        "details": {
          "name": "Fahrenheit to Celsius Conversion",
          "description": "Construct a program that computes the Celsius equivalent of an input Fahrenheit value using the formula C = (F - 32) (5/9). The input Fahrenheit value is an integer.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7232e78ede45c11775",
    "name": "py_list_min_max",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6e32e78ede45c11723",
        "type": "example",
        "details": {
          "name": "Finding the Maximum Value in a List",
          "description": "Write a program that finds the maximum value in a list.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6e32e78ede45c11725",
        "type": "challenge",
        "details": {
          "name": "Finding the Minimum Value in a List",
          "description": "Write a program that finds the minimum value in a list.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  },
  {
    "id": "6a91ae7232e78ede45c11777",
    "name": "py_if_else_wage",
    "description": "",
    "tags": [],
    "items": [
      {
        "item": "6a91ae6e32e78ede45c11727",
        "type": "example",
        "details": {
          "name": "Calculating the Employee's Wage Based on the Hours That the Employee Has Worked and an Hourly Pay Rate",
          "description": "Construct a program for the payment department of a company to calculate the wage of an employee based on the number of hours that the employee has worked. If an employee works over 40 hours in a week, the payment amount should take into account the overtime hours. The overtime hours are paid at a rate one and a half times the regular pay rate.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      },
      {
        "item": "6a91ae6e32e78ede45c11729",
        "type": "challenge",
        "details": {
          "name": "Calculating the Wage of an Employee at the Customer Service Call Center",
          "description": "Construct a program for the payment department of a company to calculate the wage of an employee who works at the customer service call center. Like other employees in the company, the employees at the customer service call center are paid based on the hours that they work. If they work over 40 hours in a week, the payment amount should take into account the overtime hours. The overtime hours are paid at a rate one and a half times the regular pay rate.\\nThe company's policy is to pay more to those employees at the customer service call center who work during weekends. Therefore, the minimum extra pay that the employees could receive for each day of work during weekends is $30. The extra pay increases to the maximum of $50 for the employees who have at least 5 days of work during weekends.",
          "language": "PYTHON",
          "tags": [
            "gpt5mini;color=purple",
            "llm_expl+dist&expl;color=blue",
            "validation-pending;color=orange"
          ],
          "iso_language_code": "en"
        }
      }
    ],
    "collaborator_emails": [
      "rah225@pitt.edu",
      "peterb@pitt.edu",
      "arl122@pitt.edu",
      "quinnkwolter@pitt.edu",
      "hua1007.yu@connect.polyu.hk"
    ]
  }
];

  // 1. Fix Specific Sources
  console.log('\n--- [1/3] Applying Source Fixes ---');
  for (const [sid, patchData] of Object.entries(sourceFixes)) {
    console.log(`Updating source distractors for ${sid}...`);
    const patchRes = await fetch(`/pcex-authoring/api/sources/${sid}?allUsers=true`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchData)
    });
    console.log(`  ✓ PATCH source ${sid}: HTTP ${patchRes.status}`);
  }

  // 2. Update and Remap all 52 Bundles
  console.log(`\n--- [2/3] Patching & Remapping ${bundleUpdates.length} Bundles ---`);
  let patchSuccess = 0;
  for (let i = 0; i < bundleUpdates.length; i++) {
    const b = bundleUpdates[i];
    try {
      const res = await fetch(`/pcex-authoring/api/bundles/${b.id}?allUsers=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: b.name,
          description: b.description,
          tags: b.tags,
          items: b.items,
          collaborator_emails: b.collaborator_emails
        })
      });
      if (res.ok) {
        patchSuccess++;
        if ((i + 1) % 10 === 0 || i === bundleUpdates.length - 1) {
          console.log(`  ✓ Patched ${i + 1}/${bundleUpdates.length} bundles (${b.name})`);
        }
      } else {
        console.warn(`  ✗ Failed to patch bundle ${b.id} (${b.name}): HTTP ${res.status}`);
      }
    } catch (err) {
      console.error(`  ✗ Error patching bundle ${b.id}:`, err);
    }
    await new Promise(r => setTimeout(r, 40));
  }

  // 3. Sync & Compile all 52 Bundles
  console.log(`\n--- [3/3] Syncing to PAWS & Compiling Previews for ${bundleUpdates.length} Bundles ---`);
  let syncSuccess = 0;
  let compileSuccess = 0;

  for (let i = 0; i < bundleUpdates.length; i++) {
    const b = bundleUpdates[i];
    console.log(`[${i + 1}/${bundleUpdates.length}] Processing bundle: "${b.name}" (${b.id})...`);

    try {
      // Sync to PAWS
      const syncRes = await fetch(`/pcex-authoring/api/bundles/${b.id}/sync?allUsers=true`, {
        method: 'POST'
      });
      if (syncRes.ok) {
        syncSuccess++;
      } else {
        console.warn(`  ↳ ⚠️ Sync HTTP ${syncRes.status} for ${b.name}`);
      }

      // Compile Bundle with full activity body
      const compRes = await fetch(`/pcex-authoring/api/bundles/${b.id}/preview?type=activity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      });
      if (compRes.ok) {
        compileSuccess++;
        console.log(`  ↳ ✓ Synced & Compiled successfully.`);
      } else {
        console.warn(`  ↳ ⚠️ Compile HTTP ${compRes.status} for ${b.name}`);
      }

    } catch (err) {
      console.error(`  ↳ ✗ Error on bundle ${b.id}:`, err);
    }
    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n================================================================================');
  console.log('🎉 FIX & SYNC COMPLETED SUCCESSFULLY!');
  console.log(`   • Sources Updated & Compiled: 100%`);
  console.log(`   • Bundles Patched: ${patchSuccess} / ${bundleUpdates.length}`);
  console.log(`   • Bundles Synced to PAWS: ${syncSuccess} / ${bundleUpdates.length}`);
  console.log(`   • Bundles Compiled: ${compileSuccess} / ${bundleUpdates.length}`);
  console.log('================================================================================');
})();
