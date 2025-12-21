# LeetCode 图论与搜索篇：连通世界的算法

本书系统讲解图论与搜索算法，包括 DFS、BFS、图的遍历、拓扑排序、并查集、最短路径与最小生成树。每个主题先讲解核心算法原理，再通过精选 LeetCode 题目进行实战训练，帮助读者掌握图论问题的建模与解决方法。

- [序言](preface.md)

---

### 第一部分：图的基础知识

1. [图的基本概念与术语](graph-basics/graph-concepts.md)
2. [图的存储方式：邻接表与邻接矩阵](graph-basics/graph-storage.md)
3. [有向图与无向图的特性](graph-basics/directed-undirected.md)
4. [图论问题建模思维](graph-basics/graph-modeling.md)

---

### 第二部分：深度优先搜索（DFS）

5. [DFS 原理与实现](dfs/dfs-fundamentals.md)
6. [DFS 的递归与迭代写法](dfs/dfs-recursive-iterative.md)
7. [DFS 状态管理与回溯](dfs/dfs-state-management.md)
8. [实战：岛屿数量](dfs/practice-number-of-islands.md)
9. [实战：岛屿的最大面积](dfs/practice-max-area-of-island.md)
10. [实战：被围绕的区域](dfs/practice-surrounded-regions.md)
11. [实战：太平洋大西洋水流问题](dfs/practice-pacific-atlantic.md)
12. [实战：飞地的数量](dfs/practice-number-of-enclaves.md)
13. [实战：统计封闭岛屿的数目](dfs/practice-closed-islands.md)
14. [实战：矩阵中的最长递增路径](dfs/practice-longest-increasing-path.md)
15. [实战：钥匙和房间](dfs/practice-keys-rooms.md)
16. [实战：克隆图](dfs/practice-clone-graph.md)
17. [实战：所有可能的路径](dfs/practice-all-paths.md)

---

### 第三部分：广度优先搜索（BFS）

18. [BFS 原理与实现](bfs/bfs-fundamentals.md)
19. [BFS 的层次遍历特性](bfs/bfs-level-traversal.md)
20. [多源 BFS](bfs/multi-source-bfs.md)
21. [实战：二叉树的层序遍历](bfs/practice-level-order-traversal.md)
22. [实战：腐烂的橘子](bfs/practice-rotting-oranges.md)
23. [实战：完全平方数（BFS 解法）](bfs/practice-perfect-squares-bfs.md)
24. [实战：打开转盘锁](bfs/practice-open-the-lock.md)
25. [实战：单词接龙](bfs/practice-word-ladder.md)
26. [实战：单词接龙 II](bfs/practice-word-ladder-ii.md)
27. [实战：地图分析](bfs/practice-as-far-from-land.md)
28. [实战：01 矩阵](bfs/practice-01-matrix.md)
29. [实战：最短的桥](bfs/practice-shortest-bridge.md)
30. [实战：迷宫中离入口最近的出口](bfs/practice-nearest-exit.md)

---

### 第四部分：图的遍历综合

31. [图遍历的选择：DFS vs BFS](graph-traversal/dfs-vs-bfs.md)
32. [连通分量的计算](graph-traversal/connected-components.md)
33. [实战：课程表](graph-traversal/practice-course-schedule.md)
34. [实战：课程表 II](graph-traversal/practice-course-schedule-ii.md)
35. [实战：冗余连接](graph-traversal/practice-redundant-connection.md)
36. [实战：找到最终的安全状态](graph-traversal/practice-eventual-safe-states.md)
37. [实战：判断二分图](graph-traversal/practice-is-bipartite.md)
38. [实战：可能的二分法](graph-traversal/practice-possible-bipartition.md)

---

### 第五部分：拓扑排序

39. [拓扑排序原理](topological-sort/topological-sort-theory.md)
40. [Kahn 算法（BFS 实现）](topological-sort/kahn-algorithm.md)
41. [DFS 实现拓扑排序](topological-sort/dfs-topological-sort.md)
42. [实战：课程表（拓扑排序）](topological-sort/practice-course-schedule-topo.md)
43. [实战：课程表 II（拓扑排序）](topological-sort/practice-course-schedule-ii-topo.md)
44. [实战：课程表 IV](topological-sort/practice-course-schedule-iv.md)
45. [实战：火星词典](topological-sort/practice-alien-dictionary.md)
46. [实战：序列重建](topological-sort/practice-sequence-reconstruction.md)
47. [实战：最小高度树](topological-sort/practice-minimum-height-trees.md)
48. [实战：并行课程](topological-sort/practice-parallel-courses.md)
49. [实战：项目管理](topological-sort/practice-sort-items-by-groups.md)

