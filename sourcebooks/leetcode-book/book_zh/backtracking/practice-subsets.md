# 实战：子集

子集问题是组合问题的特殊形式。

## 问题描述

给定一个整数数组`nums`，数组中的元素**互不相同**。返回该数组所有可能的子集。

示例：
- 输入：`nums = [1,2,3]`
- 输出：`[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]`

## 子集 vs 组合

- 组合：选k个元素
- 子集：选0到n个元素

子集 = 所有长度的组合的并集。

## 解法1：回溯

```javascript
function subsets(nums) {
    const result = [];
    
    function backtrack(start, path) {
        // 每个路径都是一个子集
        result.push([...path]);
        
        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);
            backtrack(i + 1, path);
            path.pop();
        }
    }
    
    backtrack(0, []);
    return result;
}
```

与组合的区别：没有`path.length === k`的终止条件，每个节点都收集结果。

## 决策树的理解

```
                  []
        /         |         \
      [1]        [2]        [3]
     /   \        |
  [1,2]  [1,3]  [2,3]
    |
 [1,2,3]
```

遍历所有节点（不只是叶子），每个节点对应一个子集。

## 解法2：迭代

从空集开始，每来一个新元素，就在现有子集基础上添加：

```javascript
function subsets(nums) {
    let result = [[]];
    
    for (const num of nums) {
        // 在现有每个子集基础上，加入num
        const newSubsets = result.map(subset => [...subset, num]);
        result = [...result, ...newSubsets];
    }
    
    return result;
}
```

过程：
- 初始：`[[]]`
- 加入1：`[[]] + [[1]] = [[], [1]]`
- 加入2：`[[], [1]] + [[2], [1,2]] = [[], [1], [2], [1,2]]`
- 加入3：`... = [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]`

## 解法3：位运算

n个元素有2^n个子集，每个子集可以用一个n位二进制数表示：

```javascript
function subsets(nums) {
    const n = nums.length;
    const result = [];
    
    // 枚举0到2^n-1
    for (let mask = 0; mask < (1 << n); mask++) {
        const subset = [];
        for (let i = 0; i < n; i++) {
            // 第i位是1，就选nums[i]
            if (mask & (1 << i)) {
                subset.push(nums[i]);
            }
        }
        result.push(subset);
    }
    
    return result;
}
```

mask=5（二进制101）表示选第0个和第2个元素。

## 三种解法对比

| 解法 | 时间 | 空间 | 特点 |
|-----|------|------|------|
| 回溯 | O(n×2^n) | O(n) | 通用，易扩展 |
| 迭代 | O(n×2^n) | O(2^n) | 直观 |
| 位运算 | O(n×2^n) | O(n) | 巧妙，有局限 |

## 复杂度分析

- **时间复杂度**：O(n × 2^n)
  - 2^n个子集
  - 每个子集平均长度n/2，复制需要O(n)
  
- **空间复杂度**：O(n)，递归深度

## 小结

子集问题的三种思路：
- **回溯**：遍历决策树的所有节点
- **迭代**：逐步扩展现有子集
- **位运算**：用二进制表示选择

回溯方法最通用，适合扩展到有重复元素、有条件约束的情况。
