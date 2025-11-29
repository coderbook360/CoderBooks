# 双指针基础理论

双指针是算法中最实用的技巧之一。通过两个指针的协同移动，可以将很多O(n²)的暴力解法优化到O(n)。掌握双指针，是进阶算法的必经之路。

## 什么是双指针？

双指针并不是什么高深的数据结构，它只是一种**遍历策略**：用两个变量（指针）在数组或链表中移动，通过它们的配合来解决问题。

根据两个指针的移动方向，双指针可以分为两大类：

### 1. 相向双指针（对撞指针）

两个指针从两端向中间移动，直到相遇。

```
[1, 2, 3, 4, 5, 6, 7]
 ↑                 ↑
left             right
       ↓   ↓
     相向移动
```

典型应用：
- 有序数组的两数之和
- 判断回文串
- 盛最多水的容器
- 接雨水

### 2. 同向双指针（快慢指针）

两个指针从同一端出发，以不同的速度或条件移动。

```
[1, 2, 3, 4, 5, 6, 7]
 ↑  ↑
slow fast
 ↓  ↓
同向移动
```

典型应用：
- 删除有序数组的重复项
- 移动零
- 链表找环
- 链表找中点

## 相向双指针详解

### 核心模板

```javascript
function twoPointers(arr) {
    let left = 0;
    let right = arr.length - 1;
    
    while (left < right) {
        // 根据条件移动指针
        if (/* 需要收缩左边 */) {
            left++;
        } else if (/* 需要收缩右边 */) {
            right--;
        } else {
            // 找到答案或其他处理
        }
    }
}
```

### 为什么有效？

以"有序数组两数之和"为例：

```
目标：在有序数组中找两个数，和为target

数组：[1, 2, 4, 6, 8, 10]，target = 10

暴力：O(n²)，检查所有pair

双指针：
left=0, right=5: 1+10=11 > 10, right--
left=0, right=4: 1+8=9 < 10, left++
left=1, right=4: 2+8=10 = 10, 找到！
```

关键洞察：
- 如果当前和太大，右指针左移（减少和）
- 如果当前和太小，左指针右移（增加和）
- **每次操作都能排除一行或一列的可能性**

## 同向双指针详解

### 核心模板

```javascript
function fastSlowPointers(arr) {
    let slow = 0;
    
    for (let fast = 0; fast < arr.length; fast++) {
        if (/* 满足某个条件 */) {
            arr[slow] = arr[fast];
            slow++;
        }
    }
    
    return slow;  // 新数组的长度
}
```

### 典型应用：移除元素

```javascript
function removeElement(nums, val) {
    let slow = 0;
    
    for (let fast = 0; fast < nums.length; fast++) {
        if (nums[fast] !== val) {
            nums[slow] = nums[fast];
            slow++;
        }
    }
    
    return slow;
}
```

`slow`指向"新数组的末尾"，`fast`扫描原数组。不等于val的元素被"保留"到新数组。

## 链表中的双指针

链表问题中，双指针尤为重要，因为链表没有随机访问能力。

### 快慢指针找环

```javascript
function hasCycle(head) {
    let slow = head;
    let fast = head;
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow === fast) {
            return true;
        }
    }
    
    return false;
}
```

为什么有效？如果有环，快指针最终会"追上"慢指针。

### 找链表中点

```javascript
function findMiddle(head) {
    let slow = head;
    let fast = head;
    
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    
    return slow;
}
```

快指针走两步，慢指针走一步。快指针到终点时，慢指针正好在中间。

## 双指针的适用条件

双指针不是万能的，它适用于：

1. **有序数组**：相向双指针通常需要数组有序
2. **需要原地修改**：同向双指针擅长原地操作
3. **存在单调性**：指针移动方向与目标有明确关系

不适用于：
- 无序数组的两数之和（用哈希表更好）
- 需要检查所有组合的问题
- 没有明确移动规则的问题

## 小结

双指针的核心是**用空间换时间**的逆向操作——用两个指针的巧妙配合，减少不必要的遍历：

| 类型 | 适用场景 | 时间复杂度 |
|------|---------|-----------|
| 相向双指针 | 有序数组、回文、区间 | O(n) |
| 同向双指针 | 原地修改、滑动窗口 | O(n) |
| 快慢指针 | 链表环、链表中点 | O(n) |

下一章我们详细讲解快慢指针和对撞指针的更多应用。
