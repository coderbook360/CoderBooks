# 固定窗口与可变窗口

滑动窗口根据窗口大小是否固定，分为两大类。它们的代码框架略有不同。

## 固定窗口

窗口大小固定为k，每次滑动时左右边界同时移动。

### 典型场景

- 连续k个元素的最大/最小/平均值
- 大小为k的子数组满足某条件

### 代码框架

```javascript
function fixedWindow(arr, k) {
    // 窗口状态
    let windowSum = 0;  // 以窗口和为例
    
    // 初始化第一个窗口
    for (let i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    let result = windowSum;
    
    // 滑动窗口
    for (let right = k; right < arr.length; right++) {
        let left = right - k;
        
        // 加入右边元素
        windowSum += arr[right];
        // 移出左边元素
        windowSum -= arr[left];
        
        // 更新结果
        result = Math.max(result, windowSum);
    }
    
    return result;
}
```

### 示例：连续k个数的最大和

```javascript
function maxSumSubarray(arr, k) {
    let windowSum = 0;
    
    // 初始窗口
    for (let i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    let maxSum = windowSum;
    
    // 滑动
    for (let i = k; i < arr.length; i++) {
        windowSum = windowSum + arr[i] - arr[i - k];
        maxSum = Math.max(maxSum, windowSum);
    }
    
    return maxSum;
}
```

### 特点

- 窗口大小始终为k
- 每次移动，一进一出
- 实现简单，不需要while循环

## 可变窗口

窗口大小根据条件动态调整。

### 典型场景

- 满足条件的最长/最短子数组
- 包含某些元素的子串

### 代码框架

```javascript
function variableWindow(arr) {
    let left = 0;
    let windowState = ...;  // 窗口状态
    let result = ...;
    
    for (let right = 0; right < arr.length; right++) {
        // 扩展窗口
        updateState(arr[right]);
        
        // 收缩窗口（根据条件）
        while (shouldShrink()) {
            removeState(arr[left]);
            left++;
        }
        
        // 更新结果
        result = updateResult(result, right - left + 1);
    }
    
    return result;
}
```

### 求最大窗口

找满足条件的**最长**子数组：

```javascript
function longestSubarray(arr, condition) {
    let left = 0;
    let maxLen = 0;
    
    for (let right = 0; right < arr.length; right++) {
        // 扩展窗口
        addElement(arr[right]);
        
        // 当不满足条件时收缩
        while (!isValid()) {
            removeElement(arr[left]);
            left++;
        }
        
        // 更新最大长度
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

### 求最小窗口

找满足条件的**最短**子数组：

```javascript
function shortestSubarray(arr, condition) {
    let left = 0;
    let minLen = Infinity;
    
    for (let right = 0; right < arr.length; right++) {
        // 扩展窗口
        addElement(arr[right]);
        
        // 当满足条件时，尝试收缩
        while (isValid()) {
            minLen = Math.min(minLen, right - left + 1);
            removeElement(arr[left]);
            left++;
        }
        
        // 注意：不在这里更新minLen
    }
    
    return minLen === Infinity ? 0 : minLen;
}
```

### 关键区别

| 场景 | 何时收缩 | 何时更新结果 |
|------|---------|-------------|
| 最大窗口 | 不满足条件时 | 收缩后（窗口合法时）|
| 最小窗口 | 满足条件时 | 收缩前（刚好满足时）|

## 窗口状态维护

### 计数器（最常用）

```javascript
const count = new Map();  // 或用对象 {}

// 加入元素
count.set(c, (count.get(c) || 0) + 1);

// 移出元素
count.set(c, count.get(c) - 1);
if (count.get(c) === 0) count.delete(c);
```

### 窗口和

```javascript
let sum = 0;

// 加入
sum += arr[right];

// 移出
sum -= arr[left];
```

### 有效字符数

```javascript
let valid = 0;  // 满足条件的字符种类数

// 某字符数量达标
if (count.get(c) === target.get(c)) valid++;

// 某字符数量不达标
if (count.get(c) < target.get(c)) valid--;
```

## 示例对比

### 固定窗口：大小为3的最大平均值

```javascript
function findMaxAverage(nums, k) {
    let sum = 0;
    for (let i = 0; i < k; i++) {
        sum += nums[i];
    }
    let maxSum = sum;
    
    for (let i = k; i < nums.length; i++) {
        sum = sum + nums[i] - nums[i - k];
        maxSum = Math.max(maxSum, sum);
    }
    
    return maxSum / k;
}
```

### 可变窗口：最长无重复子串

```javascript
function lengthOfLongestSubstring(s) {
    const window = new Set();
    let left = 0, maxLen = 0;
    
    for (let right = 0; right < s.length; right++) {
        while (window.has(s[right])) {
            window.delete(s[left]);
            left++;
        }
        window.add(s[right]);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    
    return maxLen;
}
```

## 小结

| 类型 | 窗口大小 | 收缩条件 | 典型问题 |
|-----|---------|---------|---------|
| 固定窗口 | 固定为k | 自动（一进一出）| 连续k个元素的统计 |
| 可变窗口（求最大）| 动态 | 不满足条件时 | 最长满足条件的子数组 |
| 可变窗口（求最小）| 动态 | 满足条件时 | 最短满足条件的子数组 |

理解这两种模式，大多数滑动窗口问题都能套用。
