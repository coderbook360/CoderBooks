# 实战：路径总和

路径总和问题要求判断是否存在一条从根到叶的路径，使得路径上所有节点的值之和等于目标值。这是一道经典的回溯/递归题。

## 问题描述

给你二叉树的根节点 `root` 和一个表示目标和的整数 `targetSum`。判断该树中是否存在**根节点到叶子节点**的路径，这条路径上所有节点值相加等于目标和 `targetSum`。

**叶子节点**是指没有子节点的节点。

**示例：**
```
输入：root = [5,4,8,11,null,13,4,7,2,null,null,null,1], targetSum = 22
              5
             / \
            4   8
           /   / \
          11  13  4
         /  \      \
        7    2      1
输出：true（路径 5 -> 4 -> 11 -> 2 = 22）
```

## 解法一：递归

递归的思路非常自然：
- 如果当前节点是叶子节点，检查路径和是否等于目标值
- 否则，递归检查左右子树，目标值减去当前节点的值

```javascript
function hasPathSum(root, targetSum) {
    if (!root) return false;
    
    // 叶子节点：检查剩余目标值是否等于节点值
    if (!root.left && !root.right) {
        return root.val === targetSum;
    }
    
    // 递归检查左右子树，目标值减去当前节点的值
    const newTarget = targetSum - root.val;
    return hasPathSum(root.left, newTarget) || hasPathSum(root.right, newTarget);
}
```

**代码解读：**
- `targetSum - root.val`：每经过一个节点，从目标中减去该节点的值
- 到达叶子节点时，如果剩余目标恰好等于叶子节点的值，说明找到了目标路径

**复杂度分析：**
- 时间复杂度：O(n)，最坏情况下遍历所有节点
- 空间复杂度：O(h)，递归深度

## 解法二：迭代（BFS）

用队列同时存储节点和到达该节点时的路径和：

```javascript
function hasPathSum(root, targetSum) {
    if (!root) return false;
    
    const queue = [[root, root.val]];
    
    while (queue.length) {
        const [node, sum] = queue.shift();
        
        // 叶子节点
        if (!node.left && !node.right) {
            if (sum === targetSum) return true;
            continue;
        }
        
        if (node.left) {
            queue.push([node.left, sum + node.left.val]);
        }
        if (node.right) {
            queue.push([node.right, sum + node.right.val]);
        }
    }
    
    return false;
}
```

## 解法三：迭代（DFS）

用栈实现深度优先搜索：

```javascript
function hasPathSum(root, targetSum) {
    if (!root) return false;
    
    const stack = [[root, root.val]];
    
    while (stack.length) {
        const [node, sum] = stack.pop();
        
        if (!node.left && !node.right && sum === targetSum) {
            return true;
        }
        
        if (node.left) {
            stack.push([node.left, sum + node.left.val]);
        }
        if (node.right) {
            stack.push([node.right, sum + node.right.val]);
        }
    }
    
    return false;
}
```

## 变体：路径总和 II

如果要求返回所有满足条件的路径呢？这就需要回溯了：

```javascript
function pathSum(root, targetSum) {
    const result = [];
    
    function backtrack(node, target, path) {
        if (!node) return;
        
        path.push(node.val);
        
        // 叶子节点且路径和等于目标
        if (!node.left && !node.right && node.val === target) {
            result.push([...path]);  // 复制路径
        }
        
        backtrack(node.left, target - node.val, path);
        backtrack(node.right, target - node.val, path);
        
        path.pop();  // 回溯
    }
    
    backtrack(root, targetSum, []);
    return result;
}
```

## 小结

路径总和问题展示了"减法思维"：把问题从"累加到目标"转化为"从目标中递减"。这种思维在很多路径问题中都很有用。

此外，这道题的变体（返回所有路径）展示了标准的回溯模板：
1. 做选择（push）
2. 递归
3. 撤销选择（pop）

掌握这个模板，你就能轻松应对各种路径相关的问题。
