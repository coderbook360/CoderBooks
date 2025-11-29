# 实战：组合总和III

限定了元素个数的组合问题。

## 问题描述

找出所有相加之和为`n`的`k`个数的组合，满足：
- 只使用数字1到9
- 每个数字最多使用一次

示例：
- 输入：`k = 3, n = 7`
- 输出：`[[1,2,4]]`
- 解释：1 + 2 + 4 = 7

## 分析

这道题结合了：
- 组合问题：从1-9中选k个数
- 和约束：和为n

## 解法

```javascript
function combinationSum3(k, n) {
    const result = [];
    
    function backtrack(start, path, sum) {
        // 选够k个数
        if (path.length === k) {
            if (sum === n) {
                result.push([...path]);
            }
            return;
        }
        
        for (let i = start; i <= 9; i++) {
            // 剪枝：和超过n
            if (sum + i > n) break;
            
            path.push(i);
            backtrack(i + 1, path, sum + i);
            path.pop();
        }
    }
    
    backtrack(1, [], 0);
    return result;
}
```

## 进一步剪枝

剩余数字不够时提前终止：

```javascript
function combinationSum3(k, n) {
    const result = [];
    
    function backtrack(start, path, sum) {
        if (path.length === k) {
            if (sum === n) {
                result.push([...path]);
            }
            return;
        }
        
        // 还需要选 need 个数
        const need = k - path.length;
        
        for (let i = start; i <= 9; i++) {
            // 剪枝1：和超过n
            if (sum + i > n) break;
            
            // 剪枝2：剩余数字不够
            if (9 - i + 1 < need) break;
            
            path.push(i);
            backtrack(i + 1, path, sum + i);
            path.pop();
        }
    }
    
    backtrack(1, [], 0);
    return result;
}
```

## 另一种终止条件

也可以用sum来判断是否提前终止：

```javascript
function combinationSum3(k, n) {
    const result = [];
    
    function backtrack(start, path, sum) {
        // 剪枝：sum已经超过n
        if (sum > n) return;
        
        if (path.length === k) {
            if (sum === n) {
                result.push([...path]);
            }
            return;
        }
        
        for (let i = start; i <= 9; i++) {
            path.push(i);
            backtrack(i + 1, path, sum + i);
            path.pop();
        }
    }
    
    backtrack(1, [], 0);
    return result;
}
```

## 搜索过程示例

`k = 3, n = 7`：

```
[1] sum=1
  [1,2] sum=3
    [1,2,3] sum=6 ≠ 7
    [1,2,4] sum=7 ✓
    [1,2,5] sum=8 > 7, break
  [1,3] sum=4
    [1,3,4] sum=8 > 7, break
  ...
[2] sum=2
  [2,3] sum=5
    [2,3,4] sum=9 > 7, break
  ...
```

## 复杂度分析

- **时间复杂度**：O(C(9,k) × k)
  - C(9,k)个组合
  - 每个组合复制需O(k)
  
- **空间复杂度**：O(k)

## 与其他组合总和对比

| 题目 | 候选数 | 可重复选 | 去重 |
|-----|-------|---------|------|
| 组合总和I | 给定数组 | 是 | 不需要 |
| 组合总和II | 给定数组（有重复） | 否 | 需要 |
| 组合总和III | 1-9 | 否 | 不需要 |

## 小结

组合总和III的特点：
- 候选数固定为1-9
- 限定选k个数
- 每个数只能选一次

掌握这三道组合总和，你就掌握了组合问题的所有常见变种。
