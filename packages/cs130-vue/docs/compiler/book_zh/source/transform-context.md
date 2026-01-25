# createTransformContext 转换上下文

转换上下文是转换阶段的核心数据结构。它维护状态、提供工具方法、协调转换过程。

## 上下文结构

```typescript
export interface TransformContext extends Required<TransformOptions> {
  selfName: string | null
  root: RootNode
  helpers: Map<symbol, number>
  components: Set<string>
  directives: Set<string>
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  temps: number
  cached: number
  identifiers: { [name: string]: number | undefined }
  scopes: {
    vFor: number
    vSlot: number
    vPre: number
    vOnce: number
  }
  parent: ParentNode | null
  childIndex: number
  currentNode: RootNode | TemplateChildNode | null
  inVOnce: boolean
  helper<T extends symbol>(name: T): T
  removeHelper<T extends symbol>(name: T): void
  helperString(name: symbol): string
  replaceNode(node: TemplateChildNode): void
  removeNode(node?: TemplateChildNode): void
  onNodeRemoved(): void
  addIdentifiers(exp: ExpressionNode | string): void
  removeIdentifiers(exp: ExpressionNode | string): void
  hoist(exp: string | JSChildNode | ArrayExpression): SimpleExpressionNode
  cache<T extends JSChildNode>(exp: T, isVNode?: boolean): CacheExpression
}
```

## 状态管理

### 帮助函数追踪

```typescript
helpers: Map<symbol, number>

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

引用计数跟踪帮助函数使用。某些转换可能先添加后移除（如优化掉的代码）。

### 组件和指令收集

```typescript
components: Set<string>
directives: Set<string>
```

遇到组件或自定义指令时添加：

```typescript
// 在 transformElement 中
if (node.tagType === ElementTypes.COMPONENT) {
  context.components.add(node.tag)
}

// 在指令处理中
if (isCustomDirective(dir)) {
  context.directives.add(dir.name)
}
```

## 当前位置追踪

```typescript
parent: ParentNode | null
childIndex: number
currentNode: RootNode | TemplateChildNode | null
```

这些字段追踪遍历位置，支持节点操作。

### 遍历时更新

```typescript
function traverseChildren(parent, context) {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i]
    context.parent = parent
    context.childIndex = i
    traverseNode(child, context)
  }
}
```

## 节点操作

### 替换节点

```typescript
replaceNode(node) {
  context.parent!.children[context.childIndex] = context.currentNode = node
}
```

用于将一种节点替换为另一种。比如 v-if 将 ElementNode 替换为 IfNode。

### 移除节点

```typescript
removeNode(node) {
  const list = context.parent!.children
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
  context.parent!.children.splice(removalIndex, 1)
}
```

移除节点并调整遍历索引。`onNodeRemoved` 回调让遍历循环知道需要调整。

## 作用域管理

```typescript
scopes: {
  vFor: number
  vSlot: number
  vPre: number
  vOnce: number
}
```

嵌套计数器追踪当前作用域：

```typescript
// 进入 v-for
context.scopes.vFor++

// 处理子节点
traverseChildren(node, context)

// 离开 v-for
context.scopes.vFor--
```

这用于确定变量来源和优化决策。

## 标识符管理

```typescript
identifiers: { [name: string]: number | undefined }

addIdentifiers(exp: ExpressionNode | string) {
  if (!isBrowser) {
    if (isString(exp)) {
      addId(exp)
    } else if (exp.identifiers) {
      exp.identifiers.forEach(addId)
    } else if (exp.type === NodeTypes.SIMPLE_EXPRESSION) {
      addId(exp.content)
    }
  }
  
  function addId(id: string) {
    const { identifiers } = context
    if (identifiers[id] === undefined) {
      identifiers[id] = 0
    }
    identifiers[id]!++
  }
}

removeIdentifiers(exp) {
  // 类似，但递减计数
}
```

追踪作用域内的变量，用于确定表达式引用的是模板变量还是外部变量。

## 静态提升

```typescript
hoists: (JSChildNode | null)[]

hoist(exp) {
  if (isString(exp)) exp = createSimpleExpression(exp)
  context.hoists.push(exp)
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

提升静态内容，返回引用标识符：

```typescript
// 静态属性
const _hoisted_1 = { class: "container" }

// 静态文本
const _hoisted_2 = createTextVNode("Hello")

// 使用
createElementVNode("div", _hoisted_1, _hoisted_2)
```

## 缓存

```typescript
cached: number

cache(exp, isVNode = false) {
  return createCacheExpression(context.cached++, exp, isVNode)
}
```

用于事件处理器缓存和 v-memo：

```typescript
// 缓存事件处理器
_cache[0] || (_cache[0] = ($event) => (handleClick($event)))

// v-memo 缓存
_cache[1] || (_cache[1] = createVNode(...))
```

## 临时变量

```typescript
temps: number
```

某些转换需要临时变量：

```typescript
// 生成
const _temp0 = expression

context.temps++  // 增加计数
```

## 选项传递

```typescript
interface TransformContext extends Required<TransformOptions> {
  // 所有选项都可访问
  prefixIdentifiers: boolean
  hoistStatic: boolean
  cacheHandlers: boolean
  nodeTransforms: NodeTransform[]
  directiveTransforms: Record<string, DirectiveTransform>
  // ...
}
```

选项合并后传递给上下文，转换函数通过上下文访问选项。

## inVOnce 标记

```typescript
inVOnce: boolean
```

标记当前是否在 v-once 块内。v-once 内的内容不需要某些优化（已经只渲染一次）。

## 使用示例

```typescript
// 在 transformElement 中
function transformElement(node, context) {
  return () => {
    // 退出函数，子节点已处理
    
    const { helper, removeHelper } = context
    
    // 注册帮助函数
    helper(CREATE_ELEMENT_VNODE)
    
    // 检查作用域
    if (context.scopes.vFor > 0) {
      // 在 v-for 内，可能需要 key
    }
    
    // 替换节点
    node.codegenNode = createVNodeCall(...)
  }
}
```

## 小结

转换上下文是转换阶段的中枢。它管理帮助函数、组件、指令的收集，追踪遍历位置，提供节点操作方法，管理作用域和标识符，支持静态提升和缓存。通过引用计数和嵌套计数器，上下文能准确跟踪复杂的转换状态。
