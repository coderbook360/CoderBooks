# transformElement 元素转换

`transformElement` 是最核心的节点转换之一。它处理普通元素和组件，生成 VNode 调用代码。

## 函数结构

```typescript
export const transformElement: NodeTransform = (node, context) => {
  // 只处理元素节点
  return function postTransformElement() {
    // 退出阶段：子节点已处理
    node = context.currentNode!
    
    if (
      !(
        node.type === NodeTypes.ELEMENT &&
        (node.tagType === ElementTypes.ELEMENT ||
          node.tagType === ElementTypes.COMPONENT)
      )
    ) {
      return
    }

    const { tag, props } = node
    const isComponent = node.tagType === ElementTypes.COMPONENT

    // 生成 VNode 调用
    // ...
  }
}
```

## 为什么在退出阶段处理

元素转换在退出阶段执行，因为需要等待：
1. 子节点完成转换
2. 子节点的 codegenNode 生成
3. 可以基于子节点信息做优化决策

## 确定标签表达式

```typescript
let vnodeTag = isComponent
  ? resolveComponentType(node as ComponentNode, context)
  : `"${tag}"`
```

### 组件标签

```typescript
function resolveComponentType(node, context) {
  let { tag } = node
  
  // 动态组件
  const isExplicitDynamic = isComponentTag(tag)
  const isProp = findProp(node, 'is')
  if (isProp) {
    if (isExplicitDynamic) {
      const exp = isProp.type === NodeTypes.ATTRIBUTE
        ? isProp.value && createSimpleExpression(isProp.value.content, true)
        : isProp.exp
      if (exp) {
        return createCallExpression(context.helper(RESOLVE_DYNAMIC_COMPONENT), [exp])
      }
    }
  }
  
  // 内置组件
  const builtIn = isCoreComponent(tag) || context.isBuiltInComponent(tag)
  if (builtIn) {
    if (!ssr) context.helper(builtIn)
    return builtIn
  }
  
  // 用户组件
  context.helper(RESOLVE_COMPONENT)
  context.components.add(tag)
  return toValidAssetId(tag, 'component')
}
```

## 处理属性

```typescript
const { props, directives: runtimeDirectives, patchFlag, dynamicPropNames } = 
  buildProps(node, context)
```

`buildProps` 分析所有属性，返回：
- `props`：属性表达式
- `directives`：需要运行时处理的指令
- `patchFlag`：优化标志
- `dynamicPropNames`：动态属性名列表

## 处理子节点

```typescript
if (node.children.length > 0) {
  if (node.children.length === 1 && vnodeTag !== TELEPORT) {
    const child = node.children[0]
    const type = child.type
    const hasDynamicTextChild =
      type === NodeTypes.INTERPOLATION ||
      type === NodeTypes.COMPOUND_EXPRESSION
    
    if (hasDynamicTextChild && getConstantType(child, context) === ConstantTypes.NOT_CONSTANT) {
      patchFlag |= PatchFlags.TEXT
    }
    
    if (hasDynamicTextChild || type === NodeTypes.TEXT) {
      vnodeChildren = child
    } else {
      vnodeChildren = node.children
    }
  } else {
    vnodeChildren = node.children
  }
}
```

单个文本/插值子节点优化处理。

## 处理组件插槽

```typescript
if (isComponent) {
  if (shouldBuildAsSlots) {
    vnodeChildren = buildSlots(node, context).slots
  } else {
    const slots = node.children.filter(child => child.type !== NodeTypes.COMMENT)
    // 隐式默认插槽
  }
}
```

## 创建 VNode 调用

```typescript
node.codegenNode = createVNodeCall(
  context,
  vnodeTag,
  vnodeProps,
  vnodeChildren,
  vnodePatchFlag,
  vnodeDynamicProps,
  vnodeDirectives,
  !!shouldUseBlock,
  false /* disableTracking */,
  isComponent,
  node.loc
)
```

### createVNodeCall 结构

```typescript
interface VNodeCall extends Node {
  type: NodeTypes.VNODE_CALL
  tag: string | symbol | CallExpression
  props: PropsExpression | undefined
  children:
    | TemplateChildNode[]
    | TemplateTextChildNode
    | SlotsExpression
    | ForRenderListExpression
    | SimpleExpressionNode
    | undefined
  patchFlag: string | undefined
  dynamicProps: string | undefined
  directives: DirectiveArguments | undefined
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean
}
```

## PatchFlag 分析

```typescript
let patchFlag = 0

if (hasDynamicKeys) {
  patchFlag |= PatchFlags.FULL_PROPS
} else {
  if (hasClassBinding) {
    patchFlag |= PatchFlags.CLASS
  }
  if (hasStyleBinding) {
    patchFlag |= PatchFlags.STYLE
  }
  if (dynamicPropNames.length) {
    patchFlag |= PatchFlags.PROPS
  }
  if (hasHydrationEventBinding) {
    patchFlag |= PatchFlags.HYDRATE_EVENTS
  }
}

if (hasRef) {
  patchFlag |= PatchFlags.NEED_PATCH
}
if (runtimeDirectives.length) {
  patchFlag |= PatchFlags.NEED_PATCH
}
```

PatchFlag 告诉运行时需要比较什么。

## Block 标记

```typescript
let shouldUseBlock =
  // 动态组件可能改变类型
  isDynamicComponent ||
  // 内置组件有复杂行为
  vnodeTag === TELEPORT ||
  vnodeTag === SUSPENSE ||
  // 有运行时指令
  (!isComponent && runtimeDirectives.length > 0)
```

Block 节点收集动态后代，支持扁平化 diff。

## 运行时指令

```typescript
if (runtimeDirectives.length) {
  node.codegenNode = createCallExpression(
    context.helper(WITH_DIRECTIVES),
    [
      node.codegenNode,
      createArrayExpression(
        runtimeDirectives.map(dir => buildDirectiveArgs(dir, context))
      )
    ]
  )
}
```

需要运行时处理的指令用 `withDirectives` 包装：

```typescript
withDirectives(
  createElementVNode("div", null, null, ...),
  [[vFocus], [vTooltip, msg]]
)
```

## 静态元素处理

如果元素完全静态，可能被整体提升：

```typescript
// 在 hoistStatic 阶段
if (constantType >= ConstantTypes.CAN_HOIST) {
  // 提升整个元素
  context.hoist(node.codegenNode!)
}
```

## 内置元素处理

某些标签有特殊处理：

```typescript
// Teleport
if (vnodeTag === TELEPORT) {
  vnodeChildren = buildSlots(node, context).slots
}

// Suspense
if (vnodeTag === SUSPENSE) {
  vnodeChildren = buildSlots(node, context).slots
}

// KeepAlive
if (vnodeTag === KEEP_ALIVE) {
  // 只允许一个子节点
}
```

## 示例转换

```html
<div class="box" :id="dynamicId">{{ msg }}</div>
```

转换后的 codegenNode：

```typescript
{
  type: NodeTypes.VNODE_CALL,
  tag: '"div"',
  props: {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties: [
      { key: 'class', value: '"box"' },
      { key: 'id', value: { content: 'dynamicId' } }
    ]
  },
  children: { content: 'msg' },
  patchFlag: '9 /* TEXT, PROPS */',
  dynamicProps: '["id"]',
  isBlock: false,
  isComponent: false
}
```

## 小结

transformElement 处理元素和组件节点，在退出阶段执行。它分析标签类型、处理属性、处理子节点（包括插槽），计算 PatchFlag，最终生成 VNodeCall。运行时指令用 withDirectives 包装。Block 标记用于优化 diff。这是编译优化的核心所在。
