# LeetCode 动态规划精通篇：从状态转移到最优解

本书系统讲解动态规划的核心思想与各类变体，包括记忆化搜索、基础 DP、背包问题、状态机 DP、序列 DP、区间 DP、博弈 DP、状态压缩 DP、数位 DP 与树形 DP。每个主题先讲解状态定义与转移方程的设计方法，再通过精选 LeetCode 题目进行实战训练，帮助读者彻底征服动态规划。

- [序言](preface.md)

---

### 第一部分：动态规划基础

1. [动态规划是什么](dp-basics/what-is-dp.md)
2. [重叠子问题与最优子结构](dp-basics/overlapping-subproblems.md)
3. [状态定义的艺术](dp-basics/state-definition.md)
4. [状态转移方程的推导](dp-basics/state-transition.md)
5. [边界条件与初始化](dp-basics/boundary-conditions.md)
6. [计算顺序与空间优化](dp-basics/computation-order.md)

---

### 第二部分：记忆化搜索与递推

7. [从暴力递归到记忆化搜索](memoization/recursion-to-memoization.md)
8. [从记忆化搜索到递推](memoization/memoization-to-tabulation.md)
9. [两种方法的选择与权衡](memoization/choice-and-tradeoff.md)
10. [实战：斐波那契数列（三种写法对比）](memoization/practice-fibonacci.md)
11. [实战：爬楼梯](memoization/practice-climbing-stairs.md)
12. [实战：最小路径和（两种方法）](memoization/practice-min-path-sum.md)
13. [实战：三角形最小路径和](memoization/practice-triangle.md)

---

### 第三部分：线性 DP 基础

14. [线性 DP 概述](linear-dp/linear-dp-overview.md)
15. [实战：打家劫舍](linear-dp/practice-house-robber.md)
16. [实战：打家劫舍 II](linear-dp/practice-house-robber-ii.md)
17. [实战：最大子数组和](linear-dp/practice-max-subarray.md)
18. [实战：最大正方形](linear-dp/practice-maximal-square.md)
19. [实战：不同路径](linear-dp/practice-unique-paths.md)
20. [实战：不同路径 II](linear-dp/practice-unique-paths-ii.md)
21. [实战：解码方法](linear-dp/practice-decode-ways.md)
22. [实战：不同的二叉搜索树](linear-dp/practice-unique-bst.md)
23. [实战：整数拆分](linear-dp/practice-integer-break.md)
24. [实战：完全平方数](linear-dp/practice-perfect-squares.md)
25. [实战：单词拆分](linear-dp/practice-word-break.md)

---

### 第四部分：背包问题专题

26. [01 背包问题详解](knapsack/01-knapsack.md)
27. [完全背包问题详解](knapsack/unbounded-knapsack.md)
28. [多重背包与混合背包](knapsack/multiple-knapsack.md)
29. [背包问题的空间优化](knapsack/space-optimization.md)
30. [实战：分割等和子集](knapsack/practice-partition-equal-subset.md)
31. [实战：目标和](knapsack/practice-target-sum.md)
32. [实战：零钱兑换](knapsack/practice-coin-change.md)
33. [实战：零钱兑换 II](knapsack/practice-coin-change-ii.md)
34. [实战：一和零](knapsack/practice-ones-and-zeroes.md)
35. [实战：最后一块石头的重量 II](knapsack/practice-last-stone-weight-ii.md)
36. [实战：盈利计划](knapsack/practice-profitable-schemes.md)

---

### 第五部分：状态机 DP

37. [状态机 DP 概述](state-machine/state-machine-overview.md)
38. [状态机模型的建立](state-machine/state-machine-modeling.md)
39. [实战：买卖股票的最佳时机](state-machine/practice-stock-i.md)
40. [实战：买卖股票的最佳时机 II](state-machine/practice-stock-ii.md)
41. [实战：买卖股票的最佳时机 III](state-machine/practice-stock-iii.md)
42. [实战：买卖股票的最佳时机 IV](state-machine/practice-stock-iv.md)
43. [实战：买卖股票含冷冻期](state-machine/practice-stock-cooldown.md)
44. [实战：买卖股票含手续费](state-machine/practice-stock-fee.md)
45. [实战：买卖股票系列总结](state-machine/stock-series-summary.md)

---

### 第六部分：序列型 DP

46. [序列 DP 概述](sequence-dp/sequence-dp-overview.md)
47. [最长递增子序列模型](sequence-dp/lis-model.md)
48. [最长公共子序列模型](sequence-dp/lcs-model.md)
49. [实战：最长递增子序列](sequence-dp/practice-lis.md)
50. [实战：最长递增子序列的个数](sequence-dp/practice-number-of-lis.md)
51. [实战：最长公共子序列](sequence-dp/practice-lcs.md)
52. [实战：编辑距离](sequence-dp/practice-edit-distance.md)
53. [实战：不同的子序列](sequence-dp/practice-distinct-subsequences.md)
54. [实战：最长重复子数组](sequence-dp/practice-longest-repeated-subarray.md)
55. [实战：最大子数组乘积](sequence-dp/practice-max-product-subarray.md)
56. [实战：最长数字串链](sequence-dp/practice-longest-string-chain.md)
57. [实战：俄罗斯套娃信封](sequence-dp/practice-russian-doll.md)
58. [实战：删除与获得点数](sequence-dp/practice-delete-and-earn.md)
59. [实战：交错字符串](sequence-dp/practice-interleaving-string.md)

