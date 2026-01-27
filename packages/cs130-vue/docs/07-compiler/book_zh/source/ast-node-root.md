# RootNode 根节点

RootNode 是 AST 的顶层节点。它包含解析的所有子节点，以及编译过程中收集的各种元数据。

## 节点定义

```typescript
export interface RootNode extends Node {
  type: NodeTypes.ROOT
  children: TemplateChildNode[]
  helpers: Set<symbol>
  components: string[]
  directives: string[]
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  cached: number
  temps: number
  ssrHelpers?: symbol[]
  codegenNode?: TemplateChildNode | JSChildNode | BlockStatement
  loc: SourceLocation
}
```

## 创建根节点

```typescript
export function createRoot(
  children: TemplateChildNode[],
  loc = locStub
): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: undefined,
    loc
  }
}
```

解析阶段只填充 children 和 loc，其他字段在转换阶段填充。

## children 字段

```typescript
children: TemplateChildNode[]
```

包含模板的所有顶层子节点：元素、文本、插值、注释等。

```typescript
type TemplateChildNode =
  | ElementNode
  | InterpolationNode
  | CompoundExpressionNode
  | TextNode
  | CommentNode
  | IfNode
  | IfBranchNode
  | ForNode
  | TextCallNode
```

## helpers 字段

```typescript
helpers: Set<symbol>
```

收集代码生成需要的运行时帮助函数：

```typescript
// 转换过程中
context.helper(CREATE_ELEMENT_VNODE)
context.helper(TO_DISPLAY_STRING)

// 收集到 root.helpers
Set { CREATE_ELEMENT_VNODE, TO_DISPLAY_STRING }
```

代码生成时，这些会变成 import 语句：

```typescript
import { createElementVNode, toDisplayString } from 'vue'
```

## components 字段

```typescript
components: string[]
```

收集模板中使用的组件名：

```html
<template>
  <MyButton />
  <OtherComponent />
</template>
```

生成：

```typescript
components: ['MyButton', 'OtherComponent']
```

用于生成组件解析代码：

```typescript
const _component_MyButton = resolveComponent('MyButton')
```

## directives 字段

```typescript
directives: string[]
```

收集使用的自定义指令：

```html
<div v-focus v-tooltip="msg"></div>
```

生成：

```typescript
directives: ['focus', 'tooltip']
```

用于生成指令解析代码：

```typescript
const _directive_focus = resolveDirective('focus')
```

## hoists 字段

```typescript
hoists: (JSChildNode | null)[]
```

收集静态提升的内容。这些表达式会被提升到渲染函数外部：

```typescript
// 模板
<div class="static">Static Content</div>

// 提升
const _hoisted_1 = { class: "static" }
const _hoisted_2 = createTextVNode("Static Content")
```

hoists 数组存储这些提升的表达式，代码生成时在模块顶层生成它们。

## imports 字段

```typescript
imports: ImportItem[]

interface ImportItem {
  exp: string | ExpressionNode
  path: string
}
```

用于 SFC 编译时的资源导入：

```html
<style src="./style.css"></style>
```

## cached 字段

```typescript
cached: number
```

记录缓存槽位的数量。事件处理器和某些表达式会被缓存：

```html
<button @click="handleClick">
```

生成：

```typescript
// _cache 数组需要的槽位数
_cache[0] || (_cache[0] = (...args) => handleClick(...args))
```

## temps 字段

```typescript
temps: number
```

记录临时变量的数量。某些转换需要临时变量：

```typescript
// v-for 可能需要临时变量
const _temp0 = items.value
```

## codegenNode 字段

```typescript
codegenNode?: TemplateChildNode | JSChildNode | BlockStatement
```

代码生成的入口节点。转换阶段在 children 上构建这个节点：

```typescript
// 单个根元素
root.codegenNode = elementVNodeCall

// 多个根元素（Fragment）
root.codegenNode = createVNodeCall(
  context,
  helper(FRAGMENT),
  ...
)

// SSR
root.codegenNode = blockStatement
```

## ssrHelpers 字段

```typescript
ssrHelpers?: symbol[]
```

SSR 编译时使用的帮助函数。和 helpers 类似但用于服务端：

```typescript
import { ssrRenderComponent, ssrInterpolate } from 'vue/server-renderer'
```

## 位置信息

```typescript
loc: SourceLocation
```

根节点的位置覆盖整个模板：

```typescript
{
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 最后行, column: 最后列, offset: 总长度 },
  source: 完整模板字符串
}
```

## 解析与转换的职责划分

解析阶段只填充：
- `children`：解析的节点树
- `loc`：位置信息

转换阶段填充：
- `helpers`：运行时导入
- `components`：组件列表
- `directives`：指令列表
- `hoists`：静态提升
- `cached`：缓存数量
- `temps`：临时变量数量
- `codegenNode`：生成代码的入口

## 根节点与模板结构

根节点可以有多个子节点（Fragment）：

```html
<template>
  <header></header>
  <main></main>
  <footer></footer>
</template>
```

这时 children 有三个元素，codegenNode 会生成 Fragment。

## 小结

RootNode 是 AST 的容器。解析阶段填充子节点，转换阶段填充元数据（helpers、components、hoists 等）。codegenNode 是代码生成的入口点。这种设计使三个阶段（解析、转换、生成）职责清晰，数据流向明确。
