# transform 转换入口

transform 函数是编译器转换阶段的入口。它遍历 AST，应用各种转换插件，为代码生成做准备。

## 函数签名

```typescript
export function transform(root: RootNode, options: TransformOptions) {
  const context = createTransformContext(root, options)
  traverseNode(root, context)
  if (options.hoistStatic) {
    hoistStatic(root, context)
  }
  if (!options.ssr) {
    createRootCodegen(root, context)
  }
  root.helpers = new Set([...context.helpers.keys()])
  root.components = [...context.components]
  root.directives = [...context.directives]
  root.imports = context.imports
  root.hoists = context.hoists
  root.temps = context.temps
  root.cached = context.cached
}
```

## 转换流程

1. **创建上下文**：初始化转换状态
2. **遍历节点**：深度优先遍历 AST，应用转换
3. **静态提升**：识别并提升静态内容
4. **创建根代码生成节点**：构建 codegenNode

## 创建转换上下文

```typescript
function createTransformContext(
  root: RootNode,
  options: TransformOptions
): TransformContext {
  const context: TransformContext = {
    // 选项
    selfName: options.selfName,
    prefixIdentifiers: options.prefixIdentifiers,
    hoistStatic: options.hoistStatic,
    cacheHandlers: options.cacheHandlers,
    nodeTransforms: options.nodeTransforms,
    directiveTransforms: options.directiveTransforms,
    transformHoist: options.transformHoist,
    
    // 状态
    root,
    helpers: new Map(),
    components: new Set(),
    directives: new Set(),
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    
    // 当前节点信息
    currentNode: root,
    parent: null,
    childIndex: 0,
    
    // 帮助方法
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
    },
    replaceNode(node) {
      context.parent!.children[context.childIndex] = context.currentNode = node
    },
    removeNode(node) {
      const list = context.parent!.children
      const removalIndex = node
        ? list.indexOf(node)
        : context.currentNode
          ? context.childIndex
          : -1
      if (removalIndex < 0) {
        throw new Error(`node being removed is not a child of current parent`)
      }
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
    },
    onNodeRemoved: () => {},
    addIdentifiers(exp) { /* ... */ },
    removeIdentifiers(exp) { /* ... */ },
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
    },
    cache(exp, isVNode = false) {
      return createCacheExpression(context.cached++, exp, isVNode)
    }
  }
  return context
}
```

上下文维护转换状态，提供节点操作和帮助函数注册的方法。

## 节点转换

```typescript
nodeTransforms: NodeTransform[]

type NodeTransform = (
  node: RootNode | TemplateChildNode,
  context: TransformContext
) => void | (() => void) | (() => void)[]
```

节点转换是函数，接收节点和上下文。可以返回退出函数，在子节点处理完后调用。

### 内置节点转换

```typescript
const nodeTransforms = [
  transformOnce,          // v-once
  transformIf,            // v-if/v-else-if/v-else
  transformMemo,          // v-memo
  transformFor,           // v-for
  transformExpression,    // 表达式重写
  transformSlotOutlet,    // <slot>
  transformElement,       // 元素处理
  trackSlotScopes,        // 作用域插槽
  transformText           // 文本处理
]
```

顺序很重要：v-if 在 v-for 之前处理。

## 指令转换

```typescript
directiveTransforms: Record<string, DirectiveTransform>

type DirectiveTransform = (
  dir: DirectiveNode,
  node: ElementNode,
  context: TransformContext,
  augmentor?: (ret: DirectiveTransformResult) => DirectiveTransformResult
) => DirectiveTransformResult
```

指令转换处理特定的指令：

```typescript
const directiveTransforms = {
  bind: transformBind,
  on: transformOn,
  model: transformModel,
  text: transformText,
  html: transformHtml,
  show: transformShow,
  cloak: () => ({ props: [] })
}
```

## 遍历节点

