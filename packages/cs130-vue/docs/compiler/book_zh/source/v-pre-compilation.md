# v-pre 编译跳过处理

v-pre 指令让编译器跳过该元素及其子元素的编译，原样输出模板内容。

## 基本用法

```vue
<template>
  <div v-pre>
    {{ rawMustache }}
    <span v-bind:id="rawId">Not compiled</span>
  </div>
</template>
```

输出 HTML 保留原始内容，不做任何处理。

## 编译识别

```typescript
function parseElement(
  context: ParserContext,
  ancestors: ElementNode[]
): ElementNode | undefined {
  // 解析开始标签
  const element = parseTag(context, TagType.Start)

  // 检查 v-pre
  const isPreTag = element.props.some(
    p => p.type === NodeTypes.DIRECTIVE && p.name === 'pre'
  )

  if (isPreTag) {
    // 标记 v-pre 模式
    context.inVPre = true

    // 移除 v-pre 属性
    element.props = element.props.filter(
      p => !(p.type === NodeTypes.DIRECTIVE && p.name === 'pre')
    )
  }

  // 解析子节点
  element.children = parseChildren(context, ancestors)

  // 退出 v-pre 模式
  if (isPreTag) {
    context.inVPre = false
  }

  return element
}
```

## inVPre 模式下的解析

```typescript
function parseTag(context: ParserContext, type: TagType): ElementNode {
  // 解析属性时检查 inVPre
  const props = context.inVPre
    ? parseRawAttributes(context)
    : parseAttributes(context)

  return {
    type: NodeTypes.ELEMENT,
    tag,
    props,
    // ...
  }
}

function parseRawAttributes(context: ParserContext): AttributeNode[] {
  const attrs: AttributeNode[] = []

  while (!isEnd(context)) {
    const attr = parseRawAttribute(context)
    attrs.push(attr)
  }

  return attrs
}

function parseRawAttribute(context: ParserContext): AttributeNode {
  const name = parseAttributeName(context)
  let value = undefined

  if (context.source.startsWith('=')) {
    advanceBy(context, 1)
    value = parseAttributeValue(context)
  }

  // 返回普通属性，不解析指令
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value ? { type: NodeTypes.TEXT, content: value } : undefined
  }
}
```

## 插值跳过

```typescript
function parseChildren(
  context: ParserContext,
  ancestors: ElementNode[]
): TemplateChildNode[] {
  const nodes: TemplateChildNode[] = []

  while (!isEnd(context, ancestors)) {
    const s = context.source

    if (s.startsWith('{{') && !context.inVPre) {
      // 正常解析插值
      node = parseInterpolation(context)
    } else if (s.startsWith('{{') && context.inVPre) {
      // v-pre 模式：作为文本处理
      node = parseText(context)
    }
    // ...
  }

  return nodes
}
```

## 编译结果

```vue
<template>
  <div v-pre>
    {{ message }}
    <span :id="dynamicId">Text</span>
  </div>
</template>
```

```typescript
// 不编译，直接输出字符串
_createElementVNode("div", null, [
  _createTextVNode(" {{ message }} "),
  _createElementVNode("span", { ":id": "dynamicId" }, "Text")
])
```

## 转换阶段跳过

```typescript
function transformElement(node: ElementNode, context: TransformContext) {
  // v-pre 元素不需要转换
  if (node.tagType === ElementTypes.ELEMENT && node.props.length === 0) {
    // 静态元素，无需处理
    return
  }

  // 正常元素转换逻辑
  // ...
}
```

## 使用场景

```vue
<!-- 展示 Vue 模板语法 -->
<div v-pre>
  <p>Use {{ variableName }} for interpolation</p>
  <p>Use v-bind:attr for dynamic attributes</p>
</div>

<!-- 性能优化：大量静态内容 -->
<div v-pre>
  <!-- 大量静态 HTML 无需编译 -->
</div>
```

## 与 v-once 区别

```vue
<!-- v-pre：编译时跳过 -->
<span v-pre>{{ msg }}</span>
<!-- 输出：{{ msg }} -->

<!-- v-once：运行时一次渲染 -->
<span v-once>{{ msg }}</span>
<!-- 输出：Hello（如果 msg = 'Hello'） -->
```

## 嵌套处理

```vue
<div v-pre>
  <span>{{ outer }}</span>
  <div>
    <span>{{ inner }}</span>
  </div>
</div>
```

所有后代元素都受 v-pre 影响。

## 错误处理

```typescript
function validateVPre(node: ElementNode) {
  // v-pre 与其他指令冲突
  const hasVPre = node.props.some(p => p.name === 'pre')
  const hasOtherDirectives = node.props.some(
    p => p.type === NodeTypes.DIRECTIVE && p.name !== 'pre'
  )

  if (hasVPre && hasOtherDirectives) {
    // 警告：v-pre 会使其他指令失效
    warn('v-pre will skip compilation of other directives')
  }
}
```

## 小结

v-pre 编译跳过的关键点：

1. **模式切换**：inVPre 标记开启原始解析
2. **插值保留**：{{ }} 作为文本处理
3. **属性保留**：指令语法不解析
4. **后代继承**：所有子元素都跳过

下一章将分析 v-cloak 的处理机制。
