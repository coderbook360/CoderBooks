# 实战：验证二叉搜索树

这道题是BST的经典入门题，考察你对BST定义的理解是否准确。很多人第一次做会掉进一个常见的陷阱。

## 问题描述

给你一个二叉树的根节点`root`，判断其是否是一个有效的二叉搜索树。

**有效BST的定义**：
- 节点的左子树只包含**小于**当前节点的数
- 节点的右子树只包含**大于**当前节点的数
- 所有左子树和右子树自身也必须是BST

**示例1**：
```
    2
   / \
  1   3

输出：true
```

**示例2**：
```
    5
   / \
  1   4
     / \
    3   6

输出：false
解释：根节点是5，但右子树包含3，3 < 5，违反BST定义
```

## 思路分析

### 错误的直觉思路

很多人的第一反应是：**只检查每个节点的左子节点小于自己，右子节点大于自己**。

```javascript
// 错误的做法
function isValidBST(root) {
    if (!root) return true;
    if (root.left && root.left.val >= root.val) return false;
    if (root.right && root.right.val <= root.val) return false;
    return isValidBST(root.left) && isValidBST(root.right);
}
```

这个做法对示例2会错误返回`true`，因为它只检查了直接子节点。

问题在于：**BST要求左子树的所有节点都小于根，不仅仅是左子节点**。

### 正确思路：范围约束

换个角度思考：每个节点的值都有一个**允许的范围**。

- 根节点的范围：`(-∞, +∞)`
- 左子节点的范围：`(-∞, 父节点值)`
- 右子节点的范围：`(父节点值, +∞)`

以此类推，每次往下递归时，更新范围的上界或下界。

```
        5 ← 范围(-∞, +∞)
       / \
      1   4 ← 范围(5, +∞)，4不在范围内，无效！
     
实际上4 < 5，不满足"右子树所有节点大于根"的要求
```

## 解法一：递归 + 范围验证

```javascript
/**
 * @param {TreeNode} root
 * @return {boolean}
 */
function isValidBST(root) {
    function validate(node, min, max) {
        // 空节点是有效的
        if (!node) return true;
        
        // 检查当前节点是否在有效范围内
        if (node.val <= min || node.val >= max) {
            return false;
        }
        
        // 递归验证左右子树
        // 左子树的最大值不能超过当前节点
        // 右子树的最小值不能小于当前节点
        return validate(node.left, min, node.val) &&
               validate(node.right, node.val, max);
    }
    
    return validate(root, -Infinity, Infinity);
}
```

### 执行过程示例

对于无效的BST：
```
    5
   / \
  1   4
     / \
    3   6
```

```
validate(5, -∞, +∞)
  5 在 (-∞, +∞) 内 ✓
  
  validate(1, -∞, 5)
    1 在 (-∞, 5) 内 ✓
    左右子树都空 ✓
  
  validate(4, 5, +∞)
    4 在 (5, +∞) 内？ 4 <= 5，✗
    返回 false

结果：false
```

## 解法二：中序遍历

BST的中序遍历是**严格递增**的序列。我们可以利用这个性质：

```javascript
function isValidBST(root) {
    let prev = -Infinity;
    
    function inorder(node) {
        if (!node) return true;
        
        // 先访问左子树
        if (!inorder(node.left)) return false;
        
        // 检查当前节点是否大于前一个节点
        if (node.val <= prev) return false;
        prev = node.val;
        
        // 再访问右子树
        return inorder(node.right);
    }
    
    return inorder(root);
}
```

### 中序遍历过程

```
    5
   / \
  1   4
     / \
    3   6

中序：1 → 5 → 3 → 4 → 6
             ↑
         3 < 5，不是递增，无效！
```

## 解法三：迭代中序遍历

用栈实现中序遍历：

```javascript
function isValidBST(root) {
    const stack = [];
    let prev = -Infinity;
    let curr = root;
    
    while (curr || stack.length) {
        // 走到最左边
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        
        // 处理当前节点
        curr = stack.pop();
        if (curr.val <= prev) return false;
        prev = curr.val;
        
        // 转向右子树
        curr = curr.right;
    }
    
    return true;
}
```

## 边界情况

- **空树**：有效的BST
- **单节点**：有效的BST
- **节点值为极值**：注意使用`-Infinity`和`Infinity`而不是`Number.MIN_VALUE`

```javascript
// 注意：Number.MIN_VALUE 是最小的正数，不是最小的负数！
console.log(Number.MIN_VALUE);  // 5e-324，是正数
console.log(-Infinity);         // 负无穷
```

## 复杂度分析

**时间复杂度**：O(n)
- 每个节点访问一次

**空间复杂度**：O(h)
- 递归栈深度等于树的高度
- 最坏情况O(n)（链状树），平衡时O(log n)

## 两种方法对比

| 方法 | 优点 | 缺点 |
|------|------|------|
| 范围验证 | 直观，与定义对应 | 需要理解范围传递 |
| 中序遍历 | 利用BST性质，代码简洁 | 需要额外记录前驱节点 |

面试中两种方法都要会，可以先说范围验证（更直观），再提一下中序遍历的思路展示你的全面性。

## 小结

验证BST的关键点：

1. **不能只检查直接子节点**：要检查整个子树
2. **范围传递**：每个节点都有一个有效范围
3. **中序遍历**：BST的中序遍历是严格递增的

这道题的陷阱在于对BST定义的理解要精确：左子树**所有**节点小于根，而不仅仅是左子节点。
