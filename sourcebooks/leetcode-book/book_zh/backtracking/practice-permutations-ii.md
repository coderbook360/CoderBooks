# 实战：全排列II

当数组包含重复元素时，如何避免生成重复排列？

## 问题描述

给定一个**可包含重复数字**的序列`nums`，返回所有不重复的全排列。

示例：
- 输入：`[1,1,2]`
- 输出：`[[1,1,2],[1,2,1],[2,1,1]]`

## 问题的关键

`[1,1,2]`如果不去重，会产生：
- 第一个1在前：[1,1,2], [1,2,1]
- 第二个1在前：[1,1,2], [1,2,1]（重复！）

关键是如何跳过重复的选择。

## 解法：排序 + 剪枝

```javascript
function permuteUnique(nums) {
    const result = [];
    const used = new Array(nums.length).fill(false);
    
    // 排序，让相同的数字相邻
    nums.sort((a, b) => a - b);
    
    function backtrack(path) {
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }
        
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            
            // 去重关键：跳过重复元素
            // 条件：当前数与前一个相同，且前一个没被使用
            if (i > 0 && nums[i] === nums[i-1] && !used[i-1]) {
                continue;
            }
            
            used[i] = true;
            path.push(nums[i]);
            backtrack(path);
            path.pop();
            used[i] = false;
        }
    }
    
    backtrack([]);
    return result;
}
```

## 去重条件的理解

去重条件是：`nums[i] === nums[i-1] && !used[i-1]`

为什么要检查`!used[i-1]`？

考虑`[1,1,2]`，两个1分别称为1a和1b：

**情况1**：1a已被使用，现在选1b
- `used[i-1] = true`
- 这是合法的，形成[1a, 1b, ...]

**情况2**：1a未被使用，现在选1b
- `used[i-1] = false`
- 这意味着在同一层，1a已经处理过了
- 选1b会产生重复，应该跳过

## 换一种理解方式

同一层中，相同的数字只选第一个。

```
第一层：选1a(继续) 选1b(跳过，因为1a还没用过) 选2(继续)
```

这保证了相同数字在同一位置只出现一次。

## 另一种去重方式

用Set记录当前层已经使用过的数字：

```javascript
function permuteUnique(nums) {
    const result = [];
    const used = new Array(nums.length).fill(false);
    
    function backtrack(path) {
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }
        
        const levelUsed = new Set();  // 当前层用过的数字
        
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            if (levelUsed.has(nums[i])) continue;  // 跳过同层重复
            
            levelUsed.add(nums[i]);
            used[i] = true;
            path.push(nums[i]);
            backtrack(path);
            path.pop();
            used[i] = false;
        }
    }
    
    backtrack([]);
    return result;
}
```

这种方式不需要排序，但每层需要额外空间。

## 复杂度分析

- **时间复杂度**：O(n × n!)
  - 最坏情况（无重复）n!个排列
  - 有重复时实际更少
  
- **空间复杂度**：O(n)

## 两种去重方式对比

| 方式 | 优点 | 缺点 |
|-----|------|------|
| 排序+剪枝 | 空间效率高 | 需要理解剪枝条件 |
| Set去重 | 直观易懂 | 每层需要额外空间 |

## 小结

全排列II的关键是**去重剪枝**：
- 先排序，让相同元素相邻
- 同一层中，相同元素只选第一个

去重剪枝是回溯中非常重要的技巧，后面的组合、子集问题也会用到。
