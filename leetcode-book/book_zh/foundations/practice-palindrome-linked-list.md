# 回文链表

你有没有玩过这样的文字游戏：找一个正着读和倒着读都一样的词语？比如"上海自来水来自海上"，这就是回文。今天我们要在链表的世界里寻找这种"对称之美"——判断一个链表是否是回文链表。

## 问题描述

给你一个单链表的头节点`head`，请你判断该链表是否为回文链表。如果是，返回`true`；否则，返回`false`。

**示例1**：
```
输入: 1 → 2 → 2 → 1
输出: true
```

**示例2**：
```
输入: 1 → 2
输出: false
```

这道题看似简单，实则暗藏玄机。如果是数组，我们可以轻松地用双指针从两端向中间比较。但链表只能单向遍历，这该怎么办？

## 思路分析

### 解法一：转数组后双指针

最直观的想法：既然数组好比较，那就把链表转成数组嘛！

```javascript
function isPalindrome(head) {
    const values = [];
    
    // 把链表值存入数组
    let current = head;
    while (current) {
        values.push(current.val);
        current = current.next;
    }
    
    // 双指针比较
    let left = 0;
    let right = values.length - 1;
    
    while (left < right) {
        if (values[left] !== values[right]) {
            return false;
        }
        left++;
        right--;
    }
    
    return true;
}
```

这个解法简单明了，时间复杂度O(n)，但空间复杂度也是O(n)——我们额外存储了整个链表的值。

面试官追问："能否用O(1)的空间复杂度解决这个问题？"

### 解法二：快慢指针 + 反转后半部分

要在O(1)空间内判断回文，我们需要一个巧妙的策略：

**核心思路**：找到链表中点，反转后半部分，然后比较前后两部分是否相同。

这个方法综合运用了我们之前学过的两个技巧：
1. **快慢指针**：找链表中点
2. **链表反转**：反转后半部分

让我们分步骤来实现。

## 解法详解

### 第一步：找中点

用快慢指针找到链表的中间位置。快指针每次走两步，慢指针每次走一步，当快指针到达末尾时，慢指针正好在中间。

```javascript
let slow = head;
let fast = head;

while (fast.next && fast.next.next) {
    slow = slow.next;
    fast = fast.next.next;
}
// 此时slow指向前半部分的最后一个节点
```

为什么条件是`fast.next && fast.next.next`？这样可以让慢指针停在中间偏左的位置，方便后续操作。

**奇数长度链表**：
```
1 → 2 → 3 → 2 → 1
        ↑
       slow
```
slow停在中间节点3的前一个位置（节点2）。

**偶数长度链表**：
```
1 → 2 → 2 → 1
    ↑
   slow
```
slow停在前半部分的最后一个节点。

### 第二步：反转后半部分

从slow.next开始，反转后半部分链表：

```javascript
function reverseList(head) {
    let prev = null;
    while (head) {
        const next = head.next;
        head.next = prev;
        prev = head;
        head = next;
    }
    return prev;
}

let secondHalf = reverseList(slow.next);
```

以`1 → 2 → 2 → 1`为例：
- 反转前：后半部分是`2 → 1`
- 反转后：后半部分变成`1 → 2`

### 第三步：比较两部分

现在我们有两个链表：
- 前半部分：从head开始
- 反转后的后半部分：从secondHalf开始

逐一比较它们的值：

```javascript
let p1 = head;
let p2 = secondHalf;
let result = true;

while (p2) {  // 以后半部分为准
    if (p1.val !== p2.val) {
        result = false;
        break;
    }
    p1 = p1.next;
    p2 = p2.next;
}
```

注意：我们以后半部分的长度为准进行比较，因为它的长度不会超过前半部分。

### 第四步：恢复链表（可选）

在实际应用中，修改输入数据可能不是好习惯。如果需要保持链表的原始结构，我们应该把后半部分再反转回来：

```javascript
slow.next = reverseList(secondHalf);
```

## 完整实现

