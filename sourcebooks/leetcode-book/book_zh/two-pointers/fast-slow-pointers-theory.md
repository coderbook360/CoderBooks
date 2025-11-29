# 快慢指针与对撞指针

上一章我们介绍了双指针的基本概念。这一章深入讲解两种最常用的双指针模式：快慢指针和对撞指针，并通过经典例题来掌握它们的使用技巧。

## 对撞指针（相向双指针）

对撞指针从数组两端出发，向中间靠拢。它特别适合处理**有序数组**和**回文问题**。

### 模式一：两数之和（有序数组）

```javascript
function twoSum(nums, target) {
    let left = 0;
    let right = nums.length - 1;
    
    while (left < right) {
        const sum = nums[left] + nums[right];
        
        if (sum === target) {
            return [left, right];
        } else if (sum < target) {
            left++;   // 和太小，需要更大的数
        } else {
            right--;  // 和太大，需要更小的数
        }
    }
    
    return [-1, -1];
}
```

**为什么有效？**

关键在于**有序性**带来的单调性：
- `left`右移，`sum`增大
- `right`左移，`sum`减小

每次移动都朝着目标前进，不会错过答案。

### 模式二：验证回文串

```javascript
function isPalindrome(s) {
    let left = 0;
    let right = s.length - 1;
    
    while (left < right) {
        if (s[left] !== s[right]) {
            return false;
        }
        left++;
        right--;
    }
    
    return true;
}
```

对撞指针同时检查首尾字符，天然适合回文这种"对称"结构。

### 模式三：盛最多水的容器

```javascript
function maxArea(height) {
    let left = 0;
    let right = height.length - 1;
    let maxWater = 0;
    
    while (left < right) {
        const water = Math.min(height[left], height[right]) * (right - left);
        maxWater = Math.max(maxWater, water);
        
        // 移动较矮的那一边
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    
    return maxWater;
}
```

**为什么移动较矮的一边？**

面积 = 宽度 × 高度（取决于较矮的柱子）

- 移动较矮的一边：可能找到更高的柱子，面积可能增大
- 移动较高的一边：宽度减小，高度不变或变小，面积必定不增

所以移动较矮的一边是**唯一可能找到更大面积的选择**。

## 快慢指针（同向双指针）

快慢指针从同一端出发，以不同速度或规则移动。它适合处理**原地修改**和**链表问题**。

### 模式一：移除元素

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

- `fast`扫描所有元素
- `slow`指向"保留区"的末尾
- 遇到不等于val的元素，复制到保留区

### 模式二：删除有序数组的重复项

```javascript
function removeDuplicates(nums) {
    if (nums.length === 0) return 0;
    
    let slow = 0;
    
    for (let fast = 1; fast < nums.length; fast++) {
        if (nums[fast] !== nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    
    return slow + 1;
}
```

- `slow`指向"已处理区"的最后一个元素
- `fast`扫描后续元素
- 遇到不同的元素，扩展已处理区

### 模式三：链表检测环

```javascript
function hasCycle(head) {
    if (!head || !head.next) return false;
    
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

**为什么能检测到环？**

想象两个人在环形跑道上跑步，快的人每次跑两步，慢的人每次跑一步。无论环多大，快的人最终会追上慢的人。

### 模式四：找链表中点

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

快指针走两步，慢指针走一步。当快指针到达终点时，慢指针正好在中间。

```
1 → 2 → 3 → 4 → 5
    s       f

1 → 2 → 3 → 4 → 5 → null
        s               f

慢指针指向中点3
```

### 模式五：找环的入口

```javascript
function detectCycle(head) {
    let slow = head;
    let fast = head;
    
    // 第一阶段：找到相遇点
    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        
        if (slow === fast) {
            // 第二阶段：找环入口
            let ptr = head;
            while (ptr !== slow) {
                ptr = ptr.next;
                slow = slow.next;
            }
            return ptr;
        }
    }
    
    return null;
}
```

这是Floyd算法的经典应用，数学证明略复杂，但记住结论：**从头节点和相遇点同时出发，相遇处即为环入口**。

## 对比与选择

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 有序数组求和 | 对撞指针 | 利用有序性 |
| 回文判断 | 对撞指针 | 利用对称性 |
| 原地删除元素 | 快慢指针 | 一次遍历完成 |
| 链表环问题 | 快慢指针 | 只能单向遍历 |
| 链表倒数第k个 | 快慢指针 | 先让快指针走k步 |

## 常见技巧

### 1. 去重技巧

在需要跳过重复元素时：
```javascript
while (left < right && nums[left] === nums[left - 1]) left++;
while (left < right && nums[right] === nums[right + 1]) right--;
```

### 2. 边界处理

始终注意：
- `left < right` vs `left <= right`
- 先移动还是先判断
- 空数组和单元素数组

### 3. 链表安全访问

在链表中使用快指针前检查：
```javascript
while (fast && fast.next) {
    // 确保fast.next.next不会越界
}
```

## 小结

双指针的两种模式各有所长：

- **对撞指针**：适合有序、对称问题，两端向中间收缩
- **快慢指针**：适合原地修改、链表问题，同向不同速

掌握这两种模式，能够解决大部分双指针问题。接下来我们通过实战题目来深化理解。
