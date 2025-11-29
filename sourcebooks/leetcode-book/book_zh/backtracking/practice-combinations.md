# 实战：组合

组合与排列的区别：顺序不重要。

## 问题描述

给定两个整数`n`和`k`，返回范围`[1, n]`中所有可能的`k`个数的组合。

示例：
- 输入：`n = 4, k = 2`
- 输出：`[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]`

## 组合 vs 排列

- 排列：[1,2]和[2,1]是不同的
- 组合：[1,2]和[2,1]是相同的，只算一次

如何避免重复？**只往后选**。

## 解法：回溯 + 只往后选

```javascript
function combine(n, k) {
    const result = [];
    
    function backtrack(start, path) {
        // 终止条件：选够k个
        if (path.length === k) {
            result.push([...path]);
            return;
        }
        
        // 从start开始选，保证只往后
        for (let i = start; i <= n; i++) {
            path.push(i);
            backtrack(i + 1, path);  // 下一次从i+1开始
            path.pop();
        }
    }
    
    backtrack(1, []);
    return result;
}
```

关键：`backtrack(i + 1, path)`，下一次只能选比当前大的数。

## 剪枝优化

如果剩余数字不够选了，可以提前终止：

```javascript
function combine(n, k) {
    const result = [];
    
    function backtrack(start, path) {
        if (path.length === k) {
            result.push([...path]);
            return;
        }
        
        // 剪枝：还需要选 k - path.length 个
        // 从start到n共有 n - start + 1 个数
        // 需要 n - start + 1 >= k - path.length
        // 即 start <= n - (k - path.length) + 1
        for (let i = start; i <= n - (k - path.length) + 1; i++) {
            path.push(i);
            backtrack(i + 1, path);
            path.pop();
        }
    }
    
    backtrack(1, []);
    return result;
}
```

剪枝条件：如果从`start`到`n`的数字个数，少于还需要选的个数，直接跳过。

## 剪枝效果示例

`n = 4, k = 3`：

不剪枝的搜索路径：
```
[1] -> [1,2] -> [1,2,3]✓ [1,2,4]✓
    -> [1,3] -> [1,3,4]✓
    -> [1,4] -> (需要再选1个，但后面没数了)
[2] -> [2,3] -> [2,3,4]✓
    -> [2,4] -> (需要再选1个，但后面没数了)
[3] -> [3,4] -> (需要再选1个，但后面没数了)
[4] -> (需要再选2个，但后面没数了)
```

剪枝后：
- `[1,4]`后面不会继续
- `[2,4]`后面不会继续
- `[3]`不会继续
- `[4]`不会开始

## 复杂度分析

- **时间复杂度**：O(C(n,k) × k)
  - C(n,k)个组合
  - 每个组合复制需要O(k)
  
- **空间复杂度**：O(k)
  - 递归深度k

## 模板对比

排列：
```javascript
for (let i = 0; i < nums.length; i++) {
    if (used[i]) continue;
    // ...
}
```

组合：
```javascript
for (let i = start; i <= n; i++) {
    backtrack(i + 1, path);  // 关键
}
```

组合用`start`参数保证只往后选。

## 小结

组合问题的关键：
- 用`start`参数避免重复（只往后选）
- 剪枝优化：剩余数字不够时提前终止

这个"只往后选"的思想，在后面的组合总和、子集问题中都会用到。
