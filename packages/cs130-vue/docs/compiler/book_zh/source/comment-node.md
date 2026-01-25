# CommentNode 注释节点

注释节点表示模板中的 HTML 注释，Vue 编译器可以选择保留或移除这些注释。

## 节点结构

```typescript
export interface CommentNode extends Node {
  type: NodeTypes.COMMENT
  content: string
}
```

注释节点结构与文本节点类似，包含类型标识和注释内容。

```html
<!-- This is a comment -->
```

解析结果：
```typescript
{
  type: NodeTypes.COMMENT,
  content: ' This is a comment ',
  loc: {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 26, offset: 25 },
    source: '<!-- This is a comment -->'
  }
}
```

## 注释保留策略

```typescript
// 编译选项
interface CompilerOptions {
  comments?: boolean
}

// 默认行为
const defaultCompilerOptions = {
  comments: __DEV__  // 开发模式保留，生产模式移除
}
```

通过编译选项控制注释是否保留在输出中。开发模式通常保留注释便于调试，生产模式移除以减小体积。

## 解析阶段

```typescript
function parseChildren(context, mode, ancestors) {
  const nodes = []
  
  while (!isEnd(context, mode, ancestors)) {
    const s = context.source
    let node: TemplateChildNode | undefined
    
    if (startsWith(s, '<!--')) {
      // 注释解析
      if (context.options.comments) {
        // 保留注释，生成节点
        node = parseComment(context)
      } else {
        // 移除注释，跳过
        const endIndex = s.indexOf('-->')
        advanceBy(context, endIndex + 3)
        continue
      }
    }
    
    if (node) {
      nodes.push(node)
    }
  }
  
  return nodes
}
```

根据配置决定是解析为节点还是直接跳过。跳过时仍需正确消费源码以继续解析后续内容。

## 代码生成

```typescript
function genComment(node: CommentNode, context: CodegenContext) {
  const { push, helper } = context
  push(`${helper(CREATE_COMMENT)}(${JSON.stringify(node.content)})`, node)
}

// 生成结果
_createCommentVNode(" This is a comment ")
```

保留的注释会被转换为 `createCommentVNode` 调用，在运行时创建真实的 DOM 注释节点。

## 运行时表现

```typescript
// runtime-core/vnode.ts
export function createCommentVNode(
  text: string = '',
  asBlock: boolean = false
): VNode {
  return asBlock
    ? (openBlock(), createBlock(Comment, null, text))
    : createVNode(Comment, null, text)
}

// 渲染到 DOM
function mountComment(vnode: VNode, container: Element) {
  const el = (vnode.el = document.createComment(vnode.children as string))
  container.appendChild(el)
}
```

Comment 是一种特殊的 VNode 类型，渲染时调用 `document.createComment` 创建 DOM 注释节点。

## 特殊用途的注释

Vue 内部使用注释节点作为占位符：

```typescript
// v-if 为 false 时的占位符
<!--v-if-->

// teleport 的边界标记
<!--teleport start-->
<!--teleport end-->

// suspense 的分隔符
<!--[-->
<!--]-->

// v-memo 的缓存标记
```

这些特殊注释帮助运行时识别组件边界和状态。

## 条件渲染

```html
<div v-if="show">Content</div>
```

当 `show` 为 `false` 时：
```typescript
// 渲染结果
createCommentVNode("v-if", true)

// DOM 中
<!-- v-if -->
```

注释占位符保持了 DOM 结构的一致性，便于条件变化时正确更新。

## 多行注释

```html
<!--
  This is a
  multi-line comment
-->
```

```typescript
{
  type: NodeTypes.COMMENT,
  content: '\n  This is a\n  multi-line comment\n',
  loc: { ... }
}
```

多行注释的换行符被保留在 content 中。

## 嵌套注释检测

```html
<!-- outer <!-- inner --> outer -->
```

```typescript
// 解析时会检测到嵌套
// 发出 NESTED_COMMENT 错误
emitError(context, ErrorCodes.NESTED_COMMENT)
```

HTML 规范不允许嵌套注释，编译器会发出警告但仍然尝试解析。

## SSR 中的注释

```typescript
// SSR 渲染
function ssrRenderComment(content: string): string {
  return `<!--${content}-->`
}

// hydration 时需要匹配
function hydrateComment(node: Node, vnode: VNode) {
  if (node.nodeType !== Node.COMMENT_NODE) {
    // 类型不匹配
    return handleMismatch(...)
  }
  // 内容可以不完全匹配
  vnode.el = node
  return node.nextSibling
}
```

SSR 场景下注释节点参与水合过程，需要正确匹配服务端渲染的注释。

## 与开发工具

在开发模式下保留注释有助于：

```html
<!-- TODO: Refactor this component -->
<MyComponent />

<!-- FIXME: Performance issue here -->
<HeavyComponent v-for="item in items" />
```

这些注释在浏览器开发者工具中可见，帮助开发者理解代码结构。

## 性能考虑

```typescript
// 生产模式移除注释
// 减少 VNode 数量
// 减少 DOM 节点数量
// 减小打包体积

// 在大型应用中
// 注释节点可能很多
// 移除它们有明显收益
```

生产模式默认移除注释是一种合理的优化策略。

## 小结

CommentNode 的设计考虑了多种场景：

1. **可配置保留**：通过编译选项控制
2. **占位符用途**：条件渲染等场景的必要组件
3. **开发辅助**：保留注释便于调试
4. **性能优化**：生产模式移除减小开销

下一章将分析 AttributeNode 与 DirectiveNode 属性相关节点。
