# BST的插入与删除

掌握BST的增删改查是面试的基本功。这一章我们深入学习BST的插入、删除和修改操作，这些操作都建立在BST的核心性质之上。

## BST的插入操作

在BST中插入一个新值，需要找到正确的位置，保持BST的性质不变。

### 思路分析

插入的逻辑很直观：
1. 如果树为空，新节点就是根
2. 如果新值小于当前节点，往左走
3. 如果新值大于当前节点，往右走
4. 走到空位置，插入新节点

### 递归实现

```javascript
function insertIntoBST(root, val) {
    // 找到空位置，创建新节点
    if (!root) {
        return new TreeNode(val);
    }
    
    // 根据大小决定往左还是往右
    if (val < root.val) {
        root.left = insertIntoBST(root.left, val);
    } else {
        root.right = insertIntoBST(root.right, val);
    }
    
    return root;
}
```

注意`root.left = insertIntoBST(root.left, val)`这行代码，它巧妙地处理了"连接新节点"的问题。

### 迭代实现

```javascript
function insertIntoBST(root, val) {
    const newNode = new TreeNode(val);
    
    if (!root) return newNode;
    
    let curr = root;
    while (true) {
        if (val < curr.val) {
            if (!curr.left) {
                curr.left = newNode;
                break;
            }
            curr = curr.left;
        } else {
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

### 插入过程示例

在下面的BST中插入5：
```
初始：
        4
       / \
      2   6
     / \
    1   3

插入5：
5 > 4，往右
5 < 6，往左
6的左子树为空，插入

结果：
        4
       / \
      2   6
     / \ /
    1  3 5
```

## BST的删除操作

删除比插入复杂得多，因为需要考虑被删节点的子节点情况。

### 三种情况

**情况1：删除叶子节点**

直接删除，不影响其他节点。
```
删除1：
        4              4
       / \     →      / \
      2   6          2   6
     /                    
    1
```

**情况2：删除只有一个子节点的节点**

用子节点替代被删节点。
```
删除2（只有左子节点）：
        4              4
       / \     →      / \
      2   6          1   6
     /                    
    1
```

**情况3：删除有两个子节点的节点**

这是最复杂的情况。我们需要找一个节点来替代被删节点，同时保持BST性质。

有两个选择：
- 左子树的最大节点（前驱）
- 右子树的最小节点（后继）

通常选择右子树的最小节点：
```
删除4（有两个子节点）：
        4              5
       / \     →      / \
      2   6          2   6
     / \ /          / \
    1  3 5         1   3
```

### 完整实现

```javascript
function deleteNode(root, key) {
    if (!root) return null;
    
    // 查找要删除的节点
    if (key < root.val) {
        root.left = deleteNode(root.left, key);
    } else if (key > root.val) {
        root.right = deleteNode(root.right, key);
    } else {
        // 找到了要删除的节点
        
        // 情况1和2：没有左子节点或没有右子节点
        if (!root.left) return root.right;
        if (!root.right) return root.left;
        
        // 情况3：有两个子节点
        // 找右子树的最小节点（后继）
        let successor = root.right;
        while (successor.left) {
            successor = successor.left;
        }
        
        // 用后继的值替换当前节点的值
        root.val = successor.val;
        
        // 删除后继节点
        root.right = deleteNode(root.right, successor.val);
    }
    
    return root;
}
```

### 为什么选择后继节点？

后继节点是右子树的最小值，它有以下特点：
1. 比左子树所有节点都大（因为它在右子树）
2. 比右子树其他节点都小（因为它是最小的）
3. 最多只有右子节点（否则它的左子节点更小）

这使得用它替换被删节点后，BST性质自然保持。

### 删除过程详解

删除节点4的完整过程：
```
步骤1：找到节点4
        4 ← 找到
       / \
      2   6
     / \ /
    1  3 5

步骤2：节点4有两个子节点，找右子树最小值
        4
       / \
      2   6
     / \ /
    1  3 5 ← 这是右子树最小值

步骤3：用5替换4
        5
       / \
      2   6
     / \ /
    1  3 5 ← 还需要删除这个5

步骤4：删除右子树中的5（它没有子节点，直接删）
        5
       / \
      2   6
     / \
    1   3

完成！
```

## 查找最小/最大值

在BST中，最小值在最左边，最大值在最右边：

```javascript
// 查找最小值
function findMin(root) {
    if (!root) return null;
    while (root.left) {
        root = root.left;
    }
    return root;
}

// 查找最大值
function findMax(root) {
    if (!root) return null;
    while (root.right) {
        root = root.right;
    }
    return root;
}
```

## 查找前驱和后继

**前驱**：小于当前节点的最大值
**后继**：大于当前节点的最小值

```javascript
// 查找后继（中序遍历的下一个节点）
function inorderSuccessor(root, p) {
    let successor = null;
    
    while (root) {
        if (p.val < root.val) {
            successor = root;  // 当前节点可能是后继
            root = root.left;
        } else {
            root = root.right;
        }
    }
    
    return successor;
}
```

## BST操作的复杂度

所有基本操作的时间复杂度都与树的高度h相关：

| 操作 | 时间复杂度 |
|------|-----------|
| 查找 | O(h) |
| 插入 | O(h) |
| 删除 | O(h) |
| 找最小/最大 | O(h) |
| 找前驱/后继 | O(h) |

其中h在平衡树中为O(log n)，在最坏情况下为O(n)。

## 实战技巧

### 技巧1：用范围验证BST

验证一棵树是否是BST，可以用范围限制：

```javascript
function isValidBST(root) {
    function validate(node, min, max) {
        if (!node) return true;
        if (node.val <= min || node.val >= max) return false;
        return validate(node.left, min, node.val) &&
               validate(node.right, node.val, max);
    }
    return validate(root, -Infinity, Infinity);
}
```

### 技巧2：利用中序遍历有序性

很多BST问题可以转化为"有序数组"问题：

```javascript
// 找BST中第k小的元素
function kthSmallest(root, k) {
    const stack = [];
    let curr = root;
    
    while (curr || stack.length) {
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        curr = stack.pop();
        if (--k === 0) return curr.val;
        curr = curr.right;
    }
}
```

## 小结

BST的操作核心是利用其有序性质：

- **插入**：找到正确位置，创建新节点
- **删除**：三种情况分别处理，最复杂的是有两个子节点的情况
- **关键技巧**：中序遍历有序、范围验证、后继节点替换

掌握这些操作后，你就可以轻松应对各种BST相关的面试题了。接下来我们将通过一系列实战题目来巩固这些知识。
