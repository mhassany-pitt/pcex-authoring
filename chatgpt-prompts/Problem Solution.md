# Problem Solution

```java
import java.util.*;
import java.lang.*;
import java.io.*;
 
public class Codechef {
  public static void main(String[] args) throws java.lang.Exception {
    Scanner input = new Scanner(System.in);
    int numOfTestCases = input.nextInt();
    while (numOfTestCases > 0) {
      int income = input.nextInt();
      if (income > 100)
        System.out.println(income - 10);
      else System.out.println(income);
      numOfTestCases--;
    }
  }
}
```