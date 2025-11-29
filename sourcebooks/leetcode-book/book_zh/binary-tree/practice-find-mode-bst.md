# 实战：二叉搜索树中的众数

这道题看似需要哈希表统计频率，但利用BST的中序遍历有序性，我们可以在O(1)额外空间内解决。

## 问题描述

给你一个含重复值的BST的根节点`root`，找出并返回BST中的所有众数（出现频率最高的元素）。如果有多个众数，可以按任意顺序返回。

**示例**：
```
        1
         \
          2
         /
        2

输出：[2]
解释：2出现了2次，1出现了1次，众数是2
```

**注意**：这道题的BST允许有重复值，定义为：左子树 <= 根 < 右子树（或 左 < 根 <= 右）。

## 思路分析

### 通用解法：哈希表

不管是什么树，都可以用哈希表统计频率：

```javascript
function findMode(root) {
    const count = new Map();
    let maxCount = 0;
    
    function dfs(node) {
        if (!node) return;
        count.set(node.val, (count.get(node.val) || 0) + 1);
        maxCount = Math.max(maxCount, count.get(node.val));
        dfs(node.left);
        dfs(node.right);
    }
    
    dfs(root);
    
    const result = [];
    for (const [val, cnt] of count) {
        if (cnt === maxCount) result.push(val);
    }
    return result;
}
```

但这需要O(n)额外空间，没有利用BST的性质。

### BST解法：中序遍历

BST的中序遍历是有序的，**相同的值会连续出现**：

```
        4
       / \
      2   6
     / \ 
    2   2

中序：2 → 2 → 2 → 4 → 6
      ↑_____↑
     相同值连续
```

利用这个特性，我们可以边遍历边统计当前值的连续出现次数。

## 两遍遍历解法

第一遍找最大频率，第二遍收集众数：

```javascript
function findMode(root) {
    let maxCount = 0;
    let currentVal = null;
    let currentCount = 0;
    
    // 第一遍：找最大频率
    function countMax(node) {
        if (!node) return;
        countMax(node.left);
        
        if (node.val === currentVal) {
            currentCount++;
        } else {
            currentVal = node.val;
            currentCount = 1;
        }
        maxCount = Math.max(maxCount, currentCount);
        
        countMax(node.right);
    }
    
    countMax(root);
    
    // 第二遍：收集众数
    currentVal = null;
    currentCount = 0;
    const result = [];
    
    function collect(node) {
        if (!node) return;
        collect(node.left);
        
        if (node.val === currentVal) {
            currentCount++;
        } else {
            currentVal = node.val;
            currentCount = 1;
        }
        if (currentCount === maxCount) {
            result.push(node.val);
        }
        
        collect(node.right);
    }
    
    collect(root);
    return result;
}
```

## 一遍遍历解法（推荐）

更巧妙的做法是只遍历一次：

```javascript
/**
 * @param {TreeNode} root
 * @return {number[]}
 */
function findMode(root) {
    let result = [];
    let maxCount = 0;
    let currentVal = null;
    let currentCount = 0;
    
    function inorder(node) {
        if (!node) return;
        
        // 左子树
        inorder(node.left);
        
        // 处理当前节点
        if (node.val === currentVal) {
            currentCount++;
        } else {
            currentVal = node.val;
            currentCount = 1;
        }
        
        // 更新结果
        if (currentCount > maxCount) {
            maxCount = currentCount;
            result = [currentVal];  // 发现更高频率，重置结果
        } else if (currentCount === maxCount) {
            result.push(currentVal);  // 相同频率，加入结果
        }
        
        // 右子树
        inorder(node.right);
    }
    
    inorder(root);
    return result;
}
```

关键技巧：当发现更高频率的值时，清空之前的结果，重新开始收集。

## 执行过程

```
        2
       / \
      1   2

中序遍历：1 → 2 → 2

访问1：
  currentVal = 1, currentCount = 1
  1 > 0，maxCount = 1，result = [1]

访问2：
  currentVal = 2, currentCount = 1
  1 = 1，result = [1, 2]

访问2：
  currentVal = 2, currentCount = 2
  2 > 1，maxCount = 2，result = [2]

返回 [2]
```

## Morris遍历（进阶）

如果要求O(1)空间（不算输出），可以用Morris遍历：

```javascript
function findMode(root) {
    let result = [];
    let maxCount = 0;
    let currentVal = null;
    let currentCount = 0;
    
    let curr = root;
    
    while (curr) {
        if (!curr.left) {
            // 处理当前节点
            process(curr.val);
            curr = curr.right;
        } else {
            let pred = curr.left;
            while (pred.right && pred.right !== curr) {
                pred = pred.right;
            }
            
            if (!pred.right) {
                pred.right = curr;
                curr = curr.left;
            } else {
                pred.right = null;
                process(curr.val);
                curr = curr.right;
            }
        }
    }
    
    function process(val) {
        if (val === currentVal) {
            currentCount++;
        } else {
            currentVal = val;
            currentCount = 1;
        }
        
        if (currentCount > maxCount) {
            maxCount = currentCount;
            result = [currentVal];
        } else if (currentCount === maxCount) {
            result.push(currentVal);
        }
    }
    
    return result;
}
```

## 复杂度分析

| 解法 | 时间 | 空间 |
|------|------|------|
| 哈希表 | O(n) | O(n) |
| 两遍遍历 | O(n) | O(h) |
| 一遍遍历 | O(n) | O(h) |
| Morris | O(n) | O(1)（不算输出）|

## 小结

这道题的核心洞察：

1. **中序遍历有序**：相同值连续出现
2. **边遍历边统计**：不需要存储所有值
3. **动态更新结果**：发现更高频率时重置

面试时展示BST性质的运用，比直接用哈希表更能体现你的算法功底。
