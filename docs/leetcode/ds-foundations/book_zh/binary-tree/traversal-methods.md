# 二叉树遍历：前序、中序、后序

「遍历」的意思是不遗漏、不重复地访问每一个节点。树的遍历是所有树问题的基础——几乎所有树的操作都建立在遍历之上。

二叉树有三种经典的深度优先遍历方式：前序、中序、后序。它们的区别仅在于「访问根节点的时机」。

## 三种遍历方式

以这棵树为例：

```
       1
      / \
     2   3
    / \
   4   5
```

### 前序遍历（Preorder）

访问顺序：**根 → 左 → 右**

```
步骤：
1. 访问根节点 1
2. 前序遍历左子树 → 2, 4, 5
3. 前序遍历右子树 → 3

结果：1, 2, 4, 5, 3
```

**特点**：根节点总是第一个被访问。

### 中序遍历（Inorder）

访问顺序：**左 → 根 → 右**

```
步骤：
1. 中序遍历左子树 → 4, 2, 5
2. 访问根节点 1
3. 中序遍历右子树 → 3

结果：4, 2, 5, 1, 3
```

**特点**：对于 BST，中序遍历得到有序序列。

### 后序遍历（Postorder）

访问顺序：**左 → 右 → 根**

```
步骤：
1. 后序遍历左子树 → 4, 5, 2
2. 后序遍历右子树 → 3
3. 访问根节点 1

结果：4, 5, 2, 3, 1
```

**特点**：根节点总是最后被访问。处理子树之后才处理当前节点。

## 如何记忆？

「前中后」指的是**根节点的访问时机**：

| 遍历方式 | 根的位置 | 口诀 |
|----------|---------|------|
| **前**序 | 根在**前** | 先根后子 |
| **中**序 | 根在**中** | 左-根-右 |
| **后**序 | 根在**后** | 先子后根 |

左子树始终在右子树之前访问——这是约定俗成的。

## 递归实现

递归实现非常简洁，直接反映遍历的定义。

```javascript
// 前序遍历：根 → 左 → 右
function preorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        
        result.push(node.val);     // 1. 访问根
        traverse(node.left);        // 2. 遍历左子树
        traverse(node.right);       // 3. 遍历右子树
    }
    
    traverse(root);
    return result;
}

// 中序遍历：左 → 根 → 右
function inorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        
        traverse(node.left);        // 1. 遍历左子树
        result.push(node.val);     // 2. 访问根
        traverse(node.right);       // 3. 遍历右子树
    }
    
    traverse(root);
    return result;
}

// 后序遍历：左 → 右 → 根
function postorderTraversal(root) {
    const result = [];
    
    function traverse(node) {
        if (!node) return;
        
        traverse(node.left);        // 1. 遍历左子树
        traverse(node.right);       // 2. 遍历右子树
        result.push(node.val);     // 3. 访问根
    }
    
    traverse(root);
    return result;
}
```

**观察**：三种遍历的代码几乎相同，唯一的区别是 `result.push(node.val)` 的位置。

## 递归的执行过程

以前序遍历为例，理解递归调用栈：

```
       1
      / \
     2   3
    / \
   4   5

调用过程：
preorder(1)
  → push 1
  → preorder(2)
      → push 2
      → preorder(4)
          → push 4
          → preorder(null) 返回
          → preorder(null) 返回
      → preorder(5)
          → push 5
          → preorder(null) 返回
          → preorder(null) 返回
  → preorder(3)
      → push 3
      → preorder(null) 返回
      → preorder(null) 返回

结果：[1, 2, 4, 5, 3]
```

递归利用系统调用栈来「记住」还没处理完的节点。

## 迭代实现

递归本质上是用系统栈。我们可以用**显式栈**来模拟这个过程。

### 前序遍历（迭代）

```javascript
function preorderIterative(root) {
    if (!root) return [];
    
    const result = [];
    const stack = [root];
    
    while (stack.length > 0) {
        const node = stack.pop();
        result.push(node.val);          // 访问当前节点
        
        // 先压右，再压左（这样左先出栈，先被访问）
        if (node.right) stack.push(node.right);
        if (node.left) stack.push(node.left);
    }
    
    return result;
}
```

