# 实战：全排列

全排列是回溯算法的经典入门题。

## 问题描述

给定一个不含重复数字的数组`nums`，返回其所有可能的全排列。

示例：
- 输入：`[1,2,3]`
- 输出：`[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]`

## 思路分析

全排列就是**选择的顺序问题**：

第一个位置可以选1、2或3，选了1后，第二个位置只能选2或3...

这是典型的决策树遍历。

## 解法1：标准回溯

```javascript
function permute(nums) {
    const result = [];
    const used = new Array(nums.length).fill(false);
    
    function backtrack(path) {
        // 终止条件：排列完成
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }
        
        // 遍历所有选择
        for (let i = 0; i < nums.length; i++) {
            // 跳过已使用的数字
            if (used[i]) continue;
            
            // 做选择
            used[i] = true;
            path.push(nums[i]);
            
            // 递归
            backtrack(path);
            
            // 撤销选择
            path.pop();
            used[i] = false;
        }
    }
    
    backtrack([]);
    return result;
}
```

## 解法2：交换法

不用额外空间记录使用状态，直接在原数组上交换。

```javascript
function permute(nums) {
    const result = [];
    
    function backtrack(start) {
        if (start === nums.length) {
            result.push([...nums]);
            return;
        }
        
        for (let i = start; i < nums.length; i++) {
            // 交换，把nums[i]放到start位置
            [nums[start], nums[i]] = [nums[i], nums[start]];
            
            backtrack(start + 1);
            
            // 换回来
            [nums[start], nums[i]] = [nums[i], nums[start]];
        }
    }
    
    backtrack(0);
    return result;
}
```

交换法的思路：
- `start`之前的位置已经固定
- 从`start`到末尾选一个数放到`start`位置
- 递归处理`start+1`之后的位置

## 决策树的理解

以`[1,2,3]`为例，标准回溯的决策树：

```
第一层选择: [1] [2] [3]
第二层选择: [1,2] [1,3] [2,1] [2,3] [3,1] [3,2]
第三层选择: [1,2,3] [1,3,2] [2,1,3] [2,3,1] [3,1,2] [3,2,1]
```

每层的选择是"当前还未使用的数字"。

## 为什么需要撤销选择

回溯的核心是**撤销选择**：

```javascript
// 做选择
used[i] = true;
path.push(nums[i]);

// 递归探索这个选择的所有可能
backtrack(path);

// 撤销选择，回到之前的状态
path.pop();
used[i] = false;
```

撤销后，才能继续尝试其他选择。

## 两种解法对比

| 解法 | 空间 | 特点 |
|-----|------|------|
| 标准回溯 | O(n)额外空间 | 直观，容易理解 |
| 交换法 | O(1)额外空间 | 更高效，但不容易处理去重 |

## 复杂度分析

- **时间复杂度**：O(n × n!)
  - n!个排列
  - 每个排列需要O(n)复制
  
- **空间复杂度**：O(n)
  - 递归深度n
  - 不计结果数组

## 小结

全排列展示了回溯的核心模式：
1. 定义路径和选择
2. 递归探索
3. 做选择和撤销选择

掌握这个模板，你就掌握了回溯算法的基础。
