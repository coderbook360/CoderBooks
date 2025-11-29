# 实战：组合总和

组合问题的变种：可以重复选择元素。

## 问题描述

给定一个无重复元素的正整数数组`candidates`和一个正整数`target`，找出所有可以使数字和为`target`的组合。

每个数字**可以无限次选择**，解集不能包含重复组合。

示例：
- 输入：`candidates = [2,3,6,7], target = 7`
- 输出：`[[2,2,3],[7]]`

## 关键点

与普通组合的区别：
- 普通组合：每个数最多选一次
- 本题：每个数可以选无限次

## 解法：回溯

```javascript
function combinationSum(candidates, target) {
    const result = [];
    
    function backtrack(start, path, sum) {
        if (sum === target) {
            result.push([...path]);
            return;
        }
        
        if (sum > target) return;  // 剪枝
        
        for (let i = start; i < candidates.length; i++) {
            path.push(candidates[i]);
            // 注意这里是i，不是i+1，表示可以重复选
            backtrack(i, path, sum + candidates[i]);
            path.pop();
        }
    }
    
    backtrack(0, [], 0);
    return result;
}
```

核心区别：`backtrack(i, ...)`而不是`backtrack(i + 1, ...)`。

## 进一步剪枝

先排序，sum超过target时直接break：

```javascript
function combinationSum(candidates, target) {
    const result = [];
    candidates.sort((a, b) => a - b);  // 排序
    
    function backtrack(start, path, sum) {
        if (sum === target) {
            result.push([...path]);
            return;
        }
        
        for (let i = start; i < candidates.length; i++) {
            // 剪枝：后面的数更大，sum只会更大
            if (sum + candidates[i] > target) break;
            
            path.push(candidates[i]);
            backtrack(i, path, sum + candidates[i]);
            path.pop();
        }
    }
    
    backtrack(0, [], 0);
    return result;
}
```

排序后，一旦`sum + candidates[i] > target`，后面的数更大，不可能满足，直接break。

## 搜索过程示例

`candidates = [2,3,6,7], target = 7`：

```
[2] sum=2
  [2,2] sum=4
    [2,2,2] sum=6
      [2,2,2,2] sum=8 > 7, 回溯
    [2,2,3] sum=7 ✓
  [2,3] sum=5
    [2,3,3] sum=8 > 7, 回溯
  [2,6] sum=8 > 7, break
[3] sum=3
  [3,3] sum=6
    [3,3,3] sum=9 > 7, 回溯
  [3,6] sum=9 > 7, break
[6] sum=6
  [6,6] sum=12 > 7, break
[7] sum=7 ✓
```

## 为什么用start参数

防止重复组合。

如果没有start，允许往前选：
- [2,2,3]和[3,2,2]会被认为是不同组合

用start保证只往后选，相同元素的组合只出现一次。

## 复杂度分析

- **时间复杂度**：难以精确分析，取决于target和candidates的关系
- **空间复杂度**：O(target/min(candidates))，递归深度

## 小结

组合总和的关键：
- `backtrack(i, ...)`允许重复选同一个数
- 排序 + `break`实现高效剪枝

这种"可重复选择"的模式，是组合问题的常见变种。
