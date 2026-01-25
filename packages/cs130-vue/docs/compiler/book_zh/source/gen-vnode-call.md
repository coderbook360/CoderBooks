# genVNodeCall VNode 调用生成

genVNodeCall 是元素和组件代码生成的核心函数，处理 VNodeCall 节点。

## VNodeCall 结构

```typescript
interface VNodeCall {
  type: NodeTypes.VNODE_CALL
  tag: string | symbol | CallExpression
  props: PropsExpression | undefined
  children: TemplateChildNode[] | undefined
  patchFlag: string | undefined
  dynamicProps: string | undefined
  directives: DirectiveArguments | undefined
  isBlock: boolean
  disableTracking: boolean
  isComponent: boolean
}
```

## 生成函数

```typescript
function genVNodeCall(node: VNodeCall, context: CodegenContext) {
  const { push, helper, pure } = context
  const {
    tag,
    props,
    children,
    patchFlag,
    dynamicProps,
    directives,
    isBlock,
    disableTracking,
    isComponent
  } = node

  // 1. 指令包装开始
  if (directives) {
    push(helper(WITH_DIRECTIVES) + `(`)
  }

  // 2. Block 包装开始
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${disableTracking ? `true` : ``}), `)
  }

  // 3. 纯函数标记
  if (pure) {
    push(PURE_ANNOTATION)
  }

  // 4. 选择 helper
  const callHelper = isBlock
    ? isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK
    : isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE

  push(helper(callHelper) + `(`, node)

  // 5. 生成参数列表
  genNodeList(
    genNullableArgs([tag, props, children, patchFlag, dynamicProps]),
    context
  )

  push(`)`)

  // 6. Block 包装结束
  if (isBlock) {
    push(`)`)
  }

  // 7. 指令包装结束
  if (directives) {
    push(`, `)
    genNode(directives, context)
    push(`)`)
  }
}
```

## 参数处理

```typescript
function genNullableArgs(
  args: (string | undefined)[]
): (string | null)[] {
  let i = args.length
  while (i--) {
    if (args[i] != null) break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}
```

从右向左找到第一个非空参数，省略之后的所有参数。

## 生成示例

```html
<div class="box">Hello</div>
```

```typescript
// 参数：tag, props, children
_createElementVNode("div", { class: "box" }, "Hello")
```

## Block 生成

```html
<div v-if="show">Content</div>
```

```typescript
// Block 需要 openBlock
(_openBlock(), _createElementBlock("div", null, "Content"))
```

## 带指令生成

```html
<input v-model="text" v-focus>
```

```typescript
_withDirectives(_createElementVNode("input", {
  "onUpdate:modelValue": $event => ((_ctx.text) = $event)
}, null, 8, ["onUpdate:modelValue"]), [
  [_vModelText, _ctx.text],
  [_directive_focus]
])
```

## 组件生成

```html
<MyComponent :msg="message" @click="handler">
  <template #default>Content</template>
</MyComponent>
```

```typescript
_createVNode(_component_MyComponent, {
  msg: _ctx.message,
  onClick: _ctx.handler
}, {
  default: _withCtx(() => [
    _createTextVNode("Content")
  ]),
  _: 1 /* STABLE */
})
```

## Helper 选择逻辑

```typescript
// 非 Block 元素
_createElementVNode(...)

// Block 元素（v-if/v-for 根节点）
(_openBlock(), _createElementBlock(...))

// 非 Block 组件
_createVNode(...)

// Block 组件
(_openBlock(), _createBlock(...))
```

## 参数列表生成

```typescript
function genNodeList(
  nodes: (string | symbol | CodegenNode | TemplateChildNode[])[],
  context: CodegenContext,
  multilines: boolean = false,
  comma: boolean = true
) {
  const { push, newline } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (isString(node)) {
      push(node)
    } else if (isArray(node)) {
      genNodeListAsArray(node, context)
    } else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      if (multilines) {
        comma && push(',')
        newline()
      } else {
        comma && push(', ')
      }
    }
  }
}
```

## 小结

genVNodeCall 的关键点：

1. **分层包装**：指令 → Block → VNode 调用
2. **Helper 选择**：根据 isBlock 和 isComponent 组合
3. **参数优化**：省略尾部空参数
4. **嵌套结构**：props 和 children 递归生成

下一章将分析函数表达式的生成。
