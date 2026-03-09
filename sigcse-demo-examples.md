# Worked Example Authoring Tool -- WEAT
Please open the [WEAT authoring tool](http://adapt2.sis.pitt.edu/pcex-authoring/#/hub) and log in using your demo account. 

You can choose any of the following examples to explore the features of the WEAT. You're welcome to use any other example of your choice. 

### 1. Introduction to Variables and Conditions
Write a program that takes an integer input from the user and checks if it is even or odd. The program should output "Even" if the number is even and "Odd" if it is odd.
```python
# Prompt the user for an integer input
number = int(input("Enter an integer: "))

# Check if the number is even or odd
if number % 2 == 0:
    print("Even")
else:
    print("Odd")
```

### 2. Looping and Lists
Create a program that asks the user for five numbers, stores them in a list, and then calculates and prints their sum.
```python
numbers = []

# Collecting five numbers
for i in range(5):
    num = float(input(f"Enter number {i+1}: "))
    numbers.append(num)

# Calculating the sum
total_sum = sum(numbers)

# Printing the sum
print("The total sum is:", total_sum)
```

### 3. Functions and String Manipulation
Write a program that defines a function `reverse_string(s)` which takes a string `s` as input and returns it in reversed order. The program should prompt the user for a string, call this function, and display the reversed string.
```python
def reverse_string(s):
    return s[::-1]

# Get a string from user input
user_input = input("Enter a string: ")

# Reverse the string using the defined function
reversed_string = reverse_string(user_input)

# Output the reversed string
print("Reversed string:", reversed_string)
```

### 4. Dictionaries and Input Processing
Write a program to count the occurrences of each word in a user-entered sentence and display the word counts.
```python
# Get a sentence from the user
sentence = input("Enter a sentence: ")

# Split the sentence into words
words = sentence.split()

# Initialize an empty dictionary to count words
word_count = {}

# Count each occurrence of each word
for word in words:
    if word in word_count:
        word_count[word] += 1
    else:
        word_count[word] = 1

# Print the word counts
print("Word counts:", word_count)
```

### 5. Basic File I/O
Create a program that prompts the user for a string and writes it to a file named `output.txt`. Then, read the contents of the file and display them on the screen.
```python
# Get input from the user
data = input("Enter a string to write to a file: ")

# Open the file in write mode and write the string
with open("output.txt", "w") as file:
    file.write(data)

# Open the file again in read mode and display its contents
with open("output.txt", "r") as file:
    content = file.read()

print("Content of the output.txt file:", content)
```

### 6. Nested Loops and 2D Lists
Write a program to create a 3x3 matrix filled with integers from 1 to 9. Display the matrix and then calculate and print the sum of its diagonal elements.
```python
# Initialize a 3x3 matrix
matrix = [[1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]]

# Display the matrix
print("Matrix:")
for row in matrix:
    print(row)

# Calculate the sum of diagonal elements
diagonal_sum = 0
for i in range(3):
    diagonal_sum += matrix[i][i]

# Output the sum of the diagonals
print("Sum of diagonal elements:", diagonal_sum)
```

### 7. Recursion
Implement a recursive function `factorial(n)` that computes the factorial of a given non-negative integer `n`. Prompt the user to enter a non-negative integer and display the factorial.
```python
def factorial(n):
    if n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n - 1)

# Get input from user
n = int(input("Enter a non-negative integer: "))

# Ensure the input is non-negative
if n < 0:
    print("Factorial is not defined for negative numbers.")
else:
    # Calculate factorial using the recursive function
    result = factorial(n)
    print(f"Factorial of {n} is: {result}")
```

### 8. Tuple Operations
Write a program that creates a tuple with the first five odd numbers, then performs and displays the results for the following operations: count the number of times '3' appears, find the index of '5', and print the length of the tuple.
```python
# Define a tuple with the first five odd numbers
odd_numbers = (1, 3, 5, 7, 9)

# Perform operations on the tuple
count_of_three = odd_numbers.count(3)
index_of_five = odd_numbers.index(5)
length_of_tuple = len(odd_numbers)

# Display the results
print("Number of times 3 appears:", count_of_three)
print("Index of 5:", index_of_five)
print("Length of the tuple:", length_of_tuple)
```

### 9. Class and Object Basics
Define a simple `Rectangle` class with attributes `length` and `width`. Include a method `area()` that calculates and returns the rectangle's area. Create a rectangle object with user-provided dimensions and display its area.
```python
class Rectangle:
    def __init__(self, length, width):
        self.length = length
        self.width = width
        
    def area(self):
        return self.length * self.width

# Get dimensions from the user
length = float(input("Enter the rectangle's length: "))
width = float(input("Enter the rectangle's width: "))

# Create a Rectangle object
rectangle = Rectangle(length, width)

# Calculate and display the area of the rectangle
print("Area of the rectangle is:", rectangle.area())
```

### 10. Set Operations
Write a program that takes two lists of integers from the user, converts them into sets, and prints the union and intersection of the sets.
```python
# Get two lists of integers from the user
list1 = list(map(int, input("Enter the first list of integers: ").split()))
list2 = list(map(int, input("Enter the second list of integers: ").split()))

# Convert lists to sets
set1 = set(list1)
set2 = set(list2)

# Perform set operations: union and intersection
union_set = set1.union(set2)
intersection_set = set1.intersection(set2)

# Display results
print("Union:", union_set)
print("Intersection:", intersection_set)
```

### 11. Exception Handling
Write a program that prompts the user to divide two numbers and gracefully handles a division-by-zero error with a helpful message.
```python
try:
    # Asking for user input
    num = float(input("Enter the numerator: "))
    denom = float(input("Enter the denominator: "))

    # Perform division
    result = num / denom

    # Display the result
    print("Result:", result)

except ZeroDivisionError:
    print("Error: Cannot divide by zero. Please enter a non-zero denominator.")
except ValueError:
    print("Error: Invalid input. Please enter numerical values.")
```

### 12. List Comprehensions
Create a program that generates a list of squares of even numbers from 1 to 20 using a list comprehension, and then prints this list.
```python
# Generate squares of even numbers from 1 to 20
squares_of_even = [x**2 for x in range(1, 21) if x % 2 == 0]

# Display the list of squares
print("Squares of even numbers from 1 to 20:", squares_of_even)
```

### 13. Lambda Functions
Write a program that uses a lambda function to sort a list of tuples based on the second element of each tuple, and then prints the sorted list.
```python
# Define a list of tuples
list_of_tuples = [(1, 3), (3, 2), (2, 5), (5, 1), (4, 4)]

# Use a lambda function to sort the list based on the second element
sorted_list = sorted(list_of_tuples, key=lambda x: x[1])

# Display the sorted list
print("Sorted list based on the second element:", sorted_list)
```

### 14. Bubble Sort Algorithm
Implement a simple Bubble Sort algorithm to sort a list of integers provided by the user, and print the sorted list.
```python
# Get a list of integers from the user
user_list = list(map(int, input("Enter a list of integers separated by spaces: ").split()))

# Bubble Sort algorithm
n = len(user_list)
for i in range(n):
    for j in range(0, n - i - 1):
        if user_list[j] > user_list[j + 1]:
            user_list[j], user_list[j + 1] = user_list[j + 1], user_list[j]

# Display the sorted list
print("Sorted list:", user_list)
```

### 15. File Manipulation and String Processing
Write a program that reads a file called `input.txt`, counts the number of words in the file, and prints the word count.
```python
try:
    # Open the file in read mode
    with open("input.txt", "r") as file:
        # Read the file's content
        contents = file.read()

    # Count the number of words
    words = contents.split()
    word_count = len(words)

    # Display the word count
    print("The file contains", word_count, "words.")

except FileNotFoundError:
    print("Error: The file 'input.txt' was not found.")
```