---

### 第六部分：并查集

50. [并查集原理与实现](union-find/union-find-fundamentals.md)
51. [路径压缩优化](union-find/path-compression.md)
52. [按秩合并优化](union-find/union-by-rank.md)
53. [实战：省份数量](union-find/practice-number-of-provinces.md)
54. [实战：冗余连接（并查集）](union-find/practice-redundant-connection-uf.md)
55. [实战：账户合并](union-find/practice-accounts-merge.md)
56. [实战：岛屿数量（并查集）](union-find/practice-islands-uf.md)
57. [实战：最长连续序列（并查集）](union-find/practice-longest-consecutive-uf.md)
58. [实战：情侣牵手](union-find/practice-couples-holding-hands.md)
59. [实战：连通网络的操作次数](union-find/practice-connect-network.md)
60. [实战：按字典序排列最小的等效字符串](union-find/practice-smallest-equivalent-string.md)
61. [实战：交换字符串中的元素](union-find/practice-smallest-string-with-swaps.md)
62. [实战：等式方程的可满足性](union-find/practice-equations-possible.md)

---

### 第七部分：最短路径算法

63. [最短路径问题概述](shortest-path/shortest-path-overview.md)
64. [Dijkstra 算法详解](shortest-path/dijkstra-algorithm.md)
65. [Bellman-Ford 算法详解](shortest-path/bellman-ford-algorithm.md)
66. [Floyd 算法详解](shortest-path/floyd-algorithm.md)
67. [SPFA 算法详解](shortest-path/spfa-algorithm.md)
68. [实战：网络延迟时间](shortest-path/practice-network-delay.md)
69. [实战：最便宜的航班](shortest-path/practice-cheapest-flights.md)
70. [实战：K 站中转内最便宜的航班](shortest-path/practice-cheapest-k-stops.md)
71. [实战：概率最大的路径](shortest-path/practice-max-probability-path.md)
72. [实战：从第一个节点出发到最后一个节点的受限路径数](shortest-path/practice-restricted-paths.md)
73. [实战：阈值距离内邻居最少的城市](shortest-path/practice-city-smallest-neighbors.md)

---

### 第八部分：最小生成树

74. [最小生成树概述](mst/mst-overview.md)
75. [Kruskal 算法详解](mst/kruskal-algorithm.md)
76. [Prim 算法详解](mst/prim-algorithm.md)
77. [实战：连接所有点的最小费用](mst/practice-min-cost-connect-points.md)
78. [实战：最低成本连通所有城市](mst/practice-min-cost-connect-cities.md)
79. [实战：找到最小生成树里的关键边和伪关键边](mst/practice-critical-pseudo-critical-edges.md)
80. [实战：检查边长度限制的路径是否存在](mst/practice-checking-existence-of-edge-length.md)

---

### 第九部分：高级搜索技巧

81. [双向 BFS](search-advanced/bidirectional-bfs.md)
82. [启发式搜索与 A* 算法](search-advanced/heuristic-search.md)
83. [IDA* 算法](search-advanced/ida-star.md)
84. [实战：单词接龙（双向 BFS）](search-advanced/practice-word-ladder-bidirectional.md)
85. [实战：滑动谜题](search-advanced/practice-sliding-puzzle.md)
86. [实战：八数码问题](search-advanced/practice-8-puzzle.md)
87. [实战：推箱子](search-advanced/practice-minimum-moves-to-move-a-box.md)
88. [实战：跳跃游戏 III](search-advanced/practice-jump-game-iii.md)
89. [实战：跳跃游戏 IV](search-advanced/practice-jump-game-iv.md)

---

### 第十部分：二分图与匹配

90. [二分图的判定与性质](bipartite/bipartite-properties.md)
91. [匈牙利算法（最大匹配）](bipartite/hungarian-algorithm.md)
92. [实战：判断二分图](bipartite/practice-is-bipartite.md)
93. [实战：可能的二分法](bipartite/practice-possible-bipartition.md)
94. [实战：二分图最大匹配应用](bipartite/practice-max-bipartite-matching.md)