---

### 第七部分：区间型 DP

60. [区间 DP 概述](interval-dp/interval-dp-overview.md)
61. [区间 DP 的枚举方式](interval-dp/enumeration-methods.md)
62. [实战：最长回文子串](interval-dp/practice-longest-palindrome.md)
63. [实战：回文子串计数](interval-dp/practice-palindromic-substrings.md)
64. [实战：最长回文子序列](interval-dp/practice-longest-palindrome-subseq.md)
65. [实战：戳气球](interval-dp/practice-burst-balloons.md)
66. [实战：合并石头的最低成本](interval-dp/practice-merge-stones.md)
67. [实战：移除盒子](interval-dp/practice-remove-boxes.md)
68. [实战：奇怪的打印机](interval-dp/practice-strange-printer.md)
69. [实战：分割回文串 II](interval-dp/practice-palindrome-partition-ii.md)
70. [实战：矩阵链乘法](interval-dp/practice-matrix-chain.md)

---

### 第八部分：博弈型 DP

71. [博弈 DP 概述](game-dp/game-dp-overview.md)
72. [极小化极大思想](game-dp/minimax.md)
73. [实战：预测赢家](game-dp/practice-predict-winner.md)
74. [实战：石子游戏](game-dp/practice-stone-game.md)
75. [实战：石子游戏 II](game-dp/practice-stone-game-ii.md)
76. [实战：石子游戏 III](game-dp/practice-stone-game-iii.md)
77. [实战：翻转游戏 II](game-dp/practice-flip-game-ii.md)
78. [实战：猜数字大小 II](game-dp/practice-guess-number-ii.md)
79. [实战：我能赢吗](game-dp/practice-can-i-win.md)

---

### 第九部分：状态压缩 DP

80. [状态压缩 DP 概述](state-compression/state-compression-overview.md)
81. [位运算基础回顾](state-compression/bit-manipulation-review.md)
82. [状态压缩的设计技巧](state-compression/design-techniques.md)
83. [实战：旅行商问题](state-compression/practice-tsp.md)
84. [实战：最短超级串](state-compression/practice-shortest-superstring.md)
85. [实战：参加会议的最多员工数](state-compression/practice-max-employees.md)
86. [实战：并行课程 II](state-compression/practice-parallel-courses-ii.md)
87. [实战：划分为 K 个相等的子集](state-compression/practice-partition-k-subsets.md)
88. [实战：火柴拼正方形](state-compression/practice-matchsticks-to-square.md)

---

### 第十部分：数位 DP

89. [数位 DP 概述](digit-dp/digit-dp-overview.md)
90. [数位 DP 模板详解](digit-dp/digit-dp-template.md)
91. [实战：数字 1 的个数](digit-dp/practice-number-of-digit-one.md)
92. [实战：统计特殊数字](digit-dp/practice-count-special-numbers.md)
93. [实战：不含连续 1 的非负整数](digit-dp/practice-non-negative-without-consecutive-ones.md)
94. [实战：至少有 1 位重复的数字](digit-dp/practice-at-least-one-repeated-digit.md)
95. [实战：最大为 N 的数字组合](digit-dp/practice-max-n-digit-combinations.md)
96. [实战：旋转数字](digit-dp/practice-rotated-digits.md)

---

### 第十一部分：树形 DP

97. [树形 DP 概述](tree-dp/tree-dp-overview.md)
98. [树上 DFS 与状态转移](tree-dp/tree-dfs-transition.md)
99. [实战：打家劫舍 III](tree-dp/practice-house-robber-iii.md)
100. [实战：二叉树的直径](tree-dp/practice-binary-tree-diameter.md)
101. [实战：二叉树中的最大路径和](tree-dp/practice-max-path-sum.md)
102. [实战：监控二叉树](tree-dp/practice-binary-tree-cameras.md)
103. [实战：树的最长路径](tree-dp/practice-tree-longest-path.md)
104. [实战：树的中心](tree-dp/practice-tree-center.md)
105. [实战：最大独立集](tree-dp/practice-max-independent-set.md)
106. [实战：树上背包](tree-dp/practice-tree-knapsack.md)

---

### 第十二部分：DP 优化技巧

107. [空间优化：滚动数组](dp-optimization/rolling-array.md)
108. [单调队列优化 DP](dp-optimization/monotonic-queue-optimization.md)
109. [斜率优化 DP（凸包技巧）](dp-optimization/convex-hull-trick.md)
110. [四边形不等式优化](dp-optimization/quadrangle-inequality.md)
111. [实战：单调队列优化示例](dp-optimization/practice-monotonic-queue-dp.md)
112. [实战：斜率优化示例](dp-optimization/practice-convex-hull-trick.md)

---

### 第十三部分：综合实战

113. [实战：正则表达式匹配](comprehensive/practice-regex-matching.md)
114. [实战：通配符匹配](comprehensive/practice-wildcard-matching.md)
115. [实战：扰乱字符串](comprehensive/practice-scramble-string.md)
116. [实战：自由之路](comprehensive/practice-freedom-trail.md)
117. [实战：鸡蛋掉落](comprehensive/practice-egg-drop.md)
118. [实战：学生出勤记录 II](comprehensive/practice-student-attendance-ii.md)

