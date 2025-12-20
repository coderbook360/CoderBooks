# 实战：回文链表

判断链表是否是回文结构，综合运用快慢指针和链表反转。

## 题目描述

> **LeetCode 234. 回文链表**
>
> 给你一个单链表的头节点 head，请你判断该链表是否为回文链表。

**示例**：

```
输入：head = [1,2,2,1]
输出：true

输入：head = [1,2]
输出：false
```

**进阶**：你能否用 O(n) 时间复杂度和 O(1) 空间复杂度解决此题？

## 解法一：转为数组

最简单的方法：把链表转成数组，然后双指针判断回文。

```javascript
function isPalindrome(head) {
    const arr = [];
    let curr = head;
    while (curr !== null) {
        arr.push(curr.val);
        curr = curr.next;
    }
    
    let left = 0, right = arr.length - 1;
    while (left < right) {
        if (arr[left] !== arr[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}
```

- **时间**：O(n)
- **空间**：O(n)

## 解法二：快慢指针 + 反转（O(1) 空间）

核心思路：
1. 用快慢指针找到链表中点
2. 反转后半部分链表
3. 比较前半部分和反转后的后半部分

```javascript
function isPalindrome(head) {
    if (head === null || head.next === null) {
        return true;
    }
    
    // 1. 找中点
    let slow = head, fast = head;
    while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // 2. 反转后半部分
    let secondHalf = reverseList(slow);
    
    // 3. 比较
    let p1 = head, p2 = secondHalf;
    while (p2 !== null) {
        if (p1.val !== p2.val) {
            return false;
        }
        p1 = p1.next;
        p2 = p2.next;
    }
    
    return true;
}

function reverseList(head) {
    let prev = null;
    let curr = head;
    while (curr !== null) {
        const next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}
```

### 执行过程

```
head = [1,2,2,1]

1. 找中点：
slow: 1 → 2 → 2
fast: 1 → 2 → null
slow 停在第三个节点（值为 2）

2. 反转后半部分：
原：2 → 1 → null
反转后：1 → 2 → null

3. 比较：
p1: 1 → 2 → ...
p2: 1 → 2 → null
比较 1 == 1 ✓
比较 2 == 2 ✓
p2 = null，结束

返回 true
```

### 复杂度

- **时间**：O(n)
- **空间**：O(1)

## 奇偶长度的处理

对于奇数长度的链表，中间元素不需要比较：

```
[1,2,3,2,1]
前半：1 → 2 → 3
后半反转后：1 → 2 → 3
比较：1==1, 2==2, 3==3 ✓

因为 p2 以反转后的后半部分为准，
中间元素会被自动跳过或自己比较自己
```

## 恢复链表（可选）

如果需要保持原链表不变，比较完后可以再次反转后半部分：

```javascript
// 比较完后恢复
reverseList(secondHalf);
```

## 本章小结

回文链表是综合题，用到了多个技巧：

1. **快慢指针**：找链表中点
2. **链表反转**：反转后半部分
3. **双指针比较**：前后两部分逐一比较

这道题展示了如何组合多个基本操作解决复杂问题。
