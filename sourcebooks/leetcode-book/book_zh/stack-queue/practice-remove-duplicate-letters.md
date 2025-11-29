# 实战：去除重复字母

这道题需要同时满足三个条件：去重、保持相对顺序、字典序最小。它是单调栈的一个精妙应用，融合了贪心思想。

## 问题描述

给你一个字符串`s`，请你去除字符串中重复的字母，使得每个字母只出现一次。需保证**返回结果的字典序最小**（要求不能打乱其他字符的相对位置）。

**示例**：
```
输入: s = "bcabc"
输出: "abc"

输入: s = "cbacdcbc"
输出: "acdb"
解释: 可能的去重结果有 "acdb", "adcb", "bacd" 等
      字典序最小的是 "acdb"
```

## 思路分析

### 三个约束条件

1. **去重**：每个字符只能出现一次
2. **相对顺序**：不能打乱原有顺序（只能删除，不能交换）
3. **字典序最小**：在满足前两个条件下，结果尽可能小

### 贪心策略

为了字典序最小，我们希望小的字母尽可能靠前。

考虑栈顶字符`top`和当前字符`c`：
- 如果`top > c`（栈顶更大），我们**可能**想弹出`top`，让`c`靠前
- 但能弹出的条件是：`top`在后面还会出现（否则弹掉就没了）

### 单调栈 + 贪心

维护一个"尽量递增"的栈：
- 遇到更小的字符，尝试弹出栈顶的大字符
- 但只有在大字符后面还会出现时才能弹出

## 完整实现

```javascript
/**
 * @param {string} s
 * @return {string}
 */
function removeDuplicateLetters(s) {
    const stack = [];                  // 单调栈，存储结果字符
    const inStack = new Set();         // 记录字符是否已在栈中
    const lastIndex = new Map();       // 每个字符最后出现的位置
    
    // 预处理：记录每个字符最后出现的位置
    for (let i = 0; i < s.length; i++) {
        lastIndex.set(s[i], i);
    }
    
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        
        // 如果字符已在栈中，跳过
        if (inStack.has(c)) continue;
        
        // 贪心：尝试弹出栈顶的大字符
        while (
            stack.length &&
            stack[stack.length - 1] > c &&      // 栈顶比当前大
            lastIndex.get(stack[stack.length - 1]) > i  // 栈顶字符后面还会出现
        ) {
            inStack.delete(stack.pop());
        }
        
        stack.push(c);
        inStack.add(c);
    }
    
    return stack.join('');
}
```

## 执行过程图解

以`"cbacdcbc"`为例：

```
预处理 lastIndex:
c -> 7, b -> 6, a -> 2, d -> 4

遍历过程:
i=0, c='c':
  栈空，直接入栈
  stack: ['c'], inStack: {c}

i=1, c='b':
  'c' > 'b' 且 lastIndex['c']=7 > 1，可以弹出
  弹出'c'
  stack: [], inStack: {}
  入栈'b'
  stack: ['b'], inStack: {b}

i=2, c='a':
  'b' > 'a' 且 lastIndex['b']=6 > 2，可以弹出
  弹出'b'
  stack: [], inStack: {}
  入栈'a'
  stack: ['a'], inStack: {a}

i=3, c='c':
  'a' < 'c'，不弹出
  入栈'c'
  stack: ['a', 'c'], inStack: {a, c}

i=4, c='d':
  'c' < 'd'，不弹出
  入栈'd'
  stack: ['a', 'c', 'd'], inStack: {a, c, d}

i=5, c='c':
  'c' already in stack，跳过

i=6, c='b':
  'd' > 'b'，但 lastIndex['d']=4 < 6，不能弹出（后面没有'd'了）
  入栈'b'
  stack: ['a', 'c', 'd', 'b'], inStack: {a, c, d, b}

i=7, c='c':
  'c' already in stack，跳过

结果: "acdb"
```

## 为什么需要`inStack`集合？

字符只能出现一次，如果已经在结果中了，就不能再加入。

考虑`"bcabc"`：
- 处理完`"bca"`后，stack = ['a']，inStack = {a}
- 再遇到`'b'`，虽然`'a' < 'b'`可以入栈，但`'b'`之前被弹出了
- 不用`inStack`的话，会得到`"ab"`，而正确答案是`"abc"`

等等，让我们重新走一遍`"bcabc"`：

```
i=0, c='b':
  入栈 -> ['b']

i=1, c='c':
  'b' < 'c'，入栈 -> ['b', 'c']

i=2, c='a':
  'c' > 'a' 且 lastIndex['c']=4 > 2，弹出'c' -> ['b']
  'b' > 'a' 且 lastIndex['b']=3 > 2，弹出'b' -> []
  入栈'a' -> ['a']

i=3, c='b':
  'a' < 'b'，入栈 -> ['a', 'b']

i=4, c='c':
  'b' < 'c'，入栈 -> ['a', 'b', 'c']

结果: "abc"
```

## 代码变体：用数组代替Set和Map

```javascript
function removeDuplicateLetters(s) {
    const stack = [];
    const inStack = new Array(26).fill(false);  // 是否在栈中
    const count = new Array(26).fill(0);        // 剩余出现次数
    
    // 统计每个字符出现次数
    for (const c of s) {
        count[c.charCodeAt(0) - 97]++;
    }
    
    for (const c of s) {
        const idx = c.charCodeAt(0) - 97;
        count[idx]--;  // 剩余次数减1
        
        if (inStack[idx]) continue;  // 已在栈中
        
        // 贪心弹出
        while (
            stack.length &&
            stack[stack.length - 1] > c &&
            count[stack[stack.length - 1].charCodeAt(0) - 97] > 0
        ) {
            inStack[stack.pop().charCodeAt(0) - 97] = false;
        }
        
        stack.push(c);
        inStack[idx] = true;
    }
    
    return stack.join('');
}
```

这种实现用`count > 0`判断后面是否还有该字符，逻辑是一样的。

## 关键点总结

三个判断条件缺一不可：

1. **栈不空**：`stack.length > 0`
2. **栈顶更大**：`stack[top] > c`（贪心追求字典序最小）
3. **后面还有**：`lastIndex[stack[top]] > i`（保证不丢失字符）

## 复杂度分析

**时间复杂度：O(n)**
- 每个字符最多入栈、出栈各一次

**空间复杂度：O(1)**
- 栈最多存储26个字母
- `inStack`和`lastIndex`都是常数大小

## 相关题目

LeetCode 1081"不同字符的最小子序列"与本题完全相同，只是换了个说法。

## 小结

去除重复字母问题的核心：

1. **单调栈**：维护一个尽量递增的结果
2. **贪心条件**：只有后面还有的字符才能弹出
3. **去重**：用`inStack`记录避免重复加入

这道题的精妙之处在于将"去重"、"顺序"、"字典序"三个约束融合在一个简洁的单调栈框架中。它也提醒我们：单调栈不只是求"下一个更大/更小"，还可以用来维护满足特定条件的序列。
