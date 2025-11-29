# 实战：组合总和II

数组有重复元素，每个元素只能用一次。

## 问题描述

给定一个有重复元素的数组`candidates`和目标数`target`，找出所有和为`target`的组合。

每个数字**只能使用一次**，解集不能包含重复组合。

示例：
- 输入：`candidates = [10,1,2,7,6,1,5], target = 8`
- 输出：`[[1,1,6],[1,2,5],[1,7],[2,6]]`

## 与组合总和I的区别

| 组合总和I | 组合总和II |
|----------|-----------|
| 无重复元素 | 有重复元素 |
| 可以重复选 | 只能选一次 |

需要同时处理：
1. 每个元素只能用一次 → `backtrack(i + 1, ...)`
2. 有重复元素要去重 → 排序 + 剪枝

## 解法

```javascript
function combinationSum2(candidates, target) {
    const result = [];
    candidates.sort((a, b) => a - b);  // 排序
    
    function backtrack(start, path, sum) {
        if (sum === target) {
            result.push([...path]);
            return;
        }
        
        for (let i = start; i < candidates.length; i++) {
            // 剪枝1：超过目标
            if (sum + candidates[i] > target) break;
            
            // 剪枝2：同一层去重
            if (i > start && candidates[i] === candidates[i - 1]) continue;
            
            path.push(candidates[i]);
            backtrack(i + 1, path, sum + candidates[i]);  // i+1，不重复选
            path.pop();
        }
    }
    
    backtrack(0, [], 0);
    return result;
}
```

## 去重条件详解

`i > start && candidates[i] === candidates[i - 1]`

关键是`i > start`，而不是`i > 0`。

```
排序后：[1, 1, 2, 5, 6, 7, 10]

第一层（start=0）:
  i=0: 选第一个1 ✓
  i=1: 选第二个1？ i > start 且 candidates[1]=candidates[0]，跳过

在[1]的基础上第二层（start=1）:
  i=1: 选第二个1 ✓（此时i=start，不跳过）
```

这样就能得到[1,1,...]，但不会有两个[1,7]。

## 两种1的区别

假设两个1记为1a和1b：

- **可以**：[1a, 1b, 6]（在不同层选两个1）
- **不可以**：以1b开头的组合（在同一层，1a已经试过了）

`i > start`确保的是：在**同一层**，相同元素只选第一个。

## 搜索过程示例

`candidates = [1,1,2,5,6,7], target = 8`：

```
[1] (选1a)
  [1,1] (选1b) → [1,1,6] ✓
  [1,2] → [1,2,5] ✓
  [1,5] sum=6, 继续但没有合适的
  [1,6] sum=7, [1,6,x]没有等于1的
  [1,7] ✓
[1] (选1b) → 跳过，因为i>start且与前一个相同
[2] → [2,6] ✓
[5] → 没有合适组合
[6] → 没有合适组合
[7] → 没有合适组合
```

## 复杂度分析

- **时间复杂度**：O(2^n)，最坏情况所有子集
- **空间复杂度**：O(n)，递归深度

## 小结

组合总和II的两个关键：
1. `i + 1`：每个元素只用一次
2. `i > start`去重：同一层相同元素只选第一个

这是处理"有重复元素"组合问题的标准技巧。
