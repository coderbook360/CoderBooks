# 实战：字符串的排列

判断一个字符串是否包含另一个字符串的排列。这是固定窗口和可变窗口结合的典型问题。

## 问题描述

给你两个字符串`s1`和`s2`，判断`s2`是否包含`s1`的排列。如果是，返回true。

换句话说，判断`s2`的某个子串是否是`s1`的字母异位词。

**示例**：
```
输入：s1 = "ab", s2 = "eidbaooo"
输出：true
解释：s2 包含 s1 的排列 "ba"

输入：s1 = "ab", s2 = "eidboaoo"
输出：false
```

## 思路分析

### 核心洞察

s1的排列必须是**连续的**子串，且长度等于s1。

这是一个**固定大小的窗口**问题：
- 窗口大小固定为`s1.length`
- 检查窗口内的字符频率是否与s1相同

### 两种方法

1. **暴力比较**：每次滑动都比较整个频率表
2. **维护差异**：只跟踪窗口与s1的差异数量

## 方法一：固定窗口 + 频率比较

```javascript
function checkInclusion(s1, s2) {
    if (s1.length > s2.length) return false;
    
    const count1 = new Array(26).fill(0);
    const count2 = new Array(26).fill(0);
    
    // 统计s1的频率
    for (const c of s1) {
        count1[c.charCodeAt(0) - 97]++;
    }
    
    const k = s1.length;
    
    // 初始窗口
    for (let i = 0; i < k; i++) {
        count2[s2.charCodeAt(i) - 97]++;
    }
    
    if (isSame(count1, count2)) return true;
    
    // 滑动窗口
    for (let i = k; i < s2.length; i++) {
        count2[s2.charCodeAt(i) - 97]++;       // 加入右边
        count2[s2.charCodeAt(i - k) - 97]--;   // 移出左边
        
        if (isSame(count1, count2)) return true;
    }
    
    return false;
}

function isSame(arr1, arr2) {
    for (let i = 0; i < 26; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}
```

每次滑动需要O(26)比较，总时间O(26n)。

## 方法二：维护差异计数（更优）

用一个变量`diff`记录两个频率表有多少个字符的计数不同：

```javascript
function checkInclusion(s1, s2) {
    if (s1.length > s2.length) return false;
    
    const count = new Array(26).fill(0);
    const k = s1.length;
    
    // 初始化：s1中的字符为正，窗口中的字符为负
    for (let i = 0; i < k; i++) {
        count[s1.charCodeAt(i) - 97]++;
        count[s2.charCodeAt(i) - 97]--;
    }
    
    // 计算差异：有多少个字符的count不为0
    let diff = 0;
    for (let i = 0; i < 26; i++) {
        if (count[i] !== 0) diff++;
    }
    
    if (diff === 0) return true;
    
    // 滑动窗口
    for (let i = k; i < s2.length; i++) {
        const addIdx = s2.charCodeAt(i) - 97;      // 新加入的字符
        const removeIdx = s2.charCodeAt(i - k) - 97;  // 移出的字符
        
        // 加入新字符
        if (count[addIdx] === 0) diff++;  // 从0变非0
        count[addIdx]--;
        if (count[addIdx] === 0) diff--;  // 变回0
        
        // 移出旧字符
        if (count[removeIdx] === 0) diff++;
        count[removeIdx]++;
        if (count[removeIdx] === 0) diff--;
        
        if (diff === 0) return true;
    }
    
    return false;
}
```

## 执行过程

```
s1 = "ab", s2 = "eidbaooo"

初始化：
count: s1的'a'和'b'各+1
       s2前2个'e''i'各-1
count = [1,1,0,...,-1,0,...,-1,...] (a=1, b=1, e=-1, i=-1)
diff = 4 (a,b,e,i 不为0)

滑动：
i=2: 加'd', 移'e'
  'd': count[d]=0→diff++, count[d]=-1, 不等0
  'e': count[e]=-1≠0, count[e]=0, diff--
  diff = 4

i=3: 加'b', 移'i'
  'b': count[b]=1≠0, count[b]=0, diff--
  'i': count[i]=-1≠0, count[i]=0, diff--
  diff = 2

i=4: 加'a', 移'd'
  'a': count[a]=1≠0, count[a]=0, diff--
  'd': count[d]=-1≠0, count[d]=0, diff--
  diff = 0 ✓

返回 true
```

## 方法三：可变窗口（通用模板）

也可以用可变窗口的思路：

```javascript
function checkInclusion(s1, s2) {
    const need = new Map();
    for (const c of s1) {
        need.set(c, (need.get(c) || 0) + 1);
    }
    
    const window = new Map();
    let valid = 0;
    let left = 0;
    
    for (let right = 0; right < s2.length; right++) {
        const c = s2[right];
        
        if (need.has(c)) {
            window.set(c, (window.get(c) || 0) + 1);
            if (window.get(c) === need.get(c)) {
                valid++;
            }
        }
        
        // 窗口大小达到s1长度时判断
        while (right - left + 1 >= s1.length) {
            if (valid === need.size) {
                return true;
            }
            
            const d = s2[left];
            if (need.has(d)) {
                if (window.get(d) === need.get(d)) {
                    valid--;
                }
                window.set(d, window.get(d) - 1);
            }
            left++;
        }
    }
    
    return false;
}
```

## 复杂度分析

**方法一**（频率比较）：
- 时间复杂度：O(26 * n) = O(n)
- 空间复杂度：O(26) = O(1)

**方法二**（差异计数）：
- 时间复杂度：O(n)
- 空间复杂度：O(26) = O(1)

**方法三**（可变窗口）：
- 时间复杂度：O(n)
- 空间复杂度：O(k)，k是s1中不同字符数

## 小结

字符串排列判断的要点：

1. **固定窗口**：排列长度固定，窗口大小 = s1长度
2. **频率匹配**：排列 = 字符频率相同
3. **优化技巧**：用差异计数避免每次完整比较
4. **通用模板**：也可以套用可变窗口模板

这道题和"找所有字母异位词"是同一类型，掌握一个就能解决另一个。
