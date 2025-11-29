# 滑动窗口基础理论

滑动窗口是双指针的一种特殊形式。它维护一个区间（窗口），通过窗口的滑动来高效处理连续子数组/子串问题。

## 什么是滑动窗口？

想象你在看一篇长文档，但只能通过一个固定大小的窗口查看。你需要把窗口从左滑到右，逐步查看整个文档。

在算法中：
- **窗口**：数组/字符串的一个连续子区间`[left, right]`
- **滑动**：移动left或right，改变窗口覆盖的区间

## 核心框架

```javascript
function slidingWindow(arr) {
    let left = 0;
    // 窗口状态变量
    let windowState = ...;
    
    for (let right = 0; right < arr.length; right++) {
        // 1. 扩展窗口：将arr[right]加入窗口
        updateWindow(arr[right]);
        
        // 2. 收缩窗口：当窗口不满足条件时
        while (needShrink()) {
            // 将arr[left]移出窗口
            removeFromWindow(arr[left]);
            left++;
        }
        
        // 3. 更新结果
        updateResult();
    }
    
    return result;
}
```

## 关键问题

### 1. 什么时候收缩窗口？

根据题目条件判断：
- 窗口大小超限
- 窗口内元素不满足某个约束
- 需要找最小窗口时，满足条件就收缩

### 2. 在哪里更新结果？

- **找最大窗口**：在扩展后、收缩前更新
- **找最小窗口**：在满足条件时更新
- **固定大小窗口**：窗口大小达标时更新

### 3. 如何维护窗口状态？

常见的窗口状态：
- 元素计数：用Map或数组
- 窗口和：用一个变量
- 元素种类数：用Set或计数器

## 示例：最长无重复子串

找最长的不含重复字符的子串：

```javascript
function lengthOfLongestSubstring(s) {
    const window = new Set();  // 窗口内的字符
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        // 如果right字符已在窗口中，收缩直到移除
        while (window.has(s[right])) {
            window.delete(s[left]);
            left++;
        }
        
        // 加入窗口
        window.add(s[right]);
        
        // 更新结果
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 滑动窗口适用场景

1. **连续子数组/子串问题**
2. **有明确的"窗口"概念**
3. **窗口具有单调性**：扩展或收缩窗口时，某个指标单调变化

## 与双指针的关系

滑动窗口是双指针的特例：
- 两个指针都向同一方向移动
- 两个指针之间的区间就是"窗口"
- 窗口内的状态需要维护

```
对撞双指针:    L---->      <----R

滑动窗口:      L---->  R---->
              [  窗口  ]
```

## 复杂度优势

暴力枚举所有子数组需要O(n²)。

滑动窗口通过单调性保证每个元素只被访问常数次，达到O(n)。

## 小结

滑动窗口的核心：

1. **定义窗口**：明确窗口代表什么
2. **扩展窗口**：right右移，加入新元素
3. **收缩窗口**：left右移，移出旧元素
4. **维护状态**：窗口内的统计信息
5. **更新结果**：在合适的时机记录答案

接下来我们会详细讨论固定窗口和可变窗口的区别。
