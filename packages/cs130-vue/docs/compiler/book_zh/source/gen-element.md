# genElement 元素生成

元素节点的代码生成是通过 genVNodeCall 实现的，因为 transform 阶段已将 ElementNode 转换为 VNodeCall。

## 元素生成流程

```typescript
// ElementNode 在 transform 后
{
  type: NodeTypes.ELEMENT,
  tag: 'div',
  codegenNode: {
    type: NodeTypes.VNODE_CALL,
    tag: '"div"',
    props: { ... },
    children: [ ... ],
    patchFlag: '1 /* TEXT */'
  }
}

// genNode 处理
case NodeTypes.ELEMENT:
  genNode(node.codegenNode!, context)
  break
```

## VNodeCall 生成

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

  if (directives) {
    push(helper(WITH_DIRECTIVES) + `(`)
  }
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${disableTracking ? `true` : ``}), `)
  }
  if (pure) {
    push(PURE_ANNOTATION)
  }

  const callHelper = isBlock
    ? isComponent ? CREATE_BLOCK : CREATE_ELEMENT_BLOCK
    : isComponent ? CREATE_VNODE : CREATE_ELEMENT_VNODE

  push(helper(callHelper) + `(`, node)
  genNodeList(
    genNullableArgs([tag, props, children, patchFlag, dynamicProps]),
    context
  )
  push(`)`)

  if (isBlock) {
    push(`)`)
  }
  if (directives) {
    push(`, `)
    genNode(directives, context)
    push(`)`)
  }
}
```

## 生成示例

```html
<div class="container" :id="dynamicId">
  {{ message }}
</div>
```

```typescript
_createElementVNode("div", {
  class: "container",
  id: dynamicId
}, _toDisplayString(message), 9 /* TEXT, PROPS */, ["id"])
```

## Block 元素

```html
<div v-if="show">Content</div>
```

```typescript
(_openBlock(), _createElementBlock("div", null, "Content"))
```

Block 元素需要先调用 openBlock，然后使用 createElementBlock。

## 带指令的元素

```html
<div v-show="visible" v-custom:arg.mod="value">
</div>
```

```typescript
_withDirectives(_createElementVNode("div"), [
  [_vShow, visible],
  [_directive_custom, value, "arg", { mod: true }]
])
```

## 组件与元素

```typescript
// 原生元素
_createElementVNode("div", props, children)

// Vue 组件
_createVNode(_component_MyButton, props, slots)
```

组件使用 createVNode，元素使用 createElementVNode（优化版本）。

## PatchFlag 参数

```typescript
// 文本内容动态
_createElementVNode("div", null, text, 1 /* TEXT */)

// class 动态
_createElementVNode("div", { class: cls }, null, 2 /* CLASS */)

// 多个标记
_createElementVNode("div", { class: cls, id: id }, text, 11 /* TEXT, CLASS, PROPS */, ["id"])
```

## 可空参数处理

```typescript
function genNullableArgs(args: any[]): CallExpression['arguments'] {
  let i = args.length
  while (i--) {
    if (args[i] != null) break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}

// 省略尾部的 null 参数
// [tag, null, children, null, null] -> [tag, null, children]
```

## 小结

元素生成的关键点：

1. **VNodeCall 处理**：统一通过 genVNodeCall
2. **Block 包装**：条件和循环元素使用 Block
3. **指令包装**：withDirectives 添加运行时指令
4. **参数优化**：省略尾部空参数

下一章将分析 genExpression 表达式生成。
