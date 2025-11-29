# 实战：切割木头

这是一道经典的二分答案入门题。

## 问题描述

给定一些木头的长度数组`woods`和需要的木头段数`k`。

你需要将这些木头切成`k`段**等长**的小段。

返回这些小段的**最大可能长度**。如果无法切出`k`段，返回0。

## 思路分析

### 二分什么？

二分小段的长度。长度越短，能切出的段数越多。

### 答案空间

- **下界**：1（至少长度为1）
- **上界**：max(woods)（最长的木头长度）

### 单调性

长度越大，能切出的段数越少。

### 判断函数

给定长度`len`，能切出多少段？

```javascript
function countPieces(woods, len) {
    let count = 0;
    for (const wood of woods) {
        count += Math.floor(wood / len);
    }
    return count;
}
```

## 完整实现

```javascript
function cuttingWood(woods, k) {
    if (woods.length === 0) return 0;
    
    let left = 1;
    let right = Math.max(...woods);
    
    // 如果最大长度都切不出k段，返回0
    if (countPieces(woods, 1) < k) {
        return 0;
    }
    
    while (left < right) {
        // 注意：这里用上取整，因为要找最大值
        const mid = left + Math.floor((right - left + 1) / 2);
        
        if (countPieces(woods, mid) >= k) {
            left = mid;
        } else {
            right = mid - 1;
        }
    }
    
    return left;
}

function countPieces(woods, len) {
    let count = 0;
    for (const wood of woods) {
        count += Math.floor(wood / len);
    }
    return count;
}
```

## 二分模板的选择

这道题要找**最大**的可行长度，所以：
- 当`count >= k`时，长度可能还能更大，收缩左边界
- 当`count < k`时，长度太大了，收缩右边界

注意`mid`的计算用了上取整`(right - left + 1) / 2`，这是找最大值时的标准做法，避免死循环。

## 边界情况

### 无解的情况

如果所有木头加起来都不够k段，返回0。

### 木头长度为0

题目假设木头长度为正整数，如果有0需要特判。

## 示例

```
输入: woods = [232, 124, 456], k = 7
输出: 114

解释:
- 长度232的木头可以切成 232/114 = 2 段
- 长度124的木头可以切成 124/114 = 1 段
- 长度456的木头可以切成 456/114 = 4 段
- 总共 2 + 1 + 4 = 7 段
```

## 复杂度分析

**时间复杂度**：O(n * log(max))
- 二分O(log(max))次
- 每次统计O(n)

**空间复杂度**：O(1)

## 小结

切木头是二分答案的入门题，特点是：
1. 答案是"长度"，不是数组下标
2. 判断函数很简单：统计能切多少段
3. 要找最大值，用上取整的二分模板
