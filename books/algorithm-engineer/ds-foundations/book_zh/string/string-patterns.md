# 字符串解题的"三板斧"：双指针与滑动窗口

如果说 API 是兵器，那么**解题模式**就是招式。在 LeetCode 的字符串题目中，绝大多数问题都可以用几种固定的模式解决。

本章我们将深入剖析三种最核心的模式：**双指针**、**滑动窗口**和**辅助栈**。

---

## 1. 双指针模式 (Two Pointers)

双指针是处理线性结构（数组、字符串）的瑞士军刀。根据指针的移动方向，主要分为三类。

### 1.1 对撞指针（左右指针）

**场景**：回文判断、反转字符串。
**逻辑**：两个指针分别指向头尾，向中间逼近。

```javascript
// 模板：判断回文
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        if (s[left] !== s[right]) {
            return false; // 发现不匹配
        }
        left++;
        right--;
    }
    return true;
}
```

### 1.2 中心扩散指针

**场景**：寻找最长回文子串。
**逻辑**：从中间向两边扩散。这是解决回文子串问题的特有技巧，比暴力枚举 O(n³) 要快得多（O(n²)）。

```javascript
// 模板：从 center 处向两边扩散
function expandAroundCenter(s, left, right) {
    // 当不越界且字符相等时，继续扩散
    while (left >= 0 && right < s.length && s[left] === s[right]) {
        left--;
        right++;
    }
    // 返回扩散后的长度（注意：right - left - 1 是推导出的公式）
    return right - left - 1;
}
```

### 1.3 快慢指针

**场景**：原地修改字符串（需先转数组）、移除元素。
**逻辑**：`fast` 指针探索新路，`slow` 指针维护结果。

```javascript
// 示例：将字符串中的空格替换为 "%20"（模拟原地修改）
// 注意：JS 字符串不可变，这里假设操作的是字符数组
function replaceSpace(arr) {
    let slow = 0;
    for (let fast = 0; fast < arr.length; fast++) {
        if (arr[fast] === ' ') {
            arr[slow++] = '%';
            arr[slow++] = '2';
            arr[slow++] = '0';
        } else {
            arr[slow++] = arr[fast];
        }
    }
    // ...实际场景通常涉及从后向前填充以避免覆盖
}
```

---

## 2. 滑动窗口模式 (Sliding Window)

滑动窗口是解决**子串问题**（如"最长无重复子串"、"最小覆盖子串"）的神器。它将嵌套循环的 O(n²) 复杂度降低到 O(n)。

### 核心思想

想象一个窗口在字符串上滑动：
1.  **右移 (`right++`)**：窗口变大，寻找可行解。
2.  **左移 (`left++`)**：窗口变小，优化可行解（找最短）或排除非法解。

### 万能模板

```javascript
function slidingWindow(s) {
    const window = new Map(); // 记录窗口内数据
    let left = 0;
    let right = 0;
    let valid = 0; // 记录满足条件的字符数（可选）
    let result = 0; // 记录结果

    while (right < s.length) {
        // 1. c 是将要移入窗口的字符
        const c = s[right];
        right++; // 右移窗口
        
        // ... 进行窗口内数据更新 ...
        // window.set(c, ...);

        // 2. 判断左侧窗口是否要收缩
        while (/* 窗口需要收缩的条件 */) {
            // d 是将要移出窗口的字符
            const d = s[left];
            left++; // 左移窗口
            
            // ... 进行窗口内数据更新 ...
            // 3. 在这里更新结果（如果是求最小窗口）
        }
        
        // 3. 在这里更新结果（如果是求最大窗口）
        // result = Math.max(result, right - left);
    }
    return result;
}
```

**深度解析：为什么是 O(n)？**
虽然有两个循环（`while` 套 `while`），但 `left` 和 `right` 指针都只会从 0 走到 n，**每个字符最多被访问两次**（进窗口一次，出窗口一次）。所以时间复杂度是线性的。

---

## 3. 辅助栈模式

**场景**：括号匹配、消除相邻重复项、逆波兰表达式。
**逻辑**：利用栈的"后进先出"特性处理具有**对称性**或**依赖最近元素**的问题。

```javascript
// 示例：有效括号
function isValid(s) {
    const stack = [];
    const map = { ')': '(', ']': '[', '}': '{' };
    
    for (const char of s) {
        if (char in map) {
            // 是右括号，检查栈顶
            if (stack.pop() !== map[char]) return false;
        } else {
            // 是左括号，入栈
            stack.push(char);
        }
    }
    return stack.length === 0;
}
```

---

## 4. 字符统计（哈希表/数组）

很多字符串题目本质是**统计频率**。

-   **HashMap**：适用于字符集很大（如 Unicode）。
-   **固定数组 (`new Array(26)`)**：适用于只包含小写字母。**效率更高**，常用于"异位词"问题。

```javascript
// 技巧：用数组代替 Map 统计小写字母
const count = new Array(26).fill(0);
const base = 'a'.charCodeAt(0);

for (const char of s) {
    count[char.charCodeAt(0) - base]++;
}
```

---

## 本章小结

遇到字符串题目，先按以下顺序思考：

1.  **是子串问题吗？** -> **滑动窗口**。
2.  **是回文/反转问题吗？** -> **双指针（对撞/中心扩散）**。
3.  **涉及括号/相邻消除吗？** -> **栈**。
4.  **涉及异位词/频率吗？** -> **哈希表/数组统计**。

掌握这四套组合拳，80% 的字符串题目都能迎刃而解。接下来，我们通过实战题目来验证这些模式。
