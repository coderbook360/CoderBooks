# 实战：最长公共前缀

这道题有多种解法，是学习不同算法思维的好题目。

## 题目描述

> **LeetCode 14. 最长公共前缀**
>
> 编写一个函数来查找字符串数组中的最长公共前缀。
>
> 如果不存在公共前缀，返回空字符串 `""`。

**示例 1**：
```
输入：strs = ["flower", "flow", "flight"]
输出："fl"
```

**示例 2**：
```
输入：strs = ["dog", "racecar", "car"]
输出：""
解释：输入不存在公共前缀
```

## 解法一：横向扫描

思路：以第一个字符串为基准，逐个与后面的字符串比较，不断缩短公共前缀。

```javascript
function longestCommonPrefix(strs) {
    if (strs.length === 0) return '';
    
    let prefix = strs[0];
    
    for (let i = 1; i < strs.length; i++) {
        // 不断缩短前缀，直到它是 strs[i] 的前缀
        while (strs[i].indexOf(prefix) !== 0) {
            prefix = prefix.slice(0, -1);
            if (prefix === '') return '';
        }
    }
    
    return prefix;
}
```

执行过程：

```
strs = ["flower", "flow", "flight"]

prefix = "flower"

比较 "flow":
  "flow".indexOf("flower") !== 0
  prefix = "flowe"
  "flow".indexOf("flowe") !== 0
  prefix = "flow"
  "flow".indexOf("flow") === 0 ✓

比较 "flight":
  "flight".indexOf("flow") !== 0
  prefix = "flo"
  "flight".indexOf("flo") !== 0
  prefix = "fl"
  "flight".indexOf("fl") === 0 ✓

返回 "fl"
```

**复杂度分析**：
- 时间复杂度：O(m·n)——m 是平均字符串长度，n 是数组长度
- 空间复杂度：O(1)

## 解法二：纵向扫描

思路：逐列比较，检查所有字符串的同一位置。

```javascript
function longestCommonPrefix(strs) {
    if (strs.length === 0) return '';
    
    // 遍历第一个字符串的每个字符
    for (let i = 0; i < strs[0].length; i++) {
        const char = strs[0][i];
        
        // 检查其他字符串的同一位置
        for (let j = 1; j < strs.length; j++) {
            // 到达某字符串末尾，或者字符不匹配
            if (i >= strs[j].length || strs[j][i] !== char) {
                return strs[0].slice(0, i);
            }
        }
    }
    
    // 第一个字符串就是公共前缀
    return strs[0];
}
```

执行过程：

```
strs = ["flower", "flow", "flight"]

i=0: char='f'
  strs[1][0]='f' ✓
  strs[2][0]='f' ✓

i=1: char='l'
  strs[1][1]='l' ✓
  strs[2][1]='l' ✓

i=2: char='o'
  strs[1][2]='o' ✓
  strs[2][2]='i' ✗ → 返回 "fl"
```

纵向扫描的优点是：一旦发现不匹配可以立即返回，不需要比较后面的字符。

**复杂度分析**：
- 时间复杂度：O(m·n)
- 空间复杂度：O(1)

## 解法三：排序比较首尾

一个巧妙的思路：排序后，公共前缀一定是第一个和最后一个字符串的公共前缀。

为什么？因为字典序排序后：
- 第一个字符串是"最小"的
- 最后一个字符串是"最大"的
- 如果它们有公共前缀，那么中间所有字符串也一定有这个前缀

```javascript
function longestCommonPrefix(strs) {
    if (strs.length === 0) return '';
    
    strs.sort();
    
    const first = strs[0];
    const last = strs[strs.length - 1];
    
    let i = 0;
    while (i < first.length && first[i] === last[i]) {
        i++;
    }
    
    return first.slice(0, i);
}
```

**复杂度分析**：
- 时间复杂度：O(n·m·log n)——排序的时间
- 空间复杂度：O(log n)——排序的栈空间

虽然时间复杂度更高，但代码简洁。在字符串数量不大时是个好选择。

## 三种方法对比

| 方法 | 时间复杂度 | 空间复杂度 | 特点 |
|-----|-----------|-----------|------|
| 横向扫描 | O(m·n) | O(1) | 直观易懂 |
| 纵向扫描 | O(m·n) | O(1) | 可提前终止 |
| 排序比较 | O(n·m·log n) | O(log n) | 代码简洁 |

## 边界情况

```javascript
longestCommonPrefix([]);           // ""
longestCommonPrefix(["abc"]);      // "abc"
longestCommonPrefix(["", "abc"]);  // ""
```

## 本章小结

这道题展示了同一个问题的多种解法：

1. **横向扫描**：逐个比较，缩短前缀
2. **纵向扫描**：逐列比较，提前终止
3. **排序比较**：只比首尾

面试中推荐用纵向扫描，时间复杂度最优，且逻辑清晰。

下一章，我们来看「罗马数字转整数」。
