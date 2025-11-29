# 实战：同构字符串

这道题考察的是**双向映射**——两个字符串中的字符必须建立一一对应的关系。

## 问题描述

给定两个字符串`s`和`t`，判断它们是否是同构的。

如果`s`中的字符可以按某种映射关系替换得到`t`，那么这两个字符串是同构的。

每个出现的字符都应当映射到另一个字符，同时不改变字符的顺序。不同字符不能映射到同一个字符上，相同字符只能映射到同一个字符上，字符可以映射到自己本身。

**示例**：
```
输入: s = "egg", t = "add"
输出: true
解释: e→a, g→d

输入: s = "foo", t = "bar"
输出: false
解释: o不能同时映射到a和r

输入: s = "paper", t = "title"
输出: true
解释: p→t, a→i, e→l, r→e
```

## 思路分析

### 关键约束

两个字符串是同构的，需要满足：
1. **s到t的映射唯一**：s中的同一个字符必须映射到t中的同一个字符
2. **t到s的映射唯一**：t中的同一个字符必须来自s中的同一个字符

简单说就是**一一对应**，需要双向检查。

### 为什么需要双向映射？

只检查单向会出错：

```
s = "badc", t = "baba"
单向检查：b→b, a→a, d→b, c→a ✓
但实际上 t 中的 b 来自 s 中的 b 和 d 两个字符，不是一一对应
```

## 完整实现

```javascript
/**
 * @param {string} s
 * @param {string} t
 * @return {boolean}
 */
function isIsomorphic(s, t) {
    if (s.length !== t.length) return false;
    
    const s2t = new Map();  // s → t 的映射
    const t2s = new Map();  // t → s 的映射
    
    for (let i = 0; i < s.length; i++) {
        const cs = s[i], ct = t[i];
        
        // 检查 s→t 映射是否一致
        if (s2t.has(cs) && s2t.get(cs) !== ct) {
            return false;
        }
        
        // 检查 t→s 映射是否一致
        if (t2s.has(ct) && t2s.get(ct) !== cs) {
            return false;
        }
        
        // 建立双向映射
        s2t.set(cs, ct);
        t2s.set(ct, cs);
    }
    
    return true;
}
```

## 执行过程图解

以`s = "paper"`, `t = "title"`为例：

```
i=0: s[0]='p', t[0]='t'
  s2t 中无 'p', t2s 中无 't'
  建立映射: s2t={p→t}, t2s={t→p}

i=1: s[1]='a', t[1]='i'
  s2t 中无 'a', t2s 中无 'i'
  建立映射: s2t={p→t, a→i}, t2s={t→p, i→a}

i=2: s[2]='p', t[2]='t'
  s2t.get('p') = 't' = t[2] ✓
  t2s.get('t') = 'p' = s[2] ✓
  映射一致

i=3: s[3]='e', t[3]='l'
  s2t 中无 'e', t2s 中无 'l'
  建立映射: s2t={p→t, a→i, e→l}, t2s={t→p, i→a, l→e}

i=4: s[4]='r', t[4]='e'
  s2t 中无 'r', t2s 中无 'e'
  建立映射: s2t={p→t, a→i, e→l, r→e}, t2s={t→p, i→a, l→e, e→r}

遍历完成，返回 true
```

以`s = "foo"`, `t = "bar"`为例：

```
i=0: s[0]='f', t[0]='b'
  建立映射: s2t={f→b}, t2s={b→f}

i=1: s[1]='o', t[1]='a'
  建立映射: s2t={f→b, o→a}, t2s={b→f, a→o}

i=2: s[2]='o', t[2]='r'
  s2t.get('o') = 'a' ≠ 'r'
  返回 false
```

## 简化写法

合并两个条件判断：

```javascript
function isIsomorphic(s, t) {
    if (s.length !== t.length) return false;
    
    const s2t = new Map();
    const t2s = new Map();
    
    for (let i = 0; i < s.length; i++) {
        const cs = s[i], ct = t[i];
        
        if ((s2t.has(cs) && s2t.get(cs) !== ct) ||
            (t2s.has(ct) && t2s.get(ct) !== cs)) {
            return false;
        }
        
        s2t.set(cs, ct);
        t2s.set(ct, cs);
    }
    
    return true;
}
```

## 另一种思路：记录首次出现位置

如果两个字符串同构，它们的"模式"应该相同：

```javascript
function isIsomorphic(s, t) {
    if (s.length !== t.length) return false;
    
    const pattern = str => {
        const map = new Map();
        return [...str].map(c => {
            if (!map.has(c)) {
                map.set(c, map.size);
            }
            return map.get(c);
        }).join(',');
    };
    
    return pattern(s) === pattern(t);
}

// "egg" → "0,1,1"
// "add" → "0,1,1"
// 模式相同，是同构
```

这种方法更巧妙，但效率稍低。

## 使用数组优化

如果字符集有限（如ASCII），可以用数组：

```javascript
function isIsomorphic(s, t) {
    if (s.length !== t.length) return false;
    
    const s2t = new Array(128).fill(0);
    const t2s = new Array(128).fill(0);
    
    for (let i = 0; i < s.length; i++) {
        const cs = s.charCodeAt(i);
        const ct = t.charCodeAt(i);
        
        if (s2t[cs] !== t2s[ct]) {
            return false;
        }
        
        // 存储位置+1（区分未设置的0）
        s2t[cs] = i + 1;
        t2s[ct] = i + 1;
    }
    
    return true;
}
```

**技巧**：用"最后出现位置"代替"映射到的字符"。如果两个字符的最后出现位置不同，说明映射不一致。

## 复杂度分析

**时间复杂度：O(n)**
- 遍历字符串一次

**空间复杂度：O(字符集大小)**
- 两个Map最多存储字符集大小的映射

## 小结

同构字符串的核心：

1. **双向映射**：必须检查s→t和t→s两个方向
2. **一一对应**：不同字符不能映射到同一个字符
3. **Map记录**：存储已建立的映射关系

这道题的"双向映射"思想在很多匹配问题中都会用到，比如下一题"单词规律"就是它的变体。
