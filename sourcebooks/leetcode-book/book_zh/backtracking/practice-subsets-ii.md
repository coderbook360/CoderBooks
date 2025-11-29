# 实战：子集II

数组有重复元素时的子集问题。

## 问题描述

给定一个可能包含**重复元素**的整数数组`nums`，返回所有可能的子集，解集不能包含重复子集。

示例：
- 输入：`nums = [1,2,2]`
- 输出：`[[],[1],[1,2],[1,2,2],[2],[2,2]]`

## 问题分析

`[1,2,2]`中两个2如果不去重：
- 选第一个2：[2]
- 选第二个2：[2]（重复！）

和全排列II、组合总和II一样，需要去重。

## 解法：排序 + 去重

```javascript
function subsetsWithDup(nums) {
    const result = [];
    nums.sort((a, b) => a - b);  // 排序
    
    function backtrack(start, path) {
        result.push([...path]);
        
        for (let i = start; i < nums.length; i++) {
            // 去重：跳过同层重复元素
            if (i > start && nums[i] === nums[i - 1]) continue;
            
            path.push(nums[i]);
            backtrack(i + 1, path);
            path.pop();
        }
    }
    
    backtrack(0, []);
    return result;
}
```

去重条件：`i > start && nums[i] === nums[i - 1]`

## 去重原理

排序后`[1,2,2]`，两个2记为2a和2b：

```
第一层（start=0）:
  选1 → 继续
  选2a → 继续
  选2b → 跳过（i > start 且与前一个相同）

在[2a]基础上（start=1）:
  i=1: 2a已选过
  i=2: 选2b → 继续（此时i=start，不跳过）
```

规则：在**同一层**，相同元素只选第一个。

## 搜索过程示例

`nums = [1,2,2]`：

```
[]
[1]
  [1,2a]
    [1,2a,2b]
  [1,2b] → 跳过
[2a]
  [2a,2b]
[2b] → 跳过
```

结果：`[[], [1], [1,2], [1,2,2], [2], [2,2]]`

## 迭代方法

也可以用迭代方法处理去重：

```javascript
function subsetsWithDup(nums) {
    nums.sort((a, b) => a - b);
    let result = [[]];
    let prevSize = 0;
    
    for (let i = 0; i < nums.length; i++) {
        const start = (i > 0 && nums[i] === nums[i-1]) ? prevSize : 0;
        prevSize = result.length;
        
        for (let j = start; j < prevSize; j++) {
            result.push([...result[j], nums[i]]);
        }
    }
    
    return result;
}
```

当遇到重复元素时，只在上一轮新增的子集基础上添加。

## 复杂度分析

- **时间复杂度**：O(n × 2^n)
  - 最坏情况2^n个子集
  - 有重复时实际更少
  
- **空间复杂度**：O(n)

## 去重模式总结

处理"有重复元素"的回溯问题，标准模式：

```javascript
nums.sort((a, b) => a - b);  // 1. 先排序

for (let i = start; i < nums.length; i++) {
    // 2. 跳过同层重复
    if (i > start && nums[i] === nums[i-1]) continue;
    
    // 正常处理
}
```

这个模式适用于：
- 全排列II
- 组合总和II
- 子集II

## 小结

子集II的关键是去重：
- 排序让相同元素相邻
- `i > start`确保在同一层跳过重复

掌握这个去重技巧，你就能处理所有"有重复元素"的回溯问题。
