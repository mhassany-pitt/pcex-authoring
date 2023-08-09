export const PROBLEMS = [
  {
    title: 'Initials',
    description:
      'Construct a program that prints the initials of the name "John Smith".',
    inclusion: 'Also include lines that perform substring operations.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class Initials
{
  public static void main(String[] args)
  {
      String fullName = "John Smith";
      String firstInitial = fullName.substring(0, 1);
      String lastInitial = fullName.substring(5, 6);
      String initials = firstInitial + lastInitial;
      System.out.println(initials);
  }
}`,
  },
  {
    title: 'JArrayIncrementElements',
    description:
      'Construct a program that increments all elements of the array by 1.',
    inclusion: 'Also include lines that perform array initialization.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class JArrayIncrementElements {
  public static void main(String[] args) {
    int[] arr = { 1, 2, 3 };
    for (int i = 0; i < arr.length; i++) {
      arr[i] += 1;
    }
  }
}`,
  },
  {
    title: 'JArrayMax',
    description: 'Write a program that finds the maximum value in an array.',
    inclusion: 'Also include lines that perform array initialization.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class JArrayMax {
  public static void main(String[] args) {
    int[] values = { 5, -4, 78, 95, 12 };
    int maxValue = values[0];
    for (int i = 1; i < values.length; i++) {
      if (values[i] > maxValue) {
        maxValue = values[i];
      }
    }
    System.out.println("Maximum value: " + maxValue);
  }
}`,
  },
  {
    title: 'JPrintDigitsReverse',
    description:
      'Construct a program that prints the digits of an integer from right to left.',
    inclusion: 'Also include lines that perform data initialization.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class JPrintDigitsReverse {
  public static void main(String[] args) {
    int num = 1234;
    do {
      System.out.println(num % 10);
      num = num / 10;
    } while (num > 0);
  }
}`,
  },
  {
    title: 'JSmallestDivisor',
    description:
      'Construct a program that finds the smallest divisor (other than 1) of a positive number. For example, the smallest divisor of 4 is 2.',
    inclusion: 'Also include lines that perform data initialization.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class JSmallestDivisor {
  public static void main(String[] args) {
    int num = 15;
    int divisor = 2;
    while (num % divisor != 0) {
      divisor += 1;
    }
    System.out.println("The smallest divisor of " + num + " is " + divisor);
  }
}`,
  },
  {
    title: 'PointTester',
    description: `Construct a class that represents a point in the Euclidean plane. The class should contain data that represents the point’s integer coordinates (x,y). The class should also include getter and setter methods for accessing and changing the point's coordinates and a method to translate the point, i.e.,  shift the point's location by the specified amount.

The class PointTester instantiates an object from this class, sets the (x,y) coordinates of the point, and translates the point by the specified amount.`,
    inclusion: 'Also include lines that perform object instantiation.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class PointTester {
  public static void main(String[] args) {
    Point point = new Point();
    point.setX(7);
    point.setY(2);
    point.translate(11, 6);
    System.out.println("The point's coordinates: (" + point.getX() + ", " + point.getY() + ")") ;
  }
}
class Point {
  private int x;
  private int y;
  public void translate(int dx, int dy) {
    x += dx;
    y += dy;
  }
  public void setX(int newX) {
    x = newX;
  }
  public int getX() {
    return x;
  }
  public void setY(int newY) {
    y = newY;
  }
  public int getY() {
    return y;
  }
}`,
  },
  {
    title: 'JSearchArrayValues',
    description:
      'Construct a program that has a method that receives two arrays and prints the values in the 2nd array that exist in the 1st array.',
    inclusion: 'Also include lines that contain user-defined methods.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class JSearchArrayValues {
  public static void searchArrays(double[] lst1, double[] lst2) {
    for (double val2 : lst2) {
      for (double val1 : lst1) {
        if (val1 == val2) {
          System.out.println(val2 + " exists in both array.");
        }
      }
    }
  }
  public static void main(String[] args) {
    double[] values1 = { 2.0, 11, 4, 5, 3, 3.5, 4, 10, 16, 3 };
    double[] values2 = { 7, 11, 3, 1.0 };
    searchArrays(values1, values2);
  }
}`,
  },
  {
    title: 'JAdjacentDuplicates',
    description: `Construct a program that checks whether a sequence of numbers, entered one at a time, contains adjacent duplicates. The user enters -1 to indicate the end of the input.
For example, 4 is a duplicate in the sequence of numbers 1, 3, 4, 4, -1.`,
    inclusion: 'Also include lines that perform I/O and resource management.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `import java.util.Scanner;
public class JAdjacentDuplicates {
  public static void main(String[] args) {
    System.out.println("Enter the numbers separated by spaces or new line (enter -1 to quit): ");
    Scanner scan = new Scanner(System.in);
    double num = scan.nextDouble();
    while (num != -1) {
      double previous = num;
      num = scan.nextDouble();
      if (num == previous) {
        System.out.println("Duplicate input for number: " + num);
      }
    }
    scan.close();
  }
}`,
  },
  {
    title: 'QuickSort',
    description:
      'Given a list of unsorted game cards, sort them in ascending order using the quick sort algorithm.',
    inclusion:
      'Also include lines that perform object instantiation, array initialization, and contain user-defined methods.',
    exclusion:
      'But ignore main class and method definitions, common import statements and java comments.',
    source: `public class QuickSort
{
  public int partition(int arr[], int low, int high)
  {
    int pivot = arr[high];
    int i = (low-1);
    for (int j=low; j<high;j++)
    {
      if (arr[j] < pivot)
      {
        i++;
        int temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
    }
    int temp = arr[i+1];
    arr[i+1] = arr[high];
    arr[high] = temp;
    return i+1;
  }
  public void sort(int arr[], int low, int high)
  {
    if (low < high)
    {
      int pi = partition(arr, low, high);
      sort(arr, low, pi-1);
      sort(arr, pi+1, high);
    }
  }
  public static void printArray(int arr[])
  {
    int n = arr.length;
    for (int i=0; i<n;i++)
      System.out.print(arr[i]+" ");
    System.out.println();
  }
  public static void main(String args[])
  {
    int arr[] = {10, 7, 8, 9, 1, 5};
    int n = arr.length;
    QuickSort ob = new QuickSort();
    ob.sort(arr, 0, n-1);
    System.out.println("sorted array");
    printArray(arr);
  }
}`,
  },
];
