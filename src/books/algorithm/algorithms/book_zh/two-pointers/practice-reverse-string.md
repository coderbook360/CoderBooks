# 实战：反转字符串

> LeetCode 344. 反转字符串 | 难度：简单

这是对撞指针的入门题，也是理解双指针最直观的例子。简单却蕴含着深刻的思想。

---

## 题目描述

编写一个函数，将输入的字符串反转过来。输入字符串以字符数组 `s` 的形式给出。

必须**原地修改**输入数组，使用 O(1) 的额外空间。

**示例**：
```
输入：s = ["h","e","l","l","o"]
输出：["o","l","l","e","h"]

输入：s = ["H","a","n","n","a","h"]
输出：["h","a","n","n","a","H"]
```

---

## 思路分析

反转字符串的本质是什么？

```
原数组：[h, e, l, l, o]
             ↓ 反转 ↓
结果：  [o, l, l, e, h]
```

观察位置变化：
- 第 1 个字符 `h` → 第 5 个位置
- 第 5 个字符 `o` → 第 1 个位置
- 第 2 个字符 `e` → 第 4 个位置
- 第 4 个字符 `l` → 第 2 个位置
- ...

规律：**位置 i 和位置 n-1-i 交换**

这正是对撞指针的经典场景：**两端向中间，逐对交换**。

---

## 代码实现

### 基础版本

```typescript
function reverseString(s: string[]): void {
  let left = 0;
  let right = s.length - 1;
  
  while (left < right) {
    // 交换 left 和 right 位置的字符
    [s[left], s[right]] = [s[right], s[left]];
    
    // 指针向中间移动
    left++;
    right--;
  }
}
```

### 使用临时变量

```typescript
function reverseString(s: string[]): void {
  let left = 0;
  let right = s.length - 1;
  
  while (left < right) {
    const temp = s[left];
    s[left] = s[right];
    s[right] = temp;
    
    left++;
    right--;
  }
}
```

### 使用 for 循环

```typescript
function reverseString(s: string[]): void {
  const n = s.length;
  
  for (let i = 0; i < n / 2; i++) {
    const j = n - 1 - i;
    [s[i], s[j]] = [s[j], s[i]];
  }
}
```

---

## 执行过程可视化

```
初始：["h", "e", "l", "l", "o"]
        ↑                   ↑
      left=0             right=4

第1步：交换 s[0] 和 s[4]
      ["o", "e", "l", "l", "h"]
            ↑           ↑
          left=1     right=3

第2步：交换 s[1] 和 s[3]
      ["o", "l", "l", "e", "h"]
                ↑   ↑
            left=2 right=2

第3步：left >= right，停止
      ["o", "l", "l", "e", "h"] ✓
```

**偶数长度情况**：
```
["a", "b", "c", "d"]
  ↑             ↑
left=0       right=3

交换后：["d", "b", "c", "a"]
            ↑   ↑
        left=1 right=2

交换后：["d", "c", "b", "a"]
              ↑ ↑
          left=2 right=1

left > right，停止 ✓
```

---

## 复杂度分析

**时间复杂度**：O(n)
- 每个字符被访问一次
- 共执行 n/2 次交换

**空间复杂度**：O(1)
- 只使用了两个指针变量（或一个临时变量）

---

## 对撞指针模式总结

这道题展示了对撞指针的核心模式：

```typescript
function collisionPointer(arr: T[]): void {
  let left = 0;
  let right = arr.length - 1;
  
  while (left < right) {
    // 1. 根据条件处理当前元素
    // 2. 移动指针
    left++;
    right--;
  }
}
```

**适用场景**：
- 两端向中间扫描
- 需要比较或交换首尾元素
- 数组是有序的，需要找满足条件的两个数

---

## 常见错误

**错误1：循环条件写成 <=**
```typescript
// 错误：会导致中间元素自己和自己交换
while (left <= right) {  // ❌

// 正确
while (left < right) {  // ✅
```

**错误2：忘记移动指针**
```typescript
while (left < right) {
  [s[left], s[right]] = [s[right], s[left]];
  // 忘记 left++ 和 right--  ❌ 死循环
}
```

**错误3：使用额外空间**
```typescript
// 错误：使用了 O(n) 额外空间
return s.reverse();  // ❌ 题目要求原地修改

// 或者
const result = [];
for (let i = s.length - 1; i >= 0; i--) {
  result.push(s[i]);  // ❌ O(n) 空间
}
```

---

## 递归解法（面试加分）

```typescript
function reverseString(s: string[]): void {
  reverse(s, 0, s.length - 1);
}

function reverse(s: string[], left: number, right: number): void {
  if (left >= right) return;
  
  [s[left], s[right]] = [s[right], s[left]];
  reverse(s, left + 1, right - 1);
}
```

**注意**：递归使用 O(n) 的栈空间，不满足 O(1) 空间的严格要求。

---

## 相关题目

| 题目 | 难度 | 说明 |
|-----|------|------|
| [541. 反转字符串 II](https://leetcode.com/problems/reverse-string-ii/) | 简单 | 每 2k 个反转 k 个 |
| [557. 反转字符串中的单词 III](https://leetcode.com/problems/reverse-words-in-a-string-iii/) | 简单 | 反转每个单词 |
| [151. 反转字符串中的单词](https://leetcode.com/problems/reverse-words-in-a-string/) | 中等 | 反转单词顺序 |
| [345. 反转字符串中的元音字母](https://leetcode.com/problems/reverse-vowels-of-a-string/) | 简单 | 只反转元音 |

---

## 扩展：反转链表

反转字符串和反转链表的思想类似，都是改变元素的顺序：

```typescript
// 反转链表（迭代）
function reverseList(head: ListNode): ListNode {
  let prev = null;
  let curr = head;
  
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  
  return prev;
}
```

---

## 总结

反转字符串的核心要点：

1. **对撞指针**：left 从左，right 从右
2. **交换操作**：`[s[left], s[right]] = [s[right], s[left]]`
3. **终止条件**：`left < right`（注意不是 <=）
4. **指针移动**：每次交换后 left++, right--
5. **原地修改**：不能使用额外数组

掌握这个基本模式后，面对更复杂的对撞指针问题时，只需要修改"操作"部分的逻辑。
