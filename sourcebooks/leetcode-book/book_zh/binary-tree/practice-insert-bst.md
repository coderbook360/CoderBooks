# 实战：二叉搜索树中的插入操作

BST的插入操作是构建BST的基础。与搜索类似，插入也利用BST的有序性质来找到正确的位置。

## 问题描述

给定BST的根节点`root`和要插入的值`val`，将`val`插入BST中，返回新树的根节点。

**保证**：原始BST中不存在值为`val`的节点。

**示例**：
```
插入前：
        4
       / \
      2   7
     / \
    1   3

插入 val = 5

插入后：
        4
       / \
      2   7
     / \ /
    1  3 5
```

## 思路分析

BST插入的核心思想：

1. **找位置**：用搜索的逻辑找到插入点
2. **插入**：在空位置创建新节点

新节点一定是作为**叶子节点**插入的——不会改变原有树的结构。

## 解法一：递归

```javascript
/**
 * @param {TreeNode} root
 * @param {number} val
 * @return {TreeNode}
 */
function insertIntoBST(root, val) {
    // 找到空位置，创建新节点
    if (!root) {
        return new TreeNode(val);
    }
    
    // 根据大小决定往哪边插入
    if (val < root.val) {
        root.left = insertIntoBST(root.left, val);
    } else {
        root.right = insertIntoBST(root.right, val);
    }
    
    return root;
}
```

关键在于`root.left = insertIntoBST(root.left, val)`——递归返回新的子树根节点，自动完成连接。

## 解法二：迭代

```javascript
function insertIntoBST(root, val) {
    const newNode = new TreeNode(val);
    
    // 空树，新节点就是根
    if (!root) return newNode;
    
    let curr = root;
    while (true) {
        if (val < curr.val) {
            // 往左走
            if (!curr.left) {
                curr.left = newNode;
                break;
            }
            curr = curr.left;
        } else {
            // 往右走
            if (!curr.right) {
                curr.right = newNode;
                break;
            }
            curr = curr.right;
        }
    }
    
    return root;
}
```

## 执行过程

```
        4
       / \
      2   7
     / \
    1   3

插入 val = 5：

从根节点4开始
  5 > 4，往右
到节点7
  5 < 7，往左
  7的左子节点为空，插入！

结果：
        4
       / \
      2   7
     / \ /
    1  3 5
```

## 插入顺序影响树的形状

同样的元素，不同的插入顺序会得到不同的树：

```
插入顺序：4, 2, 6, 1, 3, 5, 7
        4
       / \
      2   6
     / \ / \
    1  3 5  7
（平衡的完全二叉树）

插入顺序：1, 2, 3, 4, 5, 6, 7
    1
     \
      2
       \
        3
         \
          4
           \
            5
             \
              6
               \
                7
（退化为链表）
```

这就是为什么实际应用中需要AVL树或红黑树来保持平衡。

## 复杂度分析

**时间复杂度**：O(h)
- h是树的高度
- 平衡BST：O(log n)
- 最坏情况：O(n)

**空间复杂度**：
- 递归：O(h)
- 迭代：O(1)

## 小结

BST插入的要点：

1. **新节点总是叶子**：不会改变原有结构
2. **找位置 = 搜索**：用相同的逻辑找到插入点
3. **插入顺序影响形状**：随机顺序更容易得到平衡树

插入是构建BST的基础，掌握后可以进一步学习更复杂的删除操作。
