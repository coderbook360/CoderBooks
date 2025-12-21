# 预字符串化：将静态内容转为字符串

静态提升避免了重复创建 VNode，**但仍然需要创建 VNode 对象结构**。当有大量连续静态节点时，还可以进一步优化。

**预字符串化将它们转为 HTML 字符串，直接使用 innerHTML。** 本章将分析 stringifyStatic 的实现。

## 优化动机

```html
<div>
  <p>段落1</p>
  <p>段落2</p>
  <p>段落3</p>
  <!-- ... -->
  <p>段落20</p>
</div>
```

静态提升后：

```javascript
const _hoisted_1 = createElementVNode("p", null, "段落1", -1)
const _hoisted_2 = createElementVNode("p", null, "段落2", -1)
// ... 20 个变量
const _hoisted_20 = createElementVNode("p", null, "段落20", -1)
```

仍然创建了 20 个 VNode 对象。

预字符串化后：

```javascript
const _hoisted_1 = createStaticVNode(
  "<p>段落1</p><p>段落2</p>...<p>段落20</p>", 
  20
)
```

只有一个字符串和一个 Static VNode。

## 触发条件

不是所有静态节点都会字符串化。需要满足阈值条件：

```javascript
function shouldStringify(nodes, context) {
  let elementCount = 0
  let nonLeafCount = 0
  
  for (const node of nodes) {
    if (node.type === NodeTypes.ELEMENT) {
      elementCount++
      
      // 非叶子节点：有子元素
      if (node.children.some(c => c.type === NodeTypes.ELEMENT)) {
        nonLeafCount++
      }
    }
  }
  
  // 默认阈值：20 个元素或 5 个非叶子节点
  return elementCount >= 20 || nonLeafCount >= 5
}
```

为什么要阈值？

字符串化有初始化成本（innerHTML 解析）。节点太少时，成本可能超过收益。

## 内容限制

不是所有内容都能字符串化：

```javascript
function canStringify(node) {
  // 只有元素和文本可以
  if (node.type !== NodeTypes.ELEMENT && node.type !== NodeTypes.TEXT) {
    return false
  }
  
  if (node.type === NodeTypes.ELEMENT) {
    // 组件不行
    if (node.tagType !== ElementTypes.ELEMENT) {
      return false
    }
    
    // 某些标签不行（svg 等需要特殊处理）
    if (isVoidTag(node.tag) || isSVGTag(node.tag)) {
      return false
    }
    
    // 递归检查子节点
    for (const child of node.children) {
      if (!canStringify(child)) {
        return false
      }
    }
  }
  
  return true
}
```

## stringifyStatic 实现

```javascript
function stringifyStatic(children, context) {
  let staticSequence = []
  const result = []
  
  for (const child of children) {
    const constantType = getConstantType(child, context)
    
    if (constantType === ConstantTypes.CAN_STRINGIFY && canStringify(child)) {
      // 加入静态序列
      staticSequence.push(child)
    } else {
      // 遇到非静态节点，处理当前序列
      if (staticSequence.length > 0) {
        if (shouldStringify(staticSequence, context)) {
          result.push(createStringifyCall(staticSequence, context))
        } else {
          result.push(...staticSequence)
        }
        staticSequence = []
      }
      result.push(child)
    }
  }
  
  // 处理尾部序列
  if (staticSequence.length > 0) {
    if (shouldStringify(staticSequence, context)) {
      result.push(createStringifyCall(staticSequence, context))
    } else {
      result.push(...staticSequence)
    }
  }
  
  return result
}
```

## 生成 HTML 字符串

```javascript
function stringifyNode(node) {
  if (node.type === NodeTypes.TEXT) {
    return escapeHtml(node.content)
  }
  
  if (node.type === NodeTypes.ELEMENT) {
    const tag = node.tag
    let html = `<${tag}`
    
    // 处理属性
    for (const prop of node.props) {
      if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
        html += ` ${prop.name}="${escapeHtml(prop.value.content)}"`
      }
    }
    
    // 自闭合标签
    if (isVoidTag(tag)) {
      return html + '/>'
    }
    
    html += '>'
    
    // 处理子节点
    for (const child of node.children) {
      html += stringifyNode(child)
    }
    
    html += `</${tag}>`
    return html
  }
  
  return ''
}

function createStringifyCall(nodes, context) {
  // 生成 HTML 字符串
  let html = ''
  for (const node of nodes) {
    html += stringifyNode(node)
  }
  
  // 创建 Static VNode 调用
  context.helper(CREATE_STATIC)
  return createCallExpression(
    context.helper(CREATE_STATIC),
    [JSON.stringify(html), String(nodes.length)]
  )
}
```

## createStaticVNode 运行时

```javascript
function createStaticVNode(content, numberOfNodes) {
  const vnode = {
    type: Static,
    children: content,
    shapeFlag: ShapeFlags.STATIC,
    // 用于 DOM 更新时的节点定位
    staticCount: numberOfNodes
  }
  return vnode
}
```

挂载时：

```javascript
function mountStaticNode(vnode, container, anchor) {
  // 创建临时容器
  const template = document.createElement('template')
  template.innerHTML = vnode.children
  
  // 获取所有节点
  const nodes = template.content.childNodes
  
  // 记录第一个和最后一个节点
  vnode.el = nodes[0]
  vnode.anchor = nodes[nodes.length - 1]
  
  // 插入 DOM
  while (nodes.length) {
    container.insertBefore(nodes[0], anchor)
  }
}
```

## innerHTML vs VNode

为什么 innerHTML 更快？

**VNode 方式**：
1. 创建 20 个 VNode 对象
2. 遍历处理每个 VNode
3. 调用 20 次 createElement
4. 调用 20 次 appendChild

**innerHTML 方式**：
1. 浏览器直接解析 HTML 字符串
2. 一次性创建所有 DOM 节点

浏览器的 HTML 解析器是高度优化的原生代码，比 JavaScript 循环快得多。

## 更新时的处理

Static VNode 不参与 Diff：

```javascript
function patch(n1, n2, container) {
  if (n2.type === Static) {
    if (!n1) {
      mountStaticNode(n2, container)
    }
    // 已存在则什么都不做，静态内容不会变
    n2.el = n1.el
    n2.anchor = n1.anchor
    return
  }
  // ...
}
```

## 限制和注意事项

**不适用于**：
- 包含组件的区域
- 包含插槽的区域
- SVG 内容（需要正确的命名空间）
- 带有特殊事件处理的元素

**SSR 兼容**：
SSR 时静态内容直接输出 HTML 字符串，客户端 hydration 时需要匹配。

## 本章小结

本章分析了预字符串化的实现：

- **触发条件**：连续静态节点数量达到阈值
- **内容限制**：只有纯静态元素和文本
- **HTML 生成**：递归序列化节点为字符串
- **运行时**：通过 innerHTML 一次性渲染

预字符串化是静态提升的进一步优化。下一章我们将分析 Block Tree——动态节点的扁平化收集。
