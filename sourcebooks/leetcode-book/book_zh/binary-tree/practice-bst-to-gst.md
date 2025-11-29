# 实战：把二叉搜索树转换为累加树

这道题非常巧妙，它要求我们把BST转换成一种特殊的树——每个节点的值变成所有大于等于它的节点值之和。理解"反向中序遍历"是解决这道题的关键。

## 问题描述

给定一个BST，把它转换成累加树（Greater Sum Tree），使每个节点的新值等于原树中**大于或等于该节点值的所有节点值之和**。

**示例**：
```
输入：
        4
       / \
      1   6
     / \ / \
    0  2 5  7
          \
           8

输出：
        30
       / \
     36   21
    / \  / \
   36 35 26 15
           \
            8
```

以节点4为例：大于等于4的节点有 4, 5, 6, 7, 8，和为30。

## 思路分析

### 暴力思路

对每个节点，遍历整棵树找出所有大于等于它的节点，计算和。时间复杂度O(n²)。

### 逆向思维

换个角度思考：如果我们按**从大到小**的顺序访问节点，可以边遍历边累加。

- 先访问最大的节点（最右边）：累加和 = 自身值
- 再访问第二大的：累加和 += 自身值
- ...以此类推

BST的中序遍历是从小到大，**反向中序遍历**（右→根→左）就是从大到小！

```
BST：
    4
   / \
  2   6

中序（左→根→右）：2 → 4 → 6（升序）
反向中序（右→根→左）：6 → 4 → 2（降序）
```

### 算法步骤

1. 反向中序遍历（右→根→左）
2. 维护一个累加和变量
3. 每访问一个节点：先将累加和加到节点上，再更新累加和

## 解法一：递归

```javascript
/**
 * @param {TreeNode} root
 * @return {TreeNode}
 */
function convertBST(root) {
    let sum = 0;
    
    function reverseInorder(node) {
        if (!node) return;
        
        // 先访问右子树（大的值）
        reverseInorder(node.right);
        
        // 处理当前节点
        sum += node.val;
        node.val = sum;
        
        // 再访问左子树（小的值）
        reverseInorder(node.left);
    }
    
    reverseInorder(root);
    return root;
}
```

## 解法二：迭代

用栈实现反向中序遍历：

```javascript
function convertBST(root) {
    let sum = 0;
    const stack = [];
    let curr = root;
    
    while (curr || stack.length) {
        // 走到最右边
        while (curr) {
            stack.push(curr);
            curr = curr.right;
        }
        
        // 处理当前节点
        curr = stack.pop();
        sum += curr.val;
        curr.val = sum;
        
        // 转向左子树
        curr = curr.left;
    }
    
    return root;
}
```

## 执行过程详解

```
原始BST：
        4
       / \
      1   6
         / \
        5   7

反向中序遍历：7 → 6 → 5 → 4 → 1

访问7：sum = 0 + 7 = 7，节点7变成7
访问6：sum = 7 + 6 = 13，节点6变成13
访问5：sum = 13 + 5 = 18，节点5变成18
访问4：sum = 18 + 4 = 22，节点4变成22
访问1：sum = 22 + 1 = 23，节点1变成23

结果：
        22
       / \
      23   13
          / \
         18   7
```

验证节点4：原BST中 ≥4 的节点是 4, 5, 6, 7，和 = 22 ✓

## Morris遍历（进阶）

如果要求O(1)空间复杂度，可以使用Morris遍历：

```javascript
function convertBST(root) {
    let sum = 0;
    let curr = root;
    
    while (curr) {
        if (!curr.right) {
            // 没有右子树，直接处理
            sum += curr.val;
            curr.val = sum;
            curr = curr.left;
        } else {
            // 找到右子树的最左节点（后继）
            let succ = curr.right;
            while (succ.left && succ.left !== curr) {
                succ = succ.left;
            }
            
            if (!succ.left) {
                // 建立线索
                succ.left = curr;
                curr = curr.right;
            } else {
                // 恢复树结构，处理当前节点
                succ.left = null;
                sum += curr.val;
                curr.val = sum;
                curr = curr.left;
            }
        }
    }
    
    return root;
}
```

## 复杂度分析

| 解法 | 时间复杂度 | 空间复杂度 |
|------|-----------|-----------|
| 递归 | O(n) | O(h) |
| 迭代 | O(n) | O(h) |
| Morris | O(n) | O(1) |

h是树的高度，最坏情况为n。

## 相关问题

这道题有个变体叫"把二叉搜索树转换为更大和树"（LeetCode 1038），本质上是同一道题。

另外，如果要转换成"小于等于当前节点的所有值之和"，只需使用正常的中序遍历即可。

## 小结

这道题的精髓：

1. **反向中序遍历**：右→根→左，按降序访问BST节点
2. **累加思想**：边遍历边累加，每个节点的新值 = 之前的累加和 + 当前值
3. **原地修改**：不需要额外空间存储结果

理解"中序遍历的正向和反向"是解决BST问题的重要技能。正向是升序，反向是降序，根据题目需求选择合适的遍历方向。