**执行过程**：

```
初始：stack = [1]

pop 1, push 结果 → result = [1]
push 3, 2 → stack = [3, 2]

pop 2, push 结果 → result = [1, 2]
push 5, 4 → stack = [3, 5, 4]

pop 4, push 结果 → result = [1, 2, 4]
stack = [3, 5]

pop 5, push 结果 → result = [1, 2, 4, 5]
stack = [3]

pop 3, push 结果 → result = [1, 2, 4, 5, 3]
stack = []

结束
```

### 中序遍历（迭代）

中序遍历稍微复杂，需要一直往左走，然后回溯。

```javascript
function inorderIterative(root) {
    const result = [];
    const stack = [];
    let curr = root;
    
    while (curr || stack.length > 0) {
        // 一直往左走，沿途压栈
        while (curr) {
            stack.push(curr);
            curr = curr.left;
        }
        
        // 弹出栈顶（最左的节点）
        curr = stack.pop();
        result.push(curr.val);      // 访问
        
        // 转向右子树
        curr = curr.right;
    }
    
    return result;
}
```

**思路**：
1. 从根开始，一直往左走，沿途压栈
2. 走到头后，弹出栈顶节点并访问
3. 转向右子树，重复步骤 1

### 后序遍历（迭代）

后序遍历最复杂，因为根节点最后访问。有个巧妙的技巧：

**后序 = 前序变种的逆序**

- 前序：根 → 左 → 右
- 变种：根 → 右 → 左
- 逆序：左 → 右 → 根 = 后序

```javascript
function postorderIterative(root) {
    if (!root) return [];
    
    const result = [];
    const stack = [root];
    
    while (stack.length > 0) {
        const node = stack.pop();
        result.push(node.val);          // 根 → 右 → 左
        
        // 先压左，再压右（这样右先出栈）
        if (node.left) stack.push(node.left);
        if (node.right) stack.push(node.right);
    }
    
    return result.reverse();            // 逆序得到后序
}
```

另一种方法是用「标记法」，记录节点是否已经访问过右子树，但代码更复杂，这里不展开。

## 三种遍历的应用

| 遍历方式 | 特点 | 典型应用 |
|----------|------|----------|
| **前序** | 先处理根，再处理子树 | 复制树、序列化、打印目录结构 |
| **中序** | 对 BST 产生有序序列 | BST 的大部分操作 |
| **后序** | 先处理子树，再处理根 | 计算树高、释放内存、表达式求值 |

**例：计算树的高度（后序）**

必须先知道左右子树的高度，才能计算当前节点的高度：

```javascript
function height(root) {
    if (!root) return 0;
    
    const leftHeight = height(root.left);   // 先处理左子树
    const rightHeight = height(root.right); // 再处理右子树
    return Math.max(leftHeight, rightHeight) + 1;  // 最后处理根
}
```

这就是后序遍历的思想。

**例：序列化树（前序）**

先序列化根，再序列化子树：

```javascript
function serialize(root) {
    if (!root) return "null";
    return root.val + "," + serialize(root.left) + "," + serialize(root.right);
}
```

这就是前序遍历的思想。

## 复杂度分析

无论哪种遍历方式：

- **时间复杂度**：O(n)，每个节点访问一次
- **空间复杂度**：
  - 递归：O(h)，h 是树的高度（递归栈深度）
  - 迭代：O(h)，显式栈的大小

最坏情况（链状树）：h = n，空间 O(n)
最好情况（平衡树）：h = log n，空间 O(log n)

## 本章小结

1. **三种遍历**：前序（根-左-右）、中序（左-根-右）、后序（左-右-根）
2. **记忆方法**：「前中后」指根节点的访问时机
3. **递归实现**：代码简洁，只是 push 位置不同
4. **迭代实现**：用栈模拟递归，后序可用"变种前序+逆序"
5. **应用场景**：前序用于复制/序列化，中序用于 BST，后序用于先子后根的计算

下一章是层序遍历——一种广度优先的遍历方式。
