# 🧪 Strict LLM Distractor Backfill Simulation Report

This report simulates backfilling distractors **strictly using LLM-generated options** (excluding human-only distractors):
1. **Priority 1**: Post-augmentation LLM-generated distractors from sources with $> 3$ options.
2. **Priority 2**: LLM-generated distractors that also matched a human-authored legacy distractor.

## 1. Overall Summary

| Metric | Count | Percentage |
| :--- | :---: | :---: |
| **Total Sources** | 123 | 100% |
| **Total Distractors Needed for Parity** | 152 | 100% |
| **Distractors Filled (Priority 1 + Priority 2)** | **100** | **65.8%** |
| **Distractors Left to Fill** | **52** | **34.2%** |
| **Sources Meeting Legacy Parity (Target Reached)** | **76** | **61.8%** |
| **Sources Still Needing Distractors** | **47** | **38.2%** |

## 2. Breakdown of Sources with Remaining Deficits

These 47 sources cannot be fully satisfied from existing post-augmentation LLM pools because they had only 1 blank line (generating exactly 3 LLM distractors) and legacy had 4–6 human distractors.

| # | Source ID | Activity Name | Blanks | Legacy | Server | Needed | Backfilled | Left to Fill |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | `664e23fa91363872f0ba32e6` | Pythagorean Theorem (Case 1) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 2 | `664e23fc91363872f0ba32e8` | Pythagorean Theorem (Case 2) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 3 | `664e25d391363872f0ba337f` | Concatenating Characters of Two Strings (Case 1) | 1 | 5 | 3 | +2 | 0 | **+2** |
| 4 | `664e2c5391363872f0ba3442` | Printing A Sequence of Repeated Numbers (Case 1)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 5 | `664e2c5591363872f0ba3444` | Printing A Sequence of Repeated Numbers (Case 2)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 6 | `664e2c8891363872f0ba3464` | Printing A Right Triangle Star Pattern | 1 | 4 | 3 | +1 | 0 | **+1** |
| 7 | `664e2c8991363872f0ba3466` | Printing an Inverted Right Triangle Star Pattern | 1 | 4 | 3 | +1 | 0 | **+1** |
| 8 | `664e2d5f91363872f0ba3485` | Updating an Element in the List (Case 3)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 9 | `664e2e4691363872f0ba34dc` | Determining Whether an Integer is Even or Odd | 1 | 6 | 3 | +3 | 0 | **+3** |
| 10 | `664e2eeb91363872f0ba34f2` | Printing Sequence of Numbers with a Gap Between Adjacent Values (Case 1)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 11 | `664e2eec91363872f0ba34f4` | Printing Sequence of Numbers with a Gap Between Adjacent Values (Case 2)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 12 | `664e2fa291363872f0ba3518` | Printing Consecutive Numbers Within a Specified Range (Case 1)  | 2 | 4 | 3 | +1 | 0 | **+1** |
| 13 | `664e2fa491363872f0ba351a` | Printing Consecutive Numbers Within a Specified Range (Case 2)  | 2 | 4 | 3 | +1 | 0 | **+1** |
| 14 | `664e2fe691363872f0ba3532` | Determining When at Least One of the Three Boolean Variables is True | 1 | 4 | 3 | +1 | 0 | **+1** |
| 15 | `664e2fe791363872f0ba3534` | Determining When at Least One of the Three Boolean Variables is False | 2 | 4 | 3 | +1 | 0 | **+1** |
| 16 | `664e2fe991363872f0ba3536` | Determining When All Three Boolean Variables Are Equal | 1 | 4 | 3 | +1 | 0 | **+1** |
| 17 | `664e3ca191363872f0ba3587` | Calculating the Winning Percentage of a Sports Team (Case 2)  | 1 | 5 | 3 | +2 | 0 | **+2** |
| 18 | `664e422e91363872f0ba369a` | Determining When a Customer Could Rent a Car (Case 1) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 19 | `664e423091363872f0ba369c` | Determining When a Customer Could Rent a Car (Case 2) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 20 | `664e423191363872f0ba369e` | Determining When a Customer Could Rent a Car (Case 3) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 21 | `664e427291363872f0ba36c8` | Printing Consecutive Numbers Starting from Zero (Case 1)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 22 | `664e427391363872f0ba36ca` | Printing Consecutive Numbers Starting from Zero (Case 2)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 23 | `664e427891363872f0ba36d2` | Determining the Largest of the Three Integers | 1 | 4 | 3 | +1 | 0 | **+1** |
| 24 | `664e429891363872f0ba36e0` | Finding the Smallest Divisor of a Positive Number | 1 | 4 | 3 | +1 | 0 | **+1** |
| 25 | `664e43e491363872f0ba3717` | Receiving Input Integers Until a Certain Condition is Met (Case 1) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 26 | `664e43e591363872f0ba3719` | Receiving Input Integers Until a Certain Condition is Met (Case 2) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 27 | `664e43e791363872f0ba371b` | Receiving Input Integers Until a Certain Condition is Met (Case 3) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 28 | `664e43e991363872f0ba371d` | Receiving Input Integers Until a Certain Condition is Met (Case 4) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 29 | `664e447191363872f0ba3732` | Warning the User about the Changes in the Temperature | 1 | 4 | 3 | +1 | 0 | **+1** |
| 30 | `664e447391363872f0ba3734` | Warning the User about the Changes in the Temperature and Humidity | 1 | 4 | 3 | +1 | 0 | **+1** |
| 31 | `664e448691363872f0ba3745` | Calculating Body Mass Index (BMI) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 32 | `664e448891363872f0ba3747` | Calculating and Rounding Up Body Mass Index (BMI) To the Nearest Integer | 1 | 4 | 3 | +1 | 0 | **+1** |
| 33 | `664e44c291363872f0ba3755` | Add Values to an Empty List (Case 1) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 34 | `664e44c491363872f0ba3757` | Add Values to an Empty List (Case 2) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 35 | `664e44cf91363872f0ba3764` | Finding Adjacent Consecutive Numbers in a Sequence of Integers | 1 | 4 | 3 | +1 | 0 | **+1** |
| 36 | `664e44d691363872f0ba376d` | Determining When a Student Fails a Course (Case 1) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 37 | `664e44d991363872f0ba3771` | Determining When a Student Fails a Course (Case 3) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 38 | `664e4c1c91363872f0ba37f1` | Determining the Weather Condition (Case 1) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 39 | `664e4c2091363872f0ba37f3` | Determining the Weather Condition (Case 2) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 40 | `664e4c2191363872f0ba37f5` | Determining the Weather Condition (Case 3) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 41 | `664e4c2391363872f0ba37f7` | Determining the Weather Condition (Case 4) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 42 | `664e4c2791363872f0ba37ff` | Printing the Squares of Numbers Within a Specified Range (Case 1)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 43 | `664e4c2991363872f0ba3801` | Printing the Squares of Numbers Within a Specified Range (Case 2)  | 1 | 4 | 3 | +1 | 0 | **+1** |
| 44 | `664e4c2b91363872f0ba3803` | Printing the Squares of Numbers Within a Specified Range (Case 3)  | 1 | 5 | 3 | +2 | 0 | **+2** |
| 45 | `664e4e3a91363872f0ba3881` | Determining When to Buy a New Phone (Case 1) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 46 | `664e4e3c91363872f0ba3883` | Determining When to Buy a New Phone (Case 2) | 1 | 4 | 3 | +1 | 0 | **+1** |
| 47 | `664e50cc91363872f0ba3909` | Calculating the Employee's Wage Based on the Hours That the Employee Has Worked and an Hourly Pay Rate | 1 | 4 | 3 | +1 | 0 | **+1** |
