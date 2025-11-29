# 实战：删除二叉搜索树中的节点

BST的删除是三种基本操作中最复杂的一个。它需要考虑被删节点的子节点情况，并在删除后保持BST的有序性质。

## 问题描述

给定BST的根节点`root`和一个值`key`，删除值为`key`的节点，并保证BST的性质不变。返回更新后的根节点引用。

**示例**：
```
删除前：
        5
       / \
      3   6
     / \   \
    2   4   7

删除 key = 3

删除后：
        5
       / \
      4   6
     /     \
    2       7
```

## 思路分析

删除操作分两步：
1. **找到节点**：用搜索的逻辑
2. **删除节点**：根据子节点情况分别处理

### 三种情况

**情况1：被删节点是叶子节点**

直接删除，让父节点指向`null`。

```
删除2：
    5           5
   / \    →    / \
  3   6       3   6
 /             
2
```

**情况2：被删节点只有一个子节点**

用子节点替代被删节点。

```
删除6：
    5           5
   / \    →    / \
  3   6       3   7
       \
        7
```

**情况3：被删节点有两个子节点**

这是最复杂的情况。我们需要找一个节点来替代被删节点：

- **前驱**：左子树的最大值
- **后继**：右子树的最小值

通常用**后继**替换（右子树最左节点）：
```
删除3：
        5                   5
       / \                 / \
      3   6      →        4   6
     / \   \             /     \
    2   4   7           2       7

步骤：
1. 找到3的后继：4（右子树的最左节点）
2. 用4的值替换3
3. 删除原来的4节点
```

## 完整实现

```javascript
/**
 * @param {TreeNode} root
 * @param {number} key
 * @return {TreeNode}
 */
function deleteNode(root, key) {
    if (!root) return null;
    
    // 查找要删除的节点
    if (key < root.val) {
        // 在左子树中删除
        root.left = deleteNode(root.left, key);
    } else if (key > root.val) {
        // 在右子树中删除
        root.right = deleteNode(root.right, key);
    } else {
        // 找到了要删除的节点
        
        // 情况1 & 2：没有左子节点或没有右子节点
        if (!root.left) return root.right;
        if (!root.right) return root.left;
        
        // 情况3：有两个子节点
        // 找右子树的最小节点（后继）
        let successor = root.right;
        while (successor.left) {
            successor = successor.left;
        }
        
        // 用后继的值替换当前节点
        root.val = successor.val;
        
        // 在右子树中删除后继节点
        root.right = deleteNode(root.right, successor.val);
    }
    
    return root;
}
```

## 另一种实现：调整指针

不改变节点值，而是调整指针：

```javascript
function deleteNode(root, key) {
    if (!root) return null;
    
    if (key < root.val) {
        root.left = deleteNode(root.left, key);
        return root;
    }
    
    if (key > root.val) {
        root.right = deleteNode(root.right, key);
        return root;
    }
    
    // 找到目标节点
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    
    // 有两个子节点：把左子树挂到后继的左边
    let successor = root.right;
    while (successor.left) {
        successor = successor.left;
    }
    successor.left = root.left;
    
    return root.right;
}
```

这种方法不改变值，但可能让树变得不平衡。

## 执行过程详解

```
删除值为5的节点：

        5
       / \
      3   7
     / \ / \
    2  4 6  8

1. 找到节点5（根节点）

2. 节点5有两个子节点，找后继
   后继 = 右子树最左节点 = 6

3. 用6替换5
        6
       / \
      3   7
     / \ / \
    2  4 6  8
         ↑
       这个6要删除

4. 在右子树删除6
   6只有右子节点7，用7替代
   但7是父节点，实际上6没有子节点，直接删

        6
       / \
      3   7
     / \   \
    2   4   8

完成！
```

## 复杂度分析

**时间复杂度**：O(h)
- 找节点：O(h)
- 找后继：O(h)
- 总计：O(h)

**空间复杂度**：O(h)
- 递归栈深度

## 为什么选择后继而不是前驱？

两种都可以，选后继是一种约定：
- 后继在右子树的最左边，最多只有右子节点
- 删除后继相对简单（要么是叶子，要么只有右子节点）

如果选前驱（左子树最右节点），逻辑类似，只是方向相反。

## 小结

BST删除的三种情况：

| 情况 | 处理方式 |
|------|---------|
| 叶子节点 | 直接删除 |
| 只有一个子节点 | 用子节点替代 |
| 有两个子节点 | 用后继替换，再删除后继 |

关键是理解为什么用后继替换能保持BST性质：后继比左子树所有节点大，比右子树其他节点小，刚好满足BST的定义。
