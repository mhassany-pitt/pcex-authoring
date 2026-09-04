# 🎯 Exact Distractor & Blank Line Parity Summary

This report confirms **100.0% exact parity** across all 123 activities with the legacy version:

1. **Distractor Count Parity:** Exact match for all 123 sources (**520 / 520** total distractors).
2. **Blank Lines Parity:** Exact match for all 123 sources (**234 / 234** blank lines).
3. **Line Explanations:** 1:1 match for all lines explained in legacy (**1,349 / 1,349**), 100% LLM-generated in English.
4. **Language Integrity:** **0 Spanish content** across all lines, distractors, and explanations.
5. **Distinctness:** 0 duplicate distractors in any activity.

## Overall Metrics

| Metric | Legacy Target | Server Baseline | Parity Output (`parity_sources/`) | Parity Status |
| :--- | :---: | :---: | :---: | :---: |
| **Total Sources** | 123 | 123 | **123** | 100.0% |
| **Total Distractors** | 520 | 369 | **520** | **100.0% Exact Match** |
| **Total Blank Lines** | 234 | 214 | **234** | **100.0% Exact Match** |
| **Total Lines Explained** | 1,349 | 1,349 | **1,349** | **100.0% Exact Match** |
| **Spanish Explanations** | — | — | **0** | **100% English** |
| **Duplicate Distractors** | — | — | **0** | **100% Distinct** |

## Source-by-Source Breakdown

