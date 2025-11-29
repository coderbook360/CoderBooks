# 实战：最小覆盖子串

这是滑动窗口的经典难题，完美展示了"求最小窗口"的模板。理解这道题，大多数滑动窗口问题都能解决。

## 问题描述

给你一个字符串`s`和一个字符串`t`，返回`s`中包含`t`所有字符的**最小子串**。如果不存在，返回空字符串。

**示例**：
```
输入：s = "ADOBECODEBANC", t = "ABC"
输出："BANC"

输入：s = "a", t = "a"
输出："a"

输入：s = "a", t = "aa"
输出：""
```

**注意**：
- t中的字符可能重复，s的子串必须包含所有这些重复
- t中每个字符在子串中的数量必须 ≥ t中的数量

## 思路分析

### 核心思路

1. **统计t中每个字符的需求量**
2. **扩展窗口**：right右移，加入字符，更新窗口内的计数
3. **检查覆盖**：当窗口覆盖了t的所有字符
4. **收缩窗口**：left右移，尝试缩小窗口，更新最小答案

### 如何判断"覆盖"？

用一个变量`formed`记录窗口中已经满足要求的**字符种类数**：
- 当某字符在窗口中的数量 = t中的需求量，`formed++`
- 当`formed === t中的字符种类数`，说明完全覆盖

## 完整实现

```javascript
/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
function minWindow(s, t) {
    if (t.length > s.length) return '';
    
    // 统计t中每个字符的需求量
    const need = new Map();
    for (const c of t) {
        need.set(c, (need.get(c) || 0) + 1);
    }
    
    const required = need.size;  // 需要满足的字符种类数
    
    // 窗口状态
    const window = new Map();
    let formed = 0;  // 已满足的字符种类数
    
    // 结果
    let minLen = Infinity;
    let minLeft = 0;
    
    let left = 0;
    
    for (let right = 0; right < s.length; right++) {
        // 扩展窗口
        const c = s[right];
        window.set(c, (window.get(c) || 0) + 1);
        
        // 检查该字符是否满足需求
        if (need.has(c) && window.get(c) === need.get(c)) {
            formed++;
        }
        
        // 收缩窗口
        while (formed === required) {
            // 更新最小覆盖子串
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minLeft = left;
            }
            
            // 移出左边字符
            const leftChar = s[left];
            window.set(leftChar, window.get(leftChar) - 1);
            
            if (need.has(leftChar) && window.get(leftChar) < need.get(leftChar)) {
                formed--;
            }
            
            left++;
        }
    }
    
    return minLen === Infinity ? '' : s.substring(minLeft, minLeft + minLen);
}
```

## 执行过程

```
s = "ADOBECODEBANC", t = "ABC"
need = {A:1, B:1, C:1}, required = 3

扩展过程：
right=0: 'A', window={A:1}, formed=1
right=1: 'D', window={A:1,D:1}
right=2: 'O', window={A:1,D:1,O:1}
right=3: 'B', window={A:1,D:1,O:1,B:1}, formed=2
right=4: 'E', window={...,E:1}
right=5: 'C', window={...,C:1}, formed=3 ✓

收缩过程（formed=3）：
  窗口="ADOBEC"(6), minLen=6, minLeft=0
  移出'A', formed=2, 停止收缩

继续扩展：
right=6: 'O'
right=7: 'D'
right=8: 'E'
right=9: 'B', window={...,B:2}
right=10: 'A', window={...,A:1}, formed=3 ✓

收缩过程（formed=3）：
  窗口="DOBECODEBA"(10), 不更新
  移出'D', 继续
  移出'O', 继续
  移出'B', formed仍=3（B还有1个）
  移出'E', 继续
  移出'C', formed=2, 停止

...

right=12: 'C', formed=3 ✓
  窗口="BANC"(4), minLen=4, minLeft=9
  移出'B', formed=2

结果："BANC"
```

## 代码详解

### 需求统计

```javascript
const need = new Map();
for (const c of t) {
    need.set(c, (need.get(c) || 0) + 1);
}
```

记录t中每个字符需要多少个。

### 判断满足条件

```javascript
if (need.has(c) && window.get(c) === need.get(c)) {
    formed++;
}
```

只有当窗口中该字符的数量**恰好等于**需求量时，才算满足。
- 少了不满足
- 多了已经在之前满足过了

### 收缩时更新formed

```javascript
if (need.has(leftChar) && window.get(leftChar) < need.get(leftChar)) {
    formed--;
}
```

移出字符后，如果数量低于需求量，formed减1。

## 优化版本

用数组代替Map，性能更好：

```javascript
function minWindow(s, t) {
    const need = new Array(128).fill(0);
    const window = new Array(128).fill(0);
    
    let required = 0;
    for (const c of t) {
        if (need[c.charCodeAt(0)] === 0) required++;
        need[c.charCodeAt(0)]++;
    }
    
    let formed = 0;
    let minLen = Infinity, minLeft = 0;
    let left = 0;
    
    for (let right = 0; right < s.length; right++) {
        const rc = s.charCodeAt(right);
        window[rc]++;
        
        if (need[rc] > 0 && window[rc] === need[rc]) {
            formed++;
        }
        
        while (formed === required) {
            if (right - left + 1 < minLen) {
                minLen = right - left + 1;
                minLeft = left;
            }
            
            const lc = s.charCodeAt(left);
            if (need[lc] > 0 && window[lc] === need[lc]) {
                formed--;
            }
            window[lc]--;
            left++;
        }
    }
    
    return minLen === Infinity ? '' : s.substring(minLeft, minLeft + minLen);
}
```

## 复杂度分析

**时间复杂度**：O(m + n)
- m是s的长度，n是t的长度
- 每个字符最多被访问两次（进入和离开窗口）

**空间复杂度**：O(k)
- k是字符集大小

## 小结

最小覆盖子串的要点：

1. **"求最小"模板**：满足条件时收缩，收缩时更新答案
2. **formed计数**：跟踪满足条件的字符种类数
3. **判断时机**：字符数量恰好等于需求时更新formed
4. **收缩条件**：formed === required时可以收缩

这是滑动窗口最经典的问题，掌握它就掌握了滑动窗口的精髓。
