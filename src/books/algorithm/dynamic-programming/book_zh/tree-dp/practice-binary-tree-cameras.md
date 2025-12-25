# 监控二叉树

## 题目描述

**LeetCode 968. Binary Tree Cameras**

给定一个二叉树，我们在树的节点上安装摄像头。

节点上的每个摄影头都可以监视其父对象、自身及其直接子对象。

计算监控树的所有节点所需的最小摄像头数目。

**示例 1**：
```
输入：[0,0,null,0,0]
输出：1
解释：一个摄像头即可监控所有节点
    0
   /
  0
 / \
0   0
```

**示例 2**：
```
输入：[0,0,null,0,null,0,null,null,0]
输出：2
```

**约束**：
- 节点数的范围是 `[1, 1000]`
- 每个节点的值都是 `0`

## 思路分析

这是一个最小覆盖问题。每个摄像头可以覆盖：
- 自己
- 父节点
- 子节点

需要用最少的摄像头覆盖所有节点。

### 状态设计

对于每个节点，有三种状态：
1. **有摄像头**：节点上装了摄像头
2. **被覆盖**：没有摄像头，但被相邻节点的摄像头覆盖
3. **未覆盖**：没有摄像头，也没有被覆盖

用数字表示：
- 0 = 未覆盖
- 1 = 有摄像头
- 2 = 被覆盖（但没有摄像头）

## 解法一：贪心 + 后序遍历

自底向上贪心：叶子节点不放摄像头，让父节点来覆盖。

```typescript
function minCameraCover(root: TreeNode | null): number {
  let cameras = 0;
  
  // 返回值：0=未覆盖, 1=有摄像头, 2=被覆盖
  function dfs(node: TreeNode | null): number {
    if (!node) return 2;  // 空节点视为已覆盖
    
    const left = dfs(node.left);
    const right = dfs(node.right);
    
    // 如果有子节点未覆盖，当前节点必须放摄像头
    if (left === 0 || right === 0) {
      cameras++;
      return 1;
    }
    
    // 如果有子节点有摄像头，当前节点被覆盖
    if (left === 1 || right === 1) {
      return 2;
    }
    
    // 子节点都被覆盖，当前节点未覆盖（让父节点处理）
    return 0;
  }
  
  // 如果根节点未覆盖，需要额外放一个摄像头
  if (dfs(root) === 0) {
    cameras++;
  }
  
  return cameras;
}
```

**贪心策略**：
- 叶子节点不放摄像头（返回 0 = 未覆盖）
- 父节点看到未覆盖的子节点，必须放摄像头
- 这样可以最大化每个摄像头的覆盖范围

**复杂度分析**：
- 时间：O(n)
- 空间：O(h)

## 解法二：三状态树形 DP

更系统的 DP 方法，计算每种状态的最小摄像头数。

```typescript
function minCameraCover(root: TreeNode | null): number {
  // 返回 [状态0的最小摄像头, 状态1的, 状态2的]
  // 状态0：当前节点未覆盖
  // 状态1：当前节点有摄像头
  // 状态2：当前节点被覆盖（无摄像头）
  
  function dfs(node: TreeNode | null): [number, number, number] {
    if (!node) {
      // 空节点：未覆盖不可能，有摄像头代价无穷，被覆盖代价0
      return [Infinity, Infinity, 0];
    }
    
    const [leftUncov, leftCam, leftCov] = dfs(node.left);
    const [rightUncov, rightCam, rightCov] = dfs(node.right);
    
    // 状态0（未覆盖）：子节点都被覆盖
    const uncovered = leftCov + rightCov;
    
    // 状态1（有摄像头）：1 + 子节点任意状态的最小值
    const withCamera = 1 
      + Math.min(leftUncov, leftCam, leftCov)
      + Math.min(rightUncov, rightCam, rightCov);
    
    // 状态2（被覆盖）：至少一个子节点有摄像头
    // 两种情况：左有摄像头，或右有摄像头
    const covered = Math.min(
      leftCam + Math.min(rightCam, rightCov),  // 左有摄像头
      rightCam + Math.min(leftCam, leftCov)    // 右有摄像头
    );
    
    return [uncovered, withCamera, covered];
  }
  
  const [uncov, cam, cov] = dfs(root);
  // 根节点不能未覆盖
  return Math.min(cam, cov);
}
```

**状态转移详解**：

1. **未覆盖（状态0）**：
   - 当前节点不放摄像头，也不被覆盖
   - 子节点必须被覆盖（不能有摄像头，否则当前会被覆盖）
   - `uncovered = leftCov + rightCov`

2. **有摄像头（状态1）**：
   - 当前节点放摄像头，子节点可以是任何状态
   - `withCamera = 1 + min(子状态)`

3. **被覆盖（状态2）**：
   - 当前节点被子节点的摄像头覆盖
   - 至少一个子节点有摄像头
   - `covered = min(左有摄像头, 右有摄像头)`

## 状态转移图

```
     node
    /    \
  left   right

node 状态 → 需要的子节点状态
───────────────────────────
未覆盖   → 两个子节点都是"被覆盖"
有摄像头 → 子节点任意状态均可
被覆盖   → 至少一个子节点"有摄像头"
```

## 为什么贪心是对的？

贪心策略：尽量让摄像头放在叶子的父节点。

证明：
1. 叶子节点必须被覆盖
2. 覆盖叶子有两种方式：叶子放摄像头，或父节点放
3. 父节点放摄像头可以同时覆盖叶子和自己
4. 叶子放摄像头只覆盖叶子和父节点
5. 所以父节点放更优

自底向上应用这个策略，就得到了最优解。

## 边界情况

1. **单节点**：必须放一个摄像头，返回 1
2. **只有根和一个子节点**：在根或子节点放，返回 1

## 相关题目

| 题目 | 难度 | 说明 |
|------|------|------|
| [337. 打家劫舍 III](https://leetcode.cn/problems/house-robber-iii/) | 中等 | 双状态 DP |
| [979. 在二叉树中分配硬币](https://leetcode.cn/problems/distribute-coins-in-binary-tree/) | 中等 | 树形贪心 |
| [834. 树中距离之和](https://leetcode.cn/problems/sum-of-distances-in-tree/) | 困难 | 换根 DP |

## 总结

这道题展示了：

1. **三状态设计**：
   - 比双状态更复杂
   - 状态之间的转移关系需要仔细推导

2. **贪心思想**：
   - 自底向上
   - 延迟决策（叶子不放，让父节点决定）

3. **两种解法**：
   - 贪心更简洁，但需要证明正确性
   - DP 更系统，状态转移更清晰

核心洞见：
- 覆盖问题通常从叶子开始思考
- 摄像头放在内部节点比叶子更高效
- 三状态 DP 是处理复杂约束的通用方法
