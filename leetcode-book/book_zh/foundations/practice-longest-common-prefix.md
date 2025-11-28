# 实战：最长公共前缀

这道题来自 LeetCode 第 14 题，考察如何在多个字符串中找到共同的前缀部分。

## 题目描述

编写一个函数来查找字符串数组中的最长公共前缀。如果不存在公共前缀，返回空字符串 `""`。

**示例**：

```
输入：strs = ["flower","flow","flight"]
输出："fl"

输入：strs = ["dog","racecar","car"]
输出：""
解释：不存在公共前缀
```

## 方法一：纵向扫描

想象把所有字符串垂直排列：

```
f l o w e r
f l o w
f l i g h t
```

从第一列开始，逐列比较，直到发现不同的字符或某个字符串到达末尾。

```javascript
function longestCommonPrefix(strs) {
    if (strs.length === 0) return "";
    
    // 以第一个字符串为基准
    const first = strs[0];
    
    // 检查每一列
    for (let i = 0; i < first.length; i++) {
        const char = first[i];
        
        // 与其他字符串的第 i 个字符比较
        for (let j = 1; j < strs.length; j++) {
            // 到达某个字符串末尾，或字符不匹配
            if (i >= strs[j].length || strs[j][i] !== char) {
                return first.substring(0, i);
            }
        }
    }
    
    // 第一个字符串本身就是公共前缀
    return first;
}
```

## 方法二：横向扫描

另一种思路是两两比较：先找前两个字符串的公共前缀，再用这个前缀与第三个比较，依此类推。

```javascript
function longestCommonPrefix(strs) {
    if (strs.length === 0) return "";
    
    let prefix = strs[0];
    
    for (let i = 1; i < strs.length; i++) {
        prefix = commonPrefix(prefix, strs[i]);
        
        // 提前终止
        if (prefix === "") {
            return "";
        }
    }
    
    return prefix;
}

function commonPrefix(str1, str2) {
    const minLen = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLen; i++) {
        if (str1[i] !== str2[i]) {
            return str1.substring(0, i);
        }
    }
    
    return str1.substring(0, minLen);
}
```

## 图解执行过程

以 `["flower", "flow", "flight"]` 为例（纵向扫描）：

```
第 0 列：'f' == 'f' == 'f' ✓
第 1 列：'l' == 'l' == 'l' ✓
第 2 列：'o' == 'o' != 'i' ✗

返回 "fl"
```

以 `["dog", "racecar", "car"]` 为例（纵向扫描）：

```
第 0 列：'d' != 'r' ✗

返回 ""
```

## 方法三：分治法（选读）

将数组分成两半，分别求公共前缀，再合并。

```javascript
function longestCommonPrefix(strs) {
    if (strs.length === 0) return "";
    return divideAndConquer(strs, 0, strs.length - 1);
}

function divideAndConquer(strs, left, right) {
    if (left === right) {
        return strs[left];
    }
    
    const mid = Math.floor((left + right) / 2);
    const leftPrefix = divideAndConquer(strs, left, mid);
    const rightPrefix = divideAndConquer(strs, mid + 1, right);
    
    return commonPrefix(leftPrefix, rightPrefix);
}

function commonPrefix(str1, str2) {
    const minLen = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLen; i++) {
        if (str1[i] !== str2[i]) {
            return str1.substring(0, i);
        }
    }
    
    return str1.substring(0, minLen);
}
```

## 复杂度分析

设有 n 个字符串，最短字符串长度为 m。

**纵向扫描**：
- 时间复杂度：O(n × m)，最坏情况检查所有字符
- 空间复杂度：O(1)

**横向扫描**：
- 时间复杂度：O(n × m)
- 空间复杂度：O(1)

**分治法**：
- 时间复杂度：O(n × m)
- 空间复杂度：O(m × log n)，递归栈

三种方法时间复杂度相同，纵向和横向扫描更简单实用。

## 边界情况

1. **空数组**：返回 `""`
2. **只有一个字符串**：返回该字符串本身
3. **存在空字符串**：公共前缀是 `""`
4. **所有字符串相同**：公共前缀就是该字符串

## 小结

最长公共前缀是一个直观的字符串题：

1. **纵向扫描**：逐列比较，发现不同立即停止
2. **横向扫描**：两两求公共前缀，逐步缩小
3. **分治法**：分组求解，合并结果

在面试中，纵向扫描是最推荐的写法，简洁高效。

下一章，我们来看一道有趣的题——"罗马数字转整数"。
