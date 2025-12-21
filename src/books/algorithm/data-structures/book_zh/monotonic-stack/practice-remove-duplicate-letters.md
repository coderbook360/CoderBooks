# 实战：去除重复字母

给你一个字符串，去除重复字母，使每个字母只出现一次，同时保证结果的字典序最小。

这道题结合了单调栈和贪心策略。

---

## 问题描述

**LeetCode 316. Remove Duplicate Letters**

给你一个字符串 s，请你去除字符串中重复的字母，使得每个字母只出现一次。需保证返回结果的字典序最小。

**示例**：
```
输入：s = "bcabc"
输出："abc"

输入：s = "cbacdcbc"
输出："acdb"
```

---

## 思路分析

要字典序最小，我们希望小的字母尽量靠前。但有限制：每个字母必须保留一个。

策略：
1. 维护单调递增栈
2. 当前字母比栈顶小时，考虑弹出栈顶
3. 但如果栈顶字母在后面不会再出现，就不能弹出

---

## 解法

```javascript
function removeDuplicateLetters(s) {
  const stack = [];
  const inStack = new Set();  // 记录哪些字母已在栈中
  const lastIndex = new Map();  // 每个字母最后出现的位置
  
  // 预处理最后出现位置
  for (let i = 0; i < s.length; i++) {
    lastIndex.set(s[i], i);
  }
  
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    
    // 如果已在栈中，跳过
    if (inStack.has(char)) continue;
    
    // 弹出比当前大且后面还会出现的字母
    while (
      stack.length > 0 &&
      char < stack[stack.length - 1] &&
      lastIndex.get(stack[stack.length - 1]) > i
    ) {
      inStack.delete(stack.pop());
    }
    
    stack.push(char);
    inStack.add(char);
  }
  
  return stack.join('');
}
```

---

## 执行过程

```
s = "cbacdcbc"
lastIndex: c=7, b=6, a=2, d=4

i=0, 'c': stack=['c']
i=1, 'b': b<c, c后面还有(7>1), pop c, stack=['b']
i=2, 'a': a<b, b后面还有(6>2), pop b, stack=['a']
i=3, 'c': stack=['a','c']
i=4, 'd': stack=['a','c','d']
i=5, 'c': c已在栈中，跳过
i=6, 'b': b<d, 但d后面没有了(4<6), 不能pop
          stack=['a','c','d','b']
i=7, 'c': c已在栈中，跳过

结果："acdb"
```

---

## 三个关键条件

弹出栈顶需要同时满足：
1. `char < stack.top()`：当前字母更小
2. `lastIndex[stack.top()] > i`：栈顶字母后面还会出现
3. `!inStack.has(char)`：当前字母还没入栈

---

## 复杂度

- 时间：O(n)
- 空间：O(1)，最多26个字母
