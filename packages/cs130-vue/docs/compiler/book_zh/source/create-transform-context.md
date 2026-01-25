# createTransformContext 上下文

createTransformContext 创建 AST 转换阶段的上下文对象。这个上下文贯穿整个转换过程，管理状态、收集信息、协调各个 transform 函数的工作。

## 核心结构

```typescript
interface TransformContext {
  // 选项
  selfName: string | null
  prefixIdentifiers: boolean
  hoistStatic: boolean
  cacheHandlers: boolean
  nodeTransforms: NodeTransform[]
  directiveTransforms: DirectiveTransforms
  transformHoist: HoistTransform | null
  isBuiltInComponent: (tag: string) => symbol | void
  isCustomElement: (tag: string) => boolean
  expressionPlugins: ParserPlugin[]
  scopeId: string | null
  slotted: boolean
  ssr: boolean
  inSSR: boolean
  ssrCssVars: string
  bindingMetadata: BindingMetadata
  inline: boolean
  isTS: boolean
  
  // 状态
  root: RootNode
  helpers: Map<symbol, number>
  components: Set<string>
  directives: Set<string>
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  temps: number
  cached: number
  identifiers: Record<string, number>
  scopes: {
    vFor: number
    vSlot: number
    vPre: number
    vOnce: number
  }
  parent: ParentNode | null
  currentNode: TemplateChildNode | null
  childIndex: number
  inVOnce: boolean
  
  // 方法
  helper<T extends symbol>(name: T): T
  removeHelper<T extends symbol>(name: T): void
  helperString(name: symbol): string
  replaceNode(node: TemplateChildNode): void
  removeNode(node?: TemplateChildNode): void
  onNodeRemoved: () => void
  addIdentifiers(exp: ExpressionNode | string): void
  removeIdentifiers(exp: ExpressionNode | string): void
  hoist(exp: JSChildNode): SimpleExpressionNode
  cache<T extends JSChildNode>(exp: T, isVNode?: boolean): CacheExpression
}
```

## 创建函数

```typescript
export function createTransformContext(
  root: RootNode,
  {
    filename = '',
    prefixIdentifiers = false,
    hoistStatic = false,
    cacheHandlers = false,
    nodeTransforms = [],
    directiveTransforms = {},
    transformHoist = null,
    isBuiltInComponent = NOOP,
    isCustomElement = NOOP,
    expressionPlugins = [],
    scopeId = null,
    slotted = true,
    ssr = false,
    inSSR = false,
    ssrCssVars = '',
    bindingMetadata = {},
    inline = false,
    isTS = false,
    onError = defaultOnError,
    onWarn = defaultOnWarn,
    compatConfig
  }: TransformOptions
): TransformContext {
  const nameMatch = filename.replace(/\?.*$/, '').match(/([^/\\]+)\.\w+$/)
  
  const context: TransformContext = {
    // 选项
    selfName: nameMatch && capitalize(camelize(nameMatch[1])),
    prefixIdentifiers,
    hoistStatic,
    cacheHandlers,
    nodeTransforms,
    directiveTransforms,
    transformHoist,
    isBuiltInComponent,
    isCustomElement,
    expressionPlugins,
    scopeId,
    slotted,
    ssr,
    inSSR,
    ssrCssVars,
    bindingMetadata,
    inline,
    isTS,
    onError,
    onWarn,
    compatConfig,
    
    // 状态
    root,
    helpers: new Map(),
    components: new Set(),
    directives: new Set(),
    hoists: [],
    imports: [],
    constantCache: new Map(),
    temps: 0,
    cached: 0,
    identifiers: Object.create(null),
    scopes: {
      vFor: 0,
      vSlot: 0,
      vPre: 0,
      vOnce: 0
    },
    parent: null,
    currentNode: root,
    childIndex: 0,
    inVOnce: false,
    
    // 方法实现...
  }
  
  return context
}
```

## helpers 管理

helpers 追踪需要导入的运行时函数：

```typescript
helper(name) {
  const count = context.helpers.get(name) || 0
  context.helpers.set(name, count + 1)
  return name
},

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
},

helperString(name) {
  return `_${helperNameMap[context.helper(name)]}`
}
```