| # | Source ID | Activity Name | Legacy Target | Final Distractors | Blank Lines | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| 1 | `664e23fa91363872f0ba32e6` | Pythagorean Theorem (Case 1) | 4 | **4** | 1 | ✓ Exact |
| 2 | `664e23fc91363872f0ba32e8` | Pythagorean Theorem (Case 2) | 4 | **4** | 1 | ✓ Exact |
| 3 | `664e23ff91363872f0ba32ee` | Seconds to Minutes Conversion | 5 | **5** | 2 | ✓ Exact |
| 4 | `664e240191363872f0ba32f0` | Converting Milliseconds to Hours-Minutes- and Seconds | 4 | **4** | 2 | ✓ Exact |
| 5 | `664e248491363872f0ba3318` | Determining the Maximum Rating for Each Soda in The Survey | 6 | **6** | 3 | ✓ Exact |
| 6 | `664e248d91363872f0ba331a` | Determining the Average Rating for Each Soda in The Survey | 5 | **5** | 4 | ✓ Exact |
| 7 | `664e24b791363872f0ba331c` | Determining the Average Ratings of each Respondent and Average Ratings Given to Each Soda in the Survey | 5 | **5** | 2 | ✓ Exact |
| 8 | `664e24ec91363872f0ba332c` | Vending Machine With Dollars and Quarters | 4 | **4** | 2 | ✓ Exact |
| 9 | `664e24ee91363872f0ba332e` | Vending Machine With Quarters-Dimes- and Nickels | 4 | **4** | 2 | ✓ Exact |
| 10 | `664e257991363872f0ba335c` | Updating Two-Dimensional List (Case 1) | 5 | **5** | 2 | ✓ Exact |
| 11 | `664e257c91363872f0ba335e` | Updating Two-Dimensional List (Case 2) | 6 | **6** | 2 | ✓ Exact |
| 12 | `664e257e91363872f0ba3360` | Updating Two-Dimensional List (Case 3) | 6 | **6** | 2 | ✓ Exact |
| 13 | `664e25c591363872f0ba3374` | Printing Common Elements in Two Lists | 3 | **3** | 2 | ✓ Exact |
| 14 | `664e25c791363872f0ba3376` | Printing the Total Number of Times Elements of One List Appear in Another List | 4 | **4** | 3 | ✓ Exact |
| 15 | `664e25cb91363872f0ba3378` | Creating a List that Contains the Numbers of Times Each Element of One List Appears in Another List | 4 | **4** | 2 | ✓ Exact |
| 16 | `664e25d391363872f0ba337f` | Concatenating Characters of Two Strings (Case 1) | 5 | **5** | 1 | ✓ Exact |
| 17 | `664e25d491363872f0ba3381` | Concatenating Characters of Two Strings (Case 2) | 4 | **4** | 2 | ✓ Exact |
| 18 | `664e26ed91363872f0ba33ae` | Printing Digits of an Integer from Right to Left | 3 | **3** | 1 | ✓ Exact |
| 19 | `664e26f191363872f0ba33b0` | The Digit Sum of an Integer | 5 | **5** | 2 | ✓ Exact |
| 20 | `664e270191363872f0ba33b2` | Reversing the Digits of an Integer | 4 | **4** | 2 | ✓ Exact |
| 21 | `664e273d91363872f0ba33c1` | Determining Whether One is a Teenager (Case 1)  | 2 | **2** | 4 | ✓ Exact |
| 22 | `664e274591363872f0ba33c3` | Determining Whether One is a Teenager (Case 2)  | 3 | **3** | 3 | ✓ Exact |
| 23 | `664e2a9091363872f0ba341a` | Counting the Number of Valid and Banned Product Codes (Case 1)  | 4 | **4** | 4 | ✓ Exact |
| 24 | `664e2aad91363872f0ba341c` | Counting the Number of Valid and Banned Product Codes (Case 2)  | 5 | **5** | 3 | ✓ Exact |
| 25 | `664e2c5391363872f0ba3442` | Printing A Sequence of Repeated Numbers (Case 1)  | 4 | **4** | 1 | ✓ Exact |
| 26 | `664e2c5591363872f0ba3444` | Printing A Sequence of Repeated Numbers (Case 2)  | 4 | **4** | 1 | ✓ Exact |
| 27 | `664e2c5791363872f0ba344a` | Calculating the Sum of the Values in the List | 4 | **4** | 3 | ✓ Exact |
| 28 | `664e2c5c91363872f0ba344c` | Calculating the Average of the Values in the List | 3 | **3** | 4 | ✓ Exact |
| 29 | `664e2c8891363872f0ba3464` | Printing A Right Triangle Star Pattern | 4 | **4** | 1 | ✓ Exact |
| 30 | `664e2c8991363872f0ba3466` | Printing an Inverted Right Triangle Star Pattern | 4 | **4** | 1 | ✓ Exact |
| 31 | `664e2d5591363872f0ba3479` | The Class for Representing a Point in the Euclidean Plane (Case 1) | 3 | **3** | 3 | ✓ Exact |
| 32 | `664e2d5991363872f0ba347b` | The Class for Representing a Point in the Euclidean Plane (Case 2) | 4 | **4** | 2 | ✓ Exact |
| 33 | `664e2d5d91363872f0ba3481` | Updating an Element in the List (Case 1)  | 3 | **3** | 1 | ✓ Exact |
| 34 | `664e2d5e91363872f0ba3483` | Updating an Element in the List (Case 2)  | 3 | **3** | 1 | ✓ Exact |
| 35 | `664e2d5f91363872f0ba3485` | Updating an Element in the List (Case 3)  | 4 | **4** | 1 | ✓ Exact |
| 36 | `664e2d6691363872f0ba3491` | Rotating the List Values to the Left by One Position | 5 | **5** | 2 | ✓ Exact |
| 37 | `664e2d6891363872f0ba3493` | Rotating the List Values to the Left by Two Position | 5 | **5** | 3 | ✓ Exact |
| 38 | `664e2d6f91363872f0ba3495` | Rotating the List Values to the Right by One Position | 5 | **5** | 2 | ✓ Exact |
| 39 | `664e2d7191363872f0ba3497` | Rotating the List Values to the Right by Two Position | 5 | **5** | 2 | ✓ Exact |
| 40 | `664e2e3f91363872f0ba34d2` | Repeating Characters of a String (Case 1) | 4 | **4** | 2 | ✓ Exact |
| 41 | `664e2e4191363872f0ba34d4` | Repeating Characters of a String (Case 2) | 5 | **5** | 2 | ✓ Exact |
| 42 | `664e2e4591363872f0ba34da` | Determining the Sign of an Integer | 3 | **3** | 1 | ✓ Exact |
| 43 | `664e2e4691363872f0ba34dc` | Determining Whether an Integer is Even or Odd | 6 | **6** | 1 | ✓ Exact |
| 44 | `664e2e4a91363872f0ba34e2` | Determining the Letter Grade Of a Student | 4 | **4** | 2 | ✓ Exact |
| 45 | `664e2e4c91363872f0ba34e4` | Converting the Letter Grade of a Student to It's Numeric Range | 4 | **4** | 2 | ✓ Exact |
| 46 | `664e2eeb91363872f0ba34f2` | Printing Sequence of Numbers with a Gap Between Adjacent Values (Case 1)  | 4 | **4** | 1 | ✓ Exact |
| 47 | `664e2eec91363872f0ba34f4` | Printing Sequence of Numbers with a Gap Between Adjacent Values (Case 2)  | 4 | **4** | 1 | ✓ Exact |
| 48 | `664e2fa291363872f0ba3518` | Printing Consecutive Numbers Within a Specified Range (Case 1)  | 4 | **4** | 1 | ✓ Exact |
| 49 | `664e2fa491363872f0ba351a` | Printing Consecutive Numbers Within a Specified Range (Case 2)  | 4 | **4** | 1 | ✓ Exact |
| 50 | `664e2fe691363872f0ba3532` | Determining When at Least One of the Three Boolean Variables is True | 4 | **4** | 1 | ✓ Exact |
| 51 | `664e2fe791363872f0ba3534` | Determining When at Least One of the Three Boolean Variables is False | 4 | **4** | 1 | ✓ Exact |
| 52 | `664e2fe991363872f0ba3536` | Determining When All Three Boolean Variables Are Equal | 4 | **4** | 1 | ✓ Exact |
| 53 | `664e3c2a91363872f0ba354b` | The Class for Representing a Bank Account (Case 1) | 4 | **4** | 3 | ✓ Exact |
| 54 | `664e3c3091363872f0ba354d` | The Class for Representing a Bank Account (Case 2) | 6 | **6** | 2 | ✓ Exact |
| 55 | `664e3c7891363872f0ba356a` | Reporting File Information (Case 1)  | 3 | **3** | 4 | ✓ Exact |
| 56 | `664e3c8791363872f0ba356c` | Reporting File Information (Case 2)  | 3 | **3** | 3 | ✓ Exact |
| 57 | `664e3c9f91363872f0ba3585` | Calculating the Winning Percentage of a Sports Team (Case 1) | 4 | **4** | 2 | ✓ Exact |
| 58 | `664e3ca191363872f0ba3587` | Calculating the Winning Percentage of a Sports Team (Case 2)  | 5 | **5** | 1 | ✓ Exact |
| 59 | `664e3ca391363872f0ba3589` | Calculating the Winning Percentage of a Sports Team (Case 3) | 4 | **4** | 2 | ✓ Exact |
| 60 | `664e3ca791363872f0ba3590` | Calculating the Average of Input Integers | 4 | **4** | 2 | ✓ Exact |
| 61 | `664e3ca991363872f0ba3592` | Calculating the Average of the Input Integers that are an Even Number | 3 | **3** | 3 | ✓ Exact |
| 62 | `664e3cac91363872f0ba3594` | Calculating the Average of Floating-Point Numbers | 5 | **5** | 2 | ✓ Exact |
| 63 | `664e3cf791363872f0ba35ab` | Reporting the Total Hours Each Employee Worked (Case 1)  | 4 | **4** | 4 | ✓ Exact |
| 64 | `664e3d1591363872f0ba35ad` | Reporting the Total Hours Each Employee Worked (Case 2)  | 4 | **4** | 4 | ✓ Exact |
| 65 | `664e40da91363872f0ba3604` | Concatenating Strings and Numbers (Case 1) | 4 | **4** | 2 | ✓ Exact |
| 66 | `664e40dc91363872f0ba3606` | Concatenating Strings and Numbers (Case 2) | 5 | **5** | 2 | ✓ Exact |
| 67 | `664e40dd91363872f0ba3608` | Concatenating Strings and Numbers (Case 3) | 4 | **4** | 2 | ✓ Exact |
| 68 | `664e41f891363872f0ba3682` | Creating a Dictionary of Student-Scores Pairs (Case 1)  | 4 | **4** | 4 | ✓ Exact |
| 69 | `664e421291363872f0ba3684` | Creating a Dictionary of Student-Scores Pairs (Case 2) | 5 | **5** | 3 | ✓ Exact |
| 70 | `664e422e91363872f0ba369a` | Determining When a Customer Could Rent a Car (Case 1) | 4 | **4** | 1 | ✓ Exact |
| 71 | `664e423091363872f0ba369c` | Determining When a Customer Could Rent a Car (Case 2) | 4 | **4** | 1 | ✓ Exact |
| 72 | `664e423191363872f0ba369e` | Determining When a Customer Could Rent a Car (Case 3) | 4 | **4** | 1 | ✓ Exact |
| 73 | `664e423491363872f0ba36a5` | Counting the Occurrences of One String in Another (Case 1) | 5 | **5** | 2 | ✓ Exact |
| 74 | `664e423691363872f0ba36a7` | Counting the Occurrences of One String in Another (Case 2) | 6 | **6** | 2 | ✓ Exact |
| 75 | `664e423b91363872f0ba36ad` | The Class for Representing a TV (Case 1) | 5 | **5** | 3 | ✓ Exact |
| 76 | `664e424391363872f0ba36af` | The Class for Representing a TV (Case 2) | 5 | **5** | 3 | ✓ Exact |
| 77 | `664e427291363872f0ba36c8` | Printing Consecutive Numbers Starting from Zero (Case 1)  | 4 | **4** | 1 | ✓ Exact |
| 78 | `664e427391363872f0ba36ca` | Printing Consecutive Numbers Starting from Zero (Case 2)  | 4 | **4** | 1 | ✓ Exact |
| 79 | `664e427691363872f0ba36d0` | Determining the Smallest of the Three Integers | 4 | **4** | 2 | ✓ Exact |
| 80 | `664e427891363872f0ba36d2` | Determining the Largest of the Three Integers | 4 | **4** | 1 | ✓ Exact |
| 81 | `664e429891363872f0ba36e0` | Finding the Smallest Divisor of a Positive Number | 4 | **4** | 1 | ✓ Exact |
| 82 | `664e42a091363872f0ba36e2` | Finding the Largest Divisor of a Positive Number | 4 | **4** | 2 | ✓ Exact |
| 83 | `664e42af91363872f0ba36ed` | Printing Table of Medal Counts with Row Totals | 5 | **5** | 4 | ✓ Exact |
| 84 | `664e42dc91363872f0ba36ef` | Printing Table of Medal Winner Counts with Row and Column Totals | 5 | **5** | 2 | ✓ Exact |
| 85 | `664e43e491363872f0ba3717` | Receiving Input Integers Until a Certain Condition is Met (Case 1) | 4 | **4** | 1 | ✓ Exact |
| 86 | `664e43e591363872f0ba3719` | Receiving Input Integers Until a Certain Condition is Met (Case 2) | 4 | **4** | 1 | ✓ Exact |
| 87 | `664e43e791363872f0ba371b` | Receiving Input Integers Until a Certain Condition is Met (Case 3) | 4 | **4** | 1 | ✓ Exact |
| 88 | `664e43e991363872f0ba371d` | Receiving Input Integers Until a Certain Condition is Met (Case 4) | 4 | **4** | 1 | ✓ Exact |
| 89 | `664e447191363872f0ba3732` | Warning the User about the Changes in the Temperature | 4 | **4** | 1 | ✓ Exact |
| 90 | `664e447391363872f0ba3734` | Warning the User about the Changes in the Temperature and Humidity | 4 | **4** | 1 | ✓ Exact |
| 91 | `664e448691363872f0ba3745` | Calculating Body Mass Index (BMI) | 4 | **4** | 1 | ✓ Exact |
| 92 | `664e448891363872f0ba3747` | Calculating and Rounding Up Body Mass Index (BMI) To the Nearest Integer | 4 | **4** | 1 | ✓ Exact |
| 93 | `664e44c291363872f0ba3755` | Add Values to an Empty List (Case 1) | 4 | **4** | 1 | ✓ Exact |
| 94 | `664e44c491363872f0ba3757` | Add Values to an Empty List (Case 2) | 4 | **4** | 1 | ✓ Exact |
| 95 | `664e44cd91363872f0ba3762` | Finding Adjacent Duplicates in a Sequence of Numbers | 5 | **5** | 2 | ✓ Exact |
| 96 | `664e44cf91363872f0ba3764` | Finding Adjacent Consecutive Numbers in a Sequence of Integers | 4 | **4** | 1 | ✓ Exact |
| 97 | `664e44d191363872f0ba3766` | Finding Adjacent Numbers in Ascending Order in a Sequence of Numbers | 5 | **5** | 2 | ✓ Exact |
| 98 | `664e44d691363872f0ba376d` | Determining When a Student Fails a Course (Case 1) | 4 | **4** | 1 | ✓ Exact |
| 99 | `664e44d891363872f0ba376f` | Determining When a Student Fails a Course (Case 2) | 3 | **3** | 1 | ✓ Exact |
| 100 | `664e44d991363872f0ba3771` | Determining When a Student Fails a Course (Case 3) | 4 | **4** | 1 | ✓ Exact |
| 101 | `664e4bb091363872f0ba37df` | The Class for Representing a Loan (Case 1) | 6 | **6** | 4 | ✓ Exact |
| 102 | `664e4bfc91363872f0ba37e1` | The Class for Representing a Loan (Case 2) | 4 | **4** | 3 | ✓ Exact |
| 103 | `664e4c1c91363872f0ba37f1` | Determining the Weather Condition (Case 1) | 4 | **4** | 1 | ✓ Exact |
| 104 | `664e4c2091363872f0ba37f3` | Determining the Weather Condition (Case 2) | 4 | **4** | 1 | ✓ Exact |
| 105 | `664e4c2191363872f0ba37f5` | Determining the Weather Condition (Case 3) | 4 | **4** | 1 | ✓ Exact |
| 106 | `664e4c2391363872f0ba37f7` | Determining the Weather Condition (Case 4) | 4 | **4** | 1 | ✓ Exact |
| 107 | `664e4c2791363872f0ba37ff` | Printing the Squares of Numbers Within a Specified Range (Case 1)  | 4 | **4** | 1 | ✓ Exact |
| 108 | `664e4c2991363872f0ba3801` | Printing the Squares of Numbers Within a Specified Range (Case 2)  | 4 | **4** | 1 | ✓ Exact |
| 109 | `664e4c2b91363872f0ba3803` | Printing the Squares of Numbers Within a Specified Range (Case 3)  | 5 | **5** | 1 | ✓ Exact |
| 110 | `664e4c2e91363872f0ba380a` | Finding the Number of Days Above the Average Temperature | 3 | **3** | 4 | ✓ Exact |
| 111 | `664e4c3d91363872f0ba380c` | Displaying the Days That are Above 32 Degrees Fahrenheit | 4 | **4** | 4 | ✓ Exact |
| 112 | `664e4dc191363872f0ba384d` | Modifying a List (Case 1) | 6 | **6** | 2 | ✓ Exact |
| 113 | `664e4dc391363872f0ba384f` | Modifying a List (Case 2) | 3 | **3** | 3 | ✓ Exact |
| 114 | `664e4e3a91363872f0ba3881` | Determining When to Buy a New Phone (Case 1) | 4 | **4** | 1 | ✓ Exact |
| 115 | `664e4e3c91363872f0ba3883` | Determining When to Buy a New Phone (Case 2) | 4 | **4** | 1 | ✓ Exact |
| 116 | `664e500191363872f0ba38c4` | Creating a Dictionary of Character-Count Pairs | 4 | **4** | 3 | ✓ Exact |
| 117 | `664e500691363872f0ba38c6` | Creating a Dictionary of Character-Words Pairs | 4 | **4** | 2 | ✓ Exact |
| 118 | `664e501e91363872f0ba38d9` | Celsius To Fahrenheit Conversion | 4 | **4** | 2 | ✓ Exact |
| 119 | `664e502091363872f0ba38db` | Fahrenheit to Celsius Conversion | 6 | **6** | 2 | ✓ Exact |
| 120 | `664e504491363872f0ba38ec` | Finding the Maximum Value in a List | 5 | **5** | 2 | ✓ Exact |
| 121 | `664e504691363872f0ba38ee` | Finding the Minimum Value in a List | 5 | **5** | 2 | ✓ Exact |
| 122 | `664e50cc91363872f0ba3909` | Calculating the Employee's Wage Based on the Hours That the Employee Has Worked and an Hourly Pay Rate | 4 | **4** | 1 | ✓ Exact |
| 123 | `664e50ce91363872f0ba390b` | Calculating the Wage of an Employee at the Customer Service Call Center | 4 | **4** | 2 | ✓ Exact |
