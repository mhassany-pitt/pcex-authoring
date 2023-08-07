public class ClimbStairs {
  
  public int climbStairs(int n) {
    if (n == 1)
      return 1;

    if (n == 2)
      return 2;

    int[] a = new int[n];
    a[0] = 1;
    a[1] = 2;

    for (int i = 2; i < n; i++) {
      a[i] = a[i - 1] + a[i - 2];
    }

    return a[n - 1];
  }
}
/*
 * You are climbing a staircase. It takes n steps to reach the top.
 * 
 * Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?
 */