使用引用计数，确保只在真正需要时导入。

## 组件和指令收集

```typescript
components: new Set()
directives: new Set()
```

在解析过程中收集使用的组件和指令名，用于生成 resolveComponent/resolveDirective 调用。

## 静态提升

```typescript
hoist(exp: JSChildNode): SimpleExpressionNode {
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

提升的表达式存入 hoists 数组，返回一个引用标识符。

## 缓存表达式

```typescript
cache<T extends JSChildNode>(exp: T, isVNode = false): CacheExpression {
  return createCacheExpression(context.cached++, exp, isVNode)
}
```

用于 v-once 和 v-memo 的节点缓存。

## 作用域标识符

```typescript
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
},

removeIdentifiers(exp: ExpressionNode | string) {
  // 类似逻辑，减少计数
}
```

追踪作用域内的变量，避免错误地添加 `_ctx.` 前缀。

## 节点操作

```typescript
replaceNode(node: TemplateChildNode) {
  context.parent!.children[context.childIndex] = context.currentNode = node
},

removeNode(node?: TemplateChildNode) {
  const list = context.parent!.children
  const removalIndex = node
    ? list.indexOf(node)
    : context.currentNode
      ? context.childIndex
      : -1
  
  if (!node || node === context.currentNode) {
    // 移除当前节点
    context.currentNode = null
    context.onNodeRemoved()
  } else {
    // 移除兄弟节点
    if (context.childIndex > removalIndex) {
      context.childIndex--
      context.onNodeRemoved()
    }
  }
  context.parent!.children.splice(removalIndex, 1)
}
```

支持在转换过程中修改 AST 结构。

## 作用域追踪

```typescript
scopes: {
  vFor: 0,   // v-for 嵌套深度
  vSlot: 0,  // v-slot 嵌套深度  
  vPre: 0,   // v-pre 嵌套深度
  vOnce: 0   // v-once 嵌套深度
}
```

transform 函数可以查询当前所处的作用域环境。

## 父子关系

```typescript
parent: ParentNode | null
currentNode: TemplateChildNode | null
childIndex: number
```

traverseNode 在遍历时更新这些值，transform 函数可以访问上下文关系。

## inVOnce 标记

```typescript
inVOnce: boolean
```

v-once 内部的节点不需要某些优化处理，因为整个子树会被缓存。

## bindingMetadata

```typescript
bindingMetadata: BindingMetadata
```

来自 script setup 的绑定信息：

```typescript
interface BindingMetadata {
  [key: string]: BindingTypes
}

enum BindingTypes {
  DATA,              // data 属性
  PROPS,             // props
  PROPS_ALIASED,     // 带别名的 props
  SETUP_LET,         // setup 中的 let
  SETUP_CONST,       // setup 中的 const
  SETUP_REACTIVE_CONST,  // setup 中的 reactive const
  SETUP_MAYBE_REF,   // setup 中可能是 ref
  SETUP_REF,         // setup 中确定是 ref
  OPTIONS,           // options API
  LITERAL_CONST      // 字面量常量
}
```

这决定了表达式如何添加前缀。

## 错误处理

```typescript
onError: (error: CompilerError) => void
onWarn: (warning: CompilerError) => void
```

transform 过程中的错误和警告通过这些回调报告。

## 使用示例

```typescript
const context = createTransformContext(root, {
  prefixIdentifiers: true,
  hoistStatic: true,
  cacheHandlers: true,
  nodeTransforms: [transformElement, transformText],
  directiveTransforms: { bind: transformBind, on: transformOn }
})

// 遍历时
context.currentNode = node
context.parent = parent
context.childIndex = i

// 收集 helper
context.helper(CREATE_VNODE)

// 静态提升
const hoisted = context.hoist(staticNode)
```

## 小结

createTransformContext 创建转换阶段的核心上下文。它管理 helpers、组件、指令的收集，支持静态提升和表达式缓存，追踪作用域和父子关系，处理节点的替换和移除。这个上下文贯穿整个 AST 转换过程，是各个 transform 函数协作的基础设施。通过集中管理状态，使转换逻辑可以专注于各自的职责。
