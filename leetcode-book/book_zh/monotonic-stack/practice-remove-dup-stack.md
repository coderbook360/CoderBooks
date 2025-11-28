# 实战：去除重复字母（单调栈）

这道题在第四部分已经讨论过，这里从单调栈的角度重新审视，加深对"构造最优序列"问题的理解。

## 问题回顾

给你一个字符串`s`，请去除字符串中重复的字母，使得每个字母只出现一次。需保证返回结果的字典序最小（要求不能打乱其他字符的相对位置）。

**示例**：
```
输入: s = "bcabc"
输出: "abc"

输入: s = "cbacdcbc"
输出: "acdb"
```

## 三个约束条件

1. **去重**：每个字符只能出现一次
2. **相对顺序**：只能删除，不能交换
3. **字典序最小**：在满足前两个条件下，结果尽可能小

## 单调栈 + 贪心

维护一个**尽量递增**的栈（字典序尽量小）：

```javascript
function removeDuplicateLetters(s) {
    const stack = [];                  // 单调递增栈
    const inStack = new Set();         // 字符是否已在栈中
    const lastIndex = new Map();       // 每个字符最后出现的位置
    
    // 预处理
    for (let i = 0; i < s.length; i++) {
        lastIndex.set(s[i], i);
    }
    
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        
        // 已在栈中，跳过
        if (inStack.has(c)) continue;
        
        // 贪心：尝试弹出栈顶的大字符
        while (
            stack.length &&
            c < stack[stack.length - 1] &&  // 当前更小
            lastIndex.get(stack[stack.length - 1]) > i  // 栈顶后面还会出现
        ) {
            inStack.delete(stack.pop());
        }
        
        stack.push(c);
        inStack.add(c);
    }
    
    return stack.join('');
}
```

## 弹出的条件

三个条件缺一不可：

1. **栈不空**：`stack.length > 0`
2. **当前字符更小**：`c < stack[top]`（追求字典序最小）
3. **栈顶字符后面还有**：`lastIndex[stack[top]] > i`（不能丢失字符）

```javascript
while (
    stack.length &&                              // 条件1
    c < stack[stack.length - 1] &&              // 条件2
    lastIndex.get(stack[stack.length - 1]) > i  // 条件3
) {
    inStack.delete(stack.pop());
}
```

## 执行过程图解

以`s = "cbacdcbc"`为例：

```
预处理 lastIndex: {c→7, b→6, a→2, d→4}

i=0, c='c':
  栈空，入栈
  stack=['c'], inStack={c}

i=1, c='b':
  'b' < 'c' 且 lastIndex['c']=7 > 1，弹出'c'
  stack=[], inStack={}
  入栈'b'
  stack=['b'], inStack={b}

i=2, c='a':
  'a' < 'b' 且 lastIndex['b']=6 > 2，弹出'b'
  stack=[], inStack={}
  入栈'a'
  stack=['a'], inStack={a}

i=3, c='c':
  'c' > 'a'，不弹出
  入栈'c'
  stack=['a','c'], inStack={a,c}

i=4, c='d':
  'd' > 'c'，不弹出
  入栈'd'
  stack=['a','c','d'], inStack={a,c,d}

i=5, c='c':
  'c' 已在栈中，跳过

i=6, c='b':
  'b' < 'd'，但 lastIndex['d']=4 < 6，不能弹出
  入栈'b'
  stack=['a','c','d','b'], inStack={a,c,d,b}

i=7, c='c':
  'c' 已在栈中，跳过

结果: "acdb"
```

## 为什么需要`inStack`？

每个字符只能出现一次。如果字符已经在结果中了，即使再次遇到也要跳过。

考虑`"abab"`：
- 处理完前两个字符后：stack=['a','b']
- 遇到第二个'a'时，如果不检查inStack，会试图再次加入'a'

## 变体：用数组代替Map和Set

```javascript
function removeDuplicateLetters(s) {
    const stack = [];
    const inStack = new Array(26).fill(false);
    const count = new Array(26).fill(0);
    
    for (const c of s) count[c.charCodeAt(0) - 97]++;
    
    for (const c of s) {
        const idx = c.charCodeAt(0) - 97;
        count[idx]--;
        
        if (inStack[idx]) continue;
        
        while (
            stack.length &&
            c < stack[stack.length - 1] &&
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

用`count[char] > 0`判断后面是否还有该字符，逻辑等价。

## 与"移掉K位数字"的对比

| 特点 | 去除重复字母 | 移掉K位数字 |
|------|-------------|-------------|
| 移除数量 | 不固定（重复的） | 固定k位 |
| 弹出条件 | 后面还有该字符 | 还有移除次数 |
| 额外约束 | 去重（每字符一次） | 无 |
| 入栈检查 | 需要检查是否已存在 | 不需要 |

## 等价问题

LeetCode 1081"不同字符的最小子序列"与本题完全相同，只是换了个说法：
- 316：去除重复字母
- 1081：最小不同字符子序列

## 复杂度分析

**时间复杂度：O(n)**
- 每个字符最多入栈出栈各一次

**空间复杂度：O(1)**
- 栈最多26个字符
- inStack和lastIndex/count都是常数大小

## 小结

去除重复字母的单调栈要点：

1. **单调递增**：尽量让小字符在前面
2. **三个弹出条件**：栈不空、当前更小、栈顶后面还有
3. **去重约束**：用inStack避免重复加入
4. **后面还有判断**：用lastIndex或count

这道题精妙地将"去重"、"顺序"、"字典序"三个约束统一在单调栈框架中，是"构造最优序列"问题的典范。
