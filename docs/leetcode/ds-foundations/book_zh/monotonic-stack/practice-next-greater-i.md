# 实战：下一个更大元素 I

这道题在"栈与队列"部分已经学习过，这里作为单调栈专题的开篇复习，加深对单调栈模式的理解。

---

## 问题描述

**LeetCode 496. Next Greater Element I**

给你两个没有重复元素的数组 `nums1` 和 `nums2`，其中 `nums1` 是 `nums2` 的子集。对于 `nums1` 中的每个元素，找出它在 `nums2` 中右侧的第一个更大元素。如果不存在，输出 -1。

**示例**：
```
输入：nums1 = [4,1,2], nums2 = [1,3,4,2]
输出：[-1,3,-1]
```

---

## 解法：单调栈 + 哈希表

```javascript
function nextGreaterElement(nums1, nums2) {
  const map = new Map();
  const stack = [];  // 单调递减栈
  
  // 预处理 nums2
  for (const num of nums2) {
    while (stack.length > 0 && num > stack[stack.length - 1]) {
      map.set(stack.pop(), num);
    }
    stack.push(num);
  }
  
  // 查询 nums1
  return nums1.map(num => map.get(num) ?? -1);
}
```

### 执行过程

```
nums2 = [1, 3, 4, 2]

num=1: stack=[1]
num=3: 3>1, pop, map[1]=3, stack=[3]
num=4: 4>3, pop, map[3]=4, stack=[4]
num=2: 2<4, stack=[4,2]

map = {1:3, 3:4}

nums1 = [4,1,2] → [-1, 3, -1]
```

---

## 复杂度

- 时间：O(m + n)
- 空间：O(n)
