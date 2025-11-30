# 实战：反转字符串

这是双指针的经典入门题。

思路很简单，但它是很多复杂字符串操作的基础。

## 题目描述

> **LeetCode 344. 反转字符串**
>
> 编写一个函数，其作用是将输入的字符串反转过来。输入字符串以字符数组 `s` 的形式给出。
>
> 不要给另外的数组分配额外的空间，你必须**原地修改**输入数组、使用 **O(1)** 的额外空间解决这一问题。

**示例 1**：
```
输入：s = ["h", "e", "l", "l", "o"]
输出：["o", "l", "l", "e", "h"]
```

**示例 2**：
```
输入：s = ["H", "a", "n", "n", "a", "h"]
输出：["h", "a", "n", "n", "a", "H"]
```

## 解法：双指针交换

左右两个指针，从两端向中间移动，每次交换两个指针指向的元素。

```javascript
function reverseString(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        // 交换两端元素
        [s[left], s[right]] = [s[right], s[left]];
        left++;
        right--;
    }
}
```

### 执行过程

```
初始：["h", "e", "l", "l", "o"]
        ↑                   ↑
       left=0            right=4

交换 s[0] 和 s[4]：
      ["o", "e", "l", "l", "h"]
            ↑         ↑
          left=1   right=3

交换 s[1] 和 s[3]：
      ["o", "l", "l", "e", "h"]
                ↑
           left=2, right=2

left >= right，结束
```

**为什么 `left < right` 而不是 `left <= right`？**

当 `left === right` 时，指向同一个元素，交换没有意义。所以用 `<` 就够了。

**复杂度分析**：
- 时间复杂度：O(n)——每个元素最多被访问一次
- 空间复杂度：O(1)——只用了两个指针

## 递归解法

也可以用递归：

```javascript
function reverseString(s) {
    function helper(left, right) {
        if (left >= right) return;
        
        [s[left], s[right]] = [s[right], s[left]];
        helper(left + 1, right - 1);
    }
    
    helper(0, s.length - 1);
}
```

但递归有 O(n) 的栈空间开销，不满足 O(1) 空间的要求。面试中如果要求 O(1) 空间，用迭代。

## 常见错误

1. **返回新数组**：题目要求原地修改，不能 `return s.reverse()`

```javascript
// ❌ 错误：返回了新数组
function reverseString(s) {
    return s.reverse();
}

// ✅ 正确：原地修改
function reverseString(s) {
    s.reverse();  // 直接在原数组上操作
}
```

2. **使用内置方法**：虽然 `Array.reverse()` 可以过题，但面试中通常希望你手写

## 相关题目

- **541. 反转字符串 II**：每 2k 个字符反转前 k 个
- **557. 反转字符串中的单词 III**：反转每个单词

## 本章小结

反转字符串的核心就是**双指针交换**：

1. 左指针从头开始，右指针从尾开始
2. 交换两个指针指向的元素
3. 向中间移动，直到相遇

这个模式会在很多题目中出现，要熟练掌握。

下一章，我们来看「反转字符串中的单词」。