```javascript
/**
 * @param {ListNode} head
 * @return {boolean}
 */
function isPalindrome(head) {
    // 边界情况：空链表或单节点
    if (!head || !head.next) {
        return true;
    }
    
    // 1. 找中点
    let slow = head;
    let fast = head;
    while (fast.next && fast.next.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    // 2. 反转后半部分
    let secondHalf = reverseList(slow.next);
    
    // 3. 比较前后两部分
    let p1 = head;
    let p2 = secondHalf;
    let result = true;
    
    while (p2) {
        if (p1.val !== p2.val) {
            result = false;
            break;
        }
        p1 = p1.next;
        p2 = p2.next;
    }
    
    // 4. 恢复链表（可选，但建议保持）
    slow.next = reverseList(secondHalf);
    
    return result;
}

function reverseList(head) {
    let prev = null;
    while (head) {
        const next = head.next;
        head.next = prev;
        prev = head;
        head = next;
    }
    return prev;
}
```

## 执行过程图解

以`1 → 2 → 2 → 1`为例，完整展示执行过程：

**初始状态**：
```
1 → 2 → 2 → 1 → null
```

**步骤1：找中点**
```
快慢指针移动：
初始:  1 → 2 → 2 → 1
       ↑
     s,f

第一轮: 1 → 2 → 2 → 1
            ↑       ↑
           slow    fast

slow停在位置1（值为2的节点）
```

**步骤2：反转后半部分**
```
原链表: 1 → 2 → 2 → 1
            ↑
           slow

后半部分: 2 → 1
反转后:   1 → 2

链表变成:
1 → 2    1 ← 2
    ↓   
   null
```

**步骤3：比较**
```
p1: 1 → 2
p2: 1 → 2

比较 p1.val(1) 与 p2.val(1): 相等 ✓
比较 p1.val(2) 与 p2.val(2): 相等 ✓

结果: true
```

**步骤4：恢复链表**
```
将后半部分再次反转，恢复为:
1 → 2 → 2 → 1
```

再看一个奇数长度的例子`1 → 2 → 3 → 2 → 1`：

**找中点**：
```
1 → 2 → 3 → 2 → 1
        ↑       ↑
       slow    fast
```
slow停在值为2的节点（索引1）。

**反转后半部分**（3之后的部分）：
```
原: 2 → 1
反转后: 1 → 2
```

**比较**：
```
前半: 1 → 2
后半: 1 → 2
相等，是回文！
```

## 边界情况

| 输入 | 分析 | 结果 |
|------|------|------|
| `[]`（空链表） | 直接返回true | true |
| `[1]` | 单节点，自然是回文 | true |
| `[1,2]` | 1≠2，不是回文 | false |
| `[1,2,1]` | 奇数长度，中间节点不参与比较 | true |
| `[1,2,2,1]` | 偶数长度，前后对称 | true |
| `[1,2,3,2,1]` | 奇数长度，完美回文 | true |

## 复杂度分析

**时间复杂度：O(n)**
- 找中点：遍历一半，O(n/2)
- 反转后半部分：O(n/2)
- 比较：O(n/2)
- 恢复链表：O(n/2)
- 总计：O(2n) = O(n)

**空间复杂度：O(1)**
- 只使用了几个指针变量
- 没有使用额外的数据结构存储元素

## 思考题

**问题**：如果不允许修改原链表（包括临时修改），还能实现O(1)空间吗？

**答案**：很遗憾，不能。如果不修改链表，我们必须以某种方式存储信息来进行比较，这至少需要O(n)的空间（无论是数组还是递归栈）。

有一种递归解法可以利用调用栈来实现"从后往前"的访问：

```javascript
function isPalindrome(head) {
    let front = head;
    
    function check(current) {
        if (!current) return true;
        
        // 递归到末尾
        if (!check(current.next)) return false;
        
        // 回溯时比较
        if (current.val !== front.val) return false;
        
        front = front.next;
        return true;
    }
    
    return check(head);
}
```

但这使用了O(n)的递归栈空间，所以严格来说不是O(1)空间。

## 小结

回文链表问题是链表技巧的综合应用：

1. **快慢指针**：精准定位中点
2. **链表反转**：为比较创造条件
3. **双指针比较**：验证回文性质

这道题的精髓在于：**通过反转后半部分，把单向链表的比较问题转化为双向比较问题**。

在面试中，先展示转数组的解法表明你理解问题，再优化到O(1)空间解法展示你的算法功底。记得提到"恢复链表"这个细节，体现你对代码质量的重视。

下一章，我们将继续链表的实战，学习如何高效地移除链表中的指定元素。
