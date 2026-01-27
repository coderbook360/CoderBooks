# genFunctionExpression 函数表达式生成

函数表达式生成处理内联函数，如事件处理器和插槽函数。

## 函数表达式节点

```typescript
interface FunctionExpression extends Node {
  type: NodeTypes.JS_FUNCTION_EXPRESSION
  params: ExpressionNode | string | (ExpressionNode | string)[] | undefined
  returns?: TemplateChildNode | TemplateChildNode[] | JSChildNode
  body?: BlockStatement | IfStatement
  newline: boolean
  isSlot: boolean
  isNonScopedSlot?: boolean
}
```

## 生成函数

```typescript
function genFunctionExpression(
  node: FunctionExpression,
  context: CodegenContext
) {
  const { push, indent, deindent } = context
  const { params, returns, body, newline, isSlot } = node

  // 插槽需要 withCtx 包装
  if (isSlot) {
    push(`_${helperNameMap[WITH_CTX]}(`)
  }

  push(`(`, node)
  
  // 生成参数
  if (isArray(params)) {
    genNodeList(params, context)
  } else if (params) {
    genNode(params, context)
  }
  
  push(`) => `)

  // 生成函数体
  if (newline || body) {
    push(`{`)
    indent()
  }

  if (returns) {
    if (newline) {
      push(`return `)
    }
    if (isArray(returns)) {
      genNodeListAsArray(returns, context)
    } else {
      genNode(returns, context)
    }
  } else if (body) {
    genNode(body, context)
  }

  if (newline || body) {
    deindent()
    push(`}`)
  }

  if (isSlot) {
    // 插槽键
    if (node.isNonScopedSlot) {
      push(`, undefined, true`)
    }
    push(`)`)
  }
}
```

## 事件处理器

```html
<button @click="count++">Add</button>
```

```typescript
onClick: ($event) => (_ctx.count++)
```

## 方法引用

```html
<button @click="handleClick">Click</button>
```

```typescript
onClick: _ctx.handleClick
```

事件处理器如果是简单表达式，transform 阶段会保持引用而非包装为函数。

## 插槽函数

```html
<MyComponent>
  <template #header="{ title }">
    <h1>{{ title }}</h1>
  </template>
</MyComponent>
```

```typescript
_createVNode(_component_MyComponent, null, {
  header: _withCtx(({ title }) => [
    _createElementVNode("h1", null, _toDisplayString(title), 1)
  ]),
  _: 1
})
```

## withCtx 包装

```typescript
// slot 函数需要追踪当前实例
export function withCtx(
  fn: Slot,
  ctx: ComponentInternalInstance | null
) {
  const renderFnWithContext = (...args: any[]) => {
    // 设置当前渲染实例
    const prevInstance = currentRenderingInstance
    setCurrentRenderingInstance(ctx)
    const res = fn(...args)
    setCurrentRenderingInstance(prevInstance)
    return res
  }
  renderFnWithContext._c = true
  return renderFnWithContext
}
```

## 多行函数

```typescript
// newline: true 时
($event) => {
  return _createElementVNode("div", null, [
    _createTextVNode("Content")
  ])
}

// newline: false 时
($event) => _createElementVNode("div")
```

## 带语句块的函数

```typescript
// 复杂事件处理
onClick: ($event) => {
  _ctx.validate()
  _ctx.submit()
}
```

## 非作用域插槽

```html
<MyComponent>
  <template #default>Static content</template>
</MyComponent>
```

```typescript
default: _withCtx(() => [
  _createTextVNode("Static content")
], undefined, true)  // 第三个参数标记非作用域
```

## 小结

函数表达式生成的关键点：

1. **参数生成**：单个或数组形式
2. **返回值**：直接返回或数组
3. **withCtx**：插槽函数的实例追踪
4. **格式控制**：newline 控制换行

下一章将分析条件表达式的代码生成。