```typescript
function traverseNode(
  node: RootNode | TemplateChildNode,
  context: TransformContext
) {
  context.currentNode = node
  const { nodeTransforms } = context
  const exitFns = []
  
  for (let i = 0; i < nodeTransforms.length; i++) {
    const onExit = nodeTransforms[i](node, context)
    if (onExit) {
      if (isArray(onExit)) {
        exitFns.push(...onExit)
      } else {
        exitFns.push(onExit)
      }
    }
    if (!context.currentNode) {
      // 节点被移除
      return
    } else {
      // 节点可能被替换
      node = context.currentNode
    }
  }
  
  // 处理子节点
  switch (node.type) {
    case NodeTypes.COMMENT:
      if (!context.ssr) {
        context.helper(CREATE_COMMENT)
      }
      break
    case NodeTypes.INTERPOLATION:
      if (!context.ssr) {
        context.helper(TO_DISPLAY_STRING)
      }
      break
    case NodeTypes.IF:
      for (let i = 0; i < node.branches.length; i++) {
        traverseNode(node.branches[i], context)
      }
      break
    case NodeTypes.IF_BRANCH:
    case NodeTypes.FOR:
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      traverseChildren(node, context)
      break
  }
  
  // 调用退出函数（逆序）
  context.currentNode = node
  let i = exitFns.length
  while (i--) {
    exitFns[i]()
  }
}
```

## 遍历子节点

```typescript
function traverseChildren(
  parent: ParentNode,
  context: TransformContext
) {
  let i = 0
  const nodeRemoved = () => {
    i--
  }
  for (; i < parent.children.length; i++) {
    const child = parent.children[i]
    if (isString(child)) continue
    context.parent = parent
    context.childIndex = i
    context.onNodeRemoved = nodeRemoved
    traverseNode(child, context)
  }
}
```

## 静态提升

```typescript
if (options.hoistStatic) {
  hoistStatic(root, context)
}
```

静态提升识别不变的内容，将其提升到渲染函数外部。这是主要的编译时优化之一。

## 创建根代码生成节点

```typescript
function createRootCodegen(root: RootNode, context: TransformContext) {
  const { helper } = context
  const { children } = root
  
  if (children.length === 1) {
    const child = children[0]
    if (isSingleElementRoot(root, child) && child.codegenNode) {
      const codegenNode = child.codegenNode
      if (codegenNode.type === NodeTypes.VNODE_CALL) {
        makeBlock(codegenNode, context)
      }
      root.codegenNode = codegenNode
    } else {
      root.codegenNode = child
    }
  } else if (children.length > 1) {
    // Fragment
    let patchFlag = PatchFlags.STABLE_FRAGMENT
    let patchFlagText = PatchFlagNames[PatchFlags.STABLE_FRAGMENT]
    
    if (children.filter(c => c.type !== NodeTypes.COMMENT).length === 1) {
      patchFlag |= PatchFlags.DEV_ROOT_FRAGMENT
      patchFlagText += `, ${PatchFlagNames[PatchFlags.DEV_ROOT_FRAGMENT]}`
    }
    
    root.codegenNode = createVNodeCall(
      context,
      helper(FRAGMENT),
      undefined,
      root.children,
      patchFlag + (__DEV__ ? ` /* ${patchFlagText} */` : ``),
      undefined,
      undefined,
      true,
      undefined,
      false
    )
  }
}
```

单个根元素直接作为 codegenNode，多个根元素包装成 Fragment。

## 收集结果

```typescript
root.helpers = new Set([...context.helpers.keys()])
root.components = [...context.components]
root.directives = [...context.directives]
root.imports = context.imports
root.hoists = context.hoists
root.temps = context.temps
root.cached = context.cached
```

转换结束后，将上下文收集的信息同步到根节点。

## 小结

transform 是转换阶段的入口。它创建上下文，深度遍历 AST，应用节点转换和指令转换。转换可以修改、替换或移除节点，可以返回退出函数在子节点处理后执行。最后进行静态提升，创建根代码生成节点，并将收集的元数据同步到根节点。
