# 实战：反转字符串

这是双指针最简单的应用，用对撞指针原地反转数组。

## 问题描述

编写一个函数，其作用是将输入的字符串反转过来。输入字符串以字符数组`s`的形式给出。

不要给另外的数组分配额外的空间，必须**原地**修改输入数组、使用O(1)的额外空间解决这一问题。

**示例**：
```
输入：s = ["h","e","l","l","o"]
输出：["o","l","l","e","h"]

输入：s = ["H","a","n","n","a","h"]
输出：["h","a","n","n","a","H"]
```

## 思路分析

反转就是把首尾元素交换，然后向中间移动，继续交换。这正是对撞指针的典型场景。

```
["h","e","l","l","o"]
  ↑               ↑
 left           right

交换后：
["o","e","l","l","h"]
      ↑       ↑
    left    right

交换后：
["o","l","l","e","h"]
          ↑
      left=right，结束
```

## 解法实现

```javascript
/**
 * @param {character[]} s
 * @return {void} Do not return anything, modify s in-place instead.
 */
function reverseString(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        // 交换
        [s[left], s[right]] = [s[right], s[left]];
        left++;
        right--;
    }
}
```

就这么简单！

## 其他写法

### for循环版本

```javascript
function reverseString(s) {
    for (let i = 0, j = s.length - 1; i < j; i++, j--) {
        [s[i], s[j]] = [s[j], s[i]];
    }
}
```

### 递归版本（不推荐）

```javascript
function reverseString(s, left = 0, right = s.length - 1) {
    if (left >= right) return;
    [s[left], s[right]] = [s[right], s[left]];
    reverseString(s, left + 1, right - 1);
}
```

递归版本会使用O(n)栈空间，不符合题目要求。

## 复杂度分析

**时间复杂度**：O(n)
- 每个元素最多被访问一次

**空间复杂度**：O(1)
- 只用了两个指针变量

## 扩展：反转字符串中的单词

如果要反转句子中每个单词的字符：

```
"Let's take LeetCode contest"
→ "s'teL ekat edoCteeL tsetnoc"
```

思路：找到每个单词的边界，对每个单词应用反转。

```javascript
function reverseWords(s) {
    const arr = s.split('');
    let start = 0;
    
    for (let i = 0; i <= arr.length; i++) {
        if (i === arr.length || arr[i] === ' ') {
            reverse(arr, start, i - 1);
            start = i + 1;
        }
    }
    
    return arr.join('');
}

function reverse(arr, left, right) {
    while (left < right) {
        [arr[left], arr[right]] = [arr[right], arr[left]];
        left++;
        right--;
    }
}
```

## 小结

反转字符串虽然简单，但它展示了对撞指针的核心思想：

1. **两端出发**：left从头，right从尾
2. **向中间收缩**：每次操作后指针相向移动
3. **终止条件**：`left < right`时继续，相遇时结束

掌握这个基础，后面的对撞指针问题就有了坚实的基础。
