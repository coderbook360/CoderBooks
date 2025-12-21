# 节点转换与上下文对象

转换过程中需要共享大量信息：当前节点、父节点、辅助函数注册、静态提升等。**这些都通过 `TransformContext` 来管理。**

**`TransformContext` 是一个经典的“上下文对象”模式。** 理解它的设计，能帮你在其他项目中应用同样的模式。本章将深入分析转换上下文的设计和使用。

## 上下文结构

```javascript
interface TransformContext {
  // 编译选项
  options: TransformOptions
  
  // AST 导航
  root: RootNode
  currentNode: ParentNode | null
  parent: ParentNode | null
  childIndex: number
  ancestors: TemplateChildNode[]
  
  // 收集信息
  helpers: Map<symbol, number>
  components: Set<string>
  directives: Set<string>
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  temps: number
  cached: number
  
  // 作用域
  identifiers: { [name: string]: number }
  scopes: {
    vFor: number
    vSlot: number
    vPre: number
    vOnce: number
  }
}
```

## 辅助函数管理

代码生成时需要从 Vue 导入各种运行时辅助函数。Transform 阶段负责收集需要的函数：

```javascript
// 辅助函数符号
const CREATE_VNODE = Symbol('createVNode')
const TO_DISPLAY_STRING = Symbol('toDisplayString')
const RENDER_LIST = Symbol('renderList')
const OPEN_BLOCK = Symbol('openBlock')
// ...

// 符号到名称的映射
const helperNameMap = {
  [CREATE_VNODE]: 'createVNode',
  [TO_DISPLAY_STRING]: 'toDisplayString',
  [RENDER_LIST]: 'renderList',
  // ...
}
```

使用辅助函数：

```javascript
function transformInterpolation(node, context) {
  if (node.type === NodeTypes.INTERPOLATION) {
    // 注册需要的辅助函数
    context.helper(TO_DISPLAY_STRING)
  }
}
```

helper 方法实现：

```javascript
helper(name) {
  const count = context.helpers.get(name) || 0
  context.helpers.set(name, count + 1)
  return name
}

removeHelper(name) {
  const count = context.helpers.get(name)
  if (count) {
    const currentCount = count - 1
    if (!currentCount) {
      context.helpers.delete(name)
    } else {
      context.helpers.set(name, currentCount)
    }
  }
}
```

使用计数是因为同一个辅助函数可能被多处使用。只有当计数归零时才真正移除。

## 节点操作

### replaceNode

替换当前节点：

```javascript
replaceNode(node) {
  context.parent.children[context.childIndex] = context.currentNode = node
}
```

使用示例——v-if 转换：

```javascript
function transformIf(node, context) {
  const dir = findDir(node, 'if')
  if (dir) {
    // 创建 IF 节点替换原元素
    const ifNode = createIfNode(node, dir)
    context.replaceNode(ifNode)
  }
}
```

### removeNode

删除节点：

```javascript
removeNode(node) {
  const list = context.parent.children
  const removalIndex = node
    ? list.indexOf(node)
    : context.currentNode
      ? context.childIndex
      : -1
  
  if (!node || node === context.currentNode) {
    context.currentNode = null
    context.onNodeRemoved()
  } else {
    if (context.childIndex > removalIndex) {
      context.childIndex--
      context.onNodeRemoved()
    }
  }
  
  list.splice(removalIndex, 1)
}
```

使用示例——删除空白文本：

```javascript
function transformText(node, context) {
  if (node.type === NodeTypes.TEXT && !node.content.trim()) {
    context.removeNode()
    return
  }
}
```

## 静态提升

静态内容可以提升到渲染函数外部，避免重复创建：

```javascript
hoist(exp) {
  // 添加到提升列表
  context.hoists.push(exp)
  
  // 返回引用标识符
  const identifier = createSimpleExpression(
    `_hoisted_${context.hoists.length}`,
    false,
    exp.loc,
    ConstantTypes.CAN_HOIST
  )
  identifier.hoisted = exp
  return identifier
}
```

生成的代码：

