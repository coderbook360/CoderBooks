# 静态提升实现

静态提升（Static Hoisting）是 Vue 3 编译器的核心优化，将静态节点提升到渲染函数外部。

## 提升原理

```typescript
// 提升前：每次渲染都创建
function render() {
  return createVNode("div", null, [
    createVNode("span", null, "Static"),  // 重复创建
    createVNode("span", null, ctx.dynamic)
  ])
}

// 提升后：复用静态节点
const _hoisted_1 = createVNode("span", null, "Static")

function render() {
  return createVNode("div", null, [
    _hoisted_1,  // 复用
    createVNode("span", null, ctx.dynamic)
  ])
}
```

## hoistStatic 函数

```typescript
export function hoistStatic(root: RootNode, context: TransformContext) {
  walk(
    root,
    context,
    // 根节点不能提升
    isSingleElementRoot(root, root.children[0])
  )
}

function walk(
  node: ParentNode,
  context: TransformContext,
  doNotHoistNode: boolean = false
) {
  const { children } = node
  const originalCount = children.length
  let hoistedCount = 0

  for (let i = 0; i < children.length; i++) {
    const child = children[i]

    if (
      child.type === NodeTypes.ELEMENT &&
      child.tagType === ElementTypes.ELEMENT
    ) {
      const constantType = doNotHoistNode
        ? ConstantTypes.NOT_CONSTANT
        : getConstantType(child, context)

      if (constantType > ConstantTypes.NOT_CONSTANT) {
        if (constantType >= ConstantTypes.CAN_HOIST) {
          // 标记为可提升
          ;(child.codegenNode as VNodeCall).patchFlag = PatchFlags.HOISTED + ``
          // 执行提升
          child.codegenNode = context.hoist(child.codegenNode!)
          hoistedCount++
          continue
        }
      }
    }

    // 递归处理子节点
    if (child.type === NodeTypes.ELEMENT) {
      walk(child, context)
    }
  }
}
```

## ConstantType 枚举

```typescript
export const enum ConstantTypes {
  NOT_CONSTANT = 0,     // 非常量
  CAN_SKIP_PATCH = 1,   // 可跳过 patch
  CAN_HOIST = 2,        // 可提升
  CAN_STRINGIFY = 3     // 可字符串化
}
```

## getConstantType

```typescript
export function getConstantType(
  node: TemplateChildNode | SimpleExpressionNode,
  context: TransformContext
): ConstantTypes {
  switch (node.type) {
    case NodeTypes.ELEMENT:
      if (node.tagType !== ElementTypes.ELEMENT) {
        return ConstantTypes.NOT_CONSTANT
      }

      const codegenNode = node.codegenNode!
      if (codegenNode.type !== NodeTypes.VNODE_CALL) {
        return ConstantTypes.NOT_CONSTANT
      }

      // 检查 patchFlag
      if (codegenNode.patchFlag !== undefined) {
        return ConstantTypes.NOT_CONSTANT
      }

      // 检查 props
      const propsType = getConstantTypeOfProps(codegenNode.props, context)
      if (propsType === ConstantTypes.NOT_CONSTANT) {
        return ConstantTypes.NOT_CONSTANT
      }

      // 检查 children
      const childrenType = getConstantTypeOfChildren(
        codegenNode.children,
        context
      )

      return Math.min(propsType, childrenType)

    case NodeTypes.TEXT:
    case NodeTypes.COMMENT:
      return ConstantTypes.CAN_STRINGIFY

    case NodeTypes.INTERPOLATION:
    case NodeTypes.TEXT_CALL:
      return ConstantTypes.NOT_CONSTANT

    case NodeTypes.SIMPLE_EXPRESSION:
      return node.constType
  }

  return ConstantTypes.NOT_CONSTANT
}
```

## context.hoist

```typescript
hoist(exp: JSChildNode): SimpleExpressionNode {
  // 添加到提升列表
  context.hoists.push(exp)

  // 返回引用
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

## 代码生成

```typescript
function genHoists(hoists: JSChildNode[], context: CodegenContext) {
  if (!hoists.length) return

  const { push, newline } = context

  for (let i = 0; i < hoists.length; i++) {
    const exp = hoists[i]
    if (exp) {
      push(`const _hoisted_${i + 1} = `)
      genNode(exp, context)
      newline()
    }
  }
}
```

## 生成示例

```html
<div>
  <span class="static">Static Text</span>
  <span>{{ dynamic }}</span>
</div>
```

```typescript
const _hoisted_1 = /*#__PURE__*/_createElementVNode("span", {
  class: "static"
}, "Static Text")

function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", null, [
    _hoisted_1,
    _createElementVNode("span", null, _toDisplayString(_ctx.dynamic), 1)
  ]))
}
```

## 静态 props 提升

```html
<div id="app" class="container">{{ content }}</div>
```

```typescript
const _hoisted_1 = { id: "app", class: "container" }

function render(_ctx) {
  return (_openBlock(), _createElementBlock("div", _hoisted_1,
    _toDisplayString(_ctx.content), 1))
}
```

Props 对象也可以被提升。

## 不能提升的情况

```html
<!-- 动态绑定 -->
<div :class="dynamicClass">Static</div>

<!-- 组件 -->
<MyComponent>Static</MyComponent>

<!-- v-if/v-for -->
<div v-if="show">Static</div>
```

这些情况下节点不能提升。

## 小结

静态提升的关键点：

1. **常量类型判断**：分析节点是否可提升
2. **递归遍历**：深度优先处理子树
3. **引用替换**：用 _hoisted_N 替换原节点
4. **生成提升变量**：在渲染函数外部声明

下一章将分析 PatchFlag 的实现。
