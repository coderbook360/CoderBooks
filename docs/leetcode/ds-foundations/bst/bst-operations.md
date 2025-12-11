# BST 的插入与删除

BST 的插入相对简单，删除则需要分情况处理。

---

## 插入操作

找到合适位置插入新节点：

```javascript
function insert(root, val) {
  if (!root) return new TreeNode(val);
  
  if (val < root.val) {
    root.left = insert(root.left, val);
  } else {
    root.right = insert(root.right, val);
  }
  
  return root;
}
```

过程演示：

```
插入 5 到 BST:

    8              8
   / \    →       / \
  3   10         3   10
 /              / \
1              1   5
```

---

## 删除操作

删除比插入复杂，分三种情况：

### 情况一：叶子节点

直接删除。

### 情况二：只有一个子节点

用子节点替代。

### 情况三：有两个子节点

用右子树的最小值（或左子树的最大值）替代。

```javascript
function deleteNode(root, key) {
  if (!root) return null;
  
  if (key < root.val) {
    root.left = deleteNode(root.left, key);
  } else if (key > root.val) {
    root.right = deleteNode(root.right, key);
  } else {
    // 找到要删除的节点
    
    // 情况一二：没有子节点或只有一个
    if (!root.left) return root.right;
    if (!root.right) return root.left;
    
    // 情况三：两个子节点
    // 找右子树最小值
    let minNode = root.right;
    while (minNode.left) {
      minNode = minNode.left;
    }
    
    // 用最小值替换当前节点
    root.val = minNode.val;
    
    // 删除右子树中的最小值
    root.right = deleteNode(root.right, minNode.val);
  }
  
  return root;
}
```

---

## 删除过程演示

```
删除 3（有两个子节点）:

       8                8
      / \              / \
     3   10    →      4   10
    / \              /
   1   6            1
      /                \
     4                  6
    
1. 找到 3 的右子树最小值 4
2. 用 4 替换 3
3. 删除右子树中的 4
```

---

## 为什么用右子树最小值？

右子树最小值是"比当前节点大的最小值"（后继节点）：
- 它比左子树所有节点大
- 它比右子树其他节点小
- 用它替换当前节点，BST 性质保持不变

---

## 复杂度

- 插入：O(h)，h 是树高度
- 删除：O(h)
- 平衡 BST：h = O(log n)
- 最坏情况：h = O(n)