```javascript
// 提升到模块顶层
const _hoisted_1 = { class: "static" }
const _hoisted_2 = createElementVNode("span", null, "static text")

function render(_ctx) {
  return createElementVNode("div", _hoisted_1, [
    _hoisted_2,
    createElementVNode("span", null, _ctx.dynamic)
  ])
}
```

## 事件处理缓存

事件处理函数也可以缓存：

```javascript
cache(exp, isVNode) {
  return createCacheExpression(context.cached++, exp, isVNode)
}
```

生成的代码：

```javascript
function render(_ctx, _cache) {
  return createElementVNode("button", {
    onClick: _cache[0] || (_cache[0] = ($event) => _ctx.count++)
  }, "Click")
}
```

缓存避免了每次渲染都创建新的函数对象。

## 作用域管理

v-for 和 v-slot 会引入新的作用域变量：

```html
<div v-for="item in list">{{ item }}</div>
```

这里 `item` 不需要添加 `_ctx.` 前缀。上下文通过 `identifiers` 追踪当前作用域中的变量：

```javascript
addIdentifiers(exp) {
  if (isString(exp)) {
    addId(exp)
  } else if (exp.identifiers) {
    exp.identifiers.forEach(addId)
  } else if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
    addId(exp.content)
  }
}

function addId(id) {
  const { identifiers } = context
  if (identifiers[id] === undefined) {
    identifiers[id] = 0
  }
  identifiers[id]++
}

removeIdentifiers(exp) {
  // 类似逻辑，减少计数
}
```

表达式处理时检查：

```javascript
function processExpression(node, context) {
  const rawExp = node.content
  
  // 如果在当前作用域中，不添加前缀
  if (context.identifiers[rawExp]) {
    return node
  }
  
  // 添加 _ctx. 前缀
  node.content = `_ctx.${rawExp}`
  return node
}
```

## 特殊作用域计数

上下文还追踪特殊结构的嵌套层级：

```javascript
scopes: {
  vFor: number   // v-for 嵌套层级
  vSlot: number  // 插槽嵌套层级
  vPre: number   // v-pre 区域
  vOnce: number  // v-once 区域
}
```

这些信息用于特定优化。比如在 `v-once` 区域内，不需要缓存事件处理函数。

## 组件和指令收集

```javascript
// 遇到组件时
function transformElement(node, context) {
  if (isComponent) {
    context.components.add(node.tag)
  }
}

// 遇到自定义指令时
function buildDirectiveArgs(dir, context) {
  context.directives.add(dir.name)
}
```

收集的信息用于生成 resolve 调用：

```javascript
import { resolveComponent, resolveDirective } from "vue"

const _component_MyButton = resolveComponent("MyButton")
const _directive_focus = resolveDirective("focus")
```

## 上下文创建

```javascript
function createTransformContext(root, options) {
  const context = {
    // 选项
    options,
    prefixIdentifiers: options.prefixIdentifiers,
    hoistStatic: options.hoistStatic,
    cacheHandlers: options.cacheHandlers,
    nodeTransforms: options.nodeTransforms || [],
    directiveTransforms: options.directiveTransforms || {},
    
    // AST
    root,
    currentNode: root,
    parent: null,
    childIndex: 0,
    ancestors: [],
    
    // 状态
    helpers: new Map(),
    components: new Set(),
    directives: new Set(),
    hoists: [],
    imports: [],
    temps: 0,
    cached: 0,
    identifiers: Object.create(null),
    scopes: { vFor: 0, vSlot: 0, vPre: 0, vOnce: 0 },
    
    // 方法
    helper,
    removeHelper,
    helperString,
    replaceNode,
    removeNode,
    onNodeRemoved: () => {},
    addIdentifiers,
    removeIdentifiers,
    hoist,
    cache
  }
  
  return context
}
```

## 本章小结

本章分析了转换上下文的设计：

- **辅助函数管理**：收集代码生成需要的运行时函数
- **节点操作**：replaceNode、removeNode 支持 AST 修改
- **静态提升**：hoist 方法将静态内容提升
- **事件缓存**：cache 方法缓存事件处理函数
- **作用域管理**：追踪 v-for、v-slot 引入的变量

上下文是转换过程的中央协调器，接下来我们将看到各个转换器如何使用它。
