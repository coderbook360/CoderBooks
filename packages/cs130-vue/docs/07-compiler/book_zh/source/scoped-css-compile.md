# Scoped CSS 编译

Scoped CSS 通过添加唯一属性选择器实现样式隔离。

## 基本原理

```vue
<template>
  <div class="example">hello</div>
</template>

<style scoped>
.example {
  color: red;
}
</style>
```

```html
<!-- 编译后 HTML -->
<div class="example" data-v-7ba5bd90>hello</div>
```

```css
/* 编译后 CSS */
.example[data-v-7ba5bd90] {
  color: red;
}
```

## compileStyle 函数

```typescript
export function compileStyle(
  options: SFCStyleCompileOptions
): SFCStyleCompileResults {
  const {
    source,
    filename,
    id,
    scoped = false,
    modules = false
  } = options

  const plugins: AcceptedPlugin[] = []

  if (scoped) {
    plugins.push(scopedPlugin(id))
  }

  if (modules) {
    plugins.push(modulesPlugin(/* ... */))
  }

  const result = postcss(plugins).process(source, {
    from: filename
  })

  return {
    code: result.css,
    map: result.map,
    errors: []
  }
}
```

## Scoped 插件

```typescript
function scopedPlugin(id: string): Plugin {
  const scopeId = `data-v-${id}`

  return {
    postcssPlugin: 'vue-sfc-scoped',

    Rule(rule) {
      processRule(rule, scopeId)
    }
  }
}

function processRule(rule: Rule, scopeId: string) {
  rule.selector = selectorParser(selectors => {
    selectors.each(selector => {
      rewriteSelector(selector, scopeId)
    })
  }).processSync(rule.selector)
}
```

## 选择器重写

```typescript
function rewriteSelector(
  selector: Selector,
  scopeId: string
) {
  let node: Node | null = null

  selector.each(n => {
    // 找到最后一个有意义的节点
    if (
      n.type !== 'pseudo' &&
      n.type !== 'combinator'
    ) {
      node = n
    }
  })

  if (node) {
    // 插入 scope 属性选择器
    selector.insertAfter(
      node,
      selectorParser.attribute({ attribute: scopeId })
    )
  }
}
```

## 选择器示例

```css
/* 输入 */
.foo { }
.foo .bar { }
.foo > .bar { }
.foo + .bar { }
.foo:hover { }
.foo::before { }

/* 输出 */
.foo[data-v-xxx] { }
.foo .bar[data-v-xxx] { }
.foo > .bar[data-v-xxx] { }
.foo + .bar[data-v-xxx] { }
.foo[data-v-xxx]:hover { }
.foo[data-v-xxx]::before { }
```

## 深度选择器

```css
/* :deep() 穿透 scoped */
.parent :deep(.child) {
  color: red;
}

/* 编译结果 */
.parent[data-v-xxx] .child {
  color: red;
}
```

```typescript
function processDeepSelector(
  selector: Selector,
  scopeId: string
) {
  selector.walk(node => {
    if (node.type === 'pseudo' && node.value === ':deep') {
      // 移除 :deep
      const inner = node.nodes[0]
      node.replaceWith(inner)

      // scope 加在 :deep 之前的元素上
      addScopeToParent(node, scopeId)
    }
  })
}
```

## :slotted() 选择器

```css
/* 选择插槽内容 */
:slotted(.slot-class) {
  color: blue;
}

/* 编译结果 */
.slot-class[data-v-xxx-s] {
  color: blue;
}
```

插槽内容使用 `-s` 后缀的 scope id。

## :global() 选择器

```css
/* 全局样式 */
:global(.global-class) {
  color: green;
}

/* 编译结果（无 scope） */
.global-class {
  color: green;
}
```

## 模板 scopeId 注入

```typescript
// 模板编译添加 scopeId
function transformElement(node: ElementNode, context: TransformContext) {
  if (context.scopeId) {
    // 添加 scope 属性
    node.props.push({
      type: NodeTypes.ATTRIBUTE,
      name: context.scopeId,
      value: undefined
    })
  }
}
```

## 组件根元素

```vue
<!-- Parent.vue -->
<template>
  <Child class="child" />
</template>

<style scoped>
.child { color: red; }
</style>
```

子组件根元素会同时有父组件和自身的 scopeId：

```html
<div class="child" data-v-parent data-v-child>
</div>
```

## 动态组件

```vue
<component :is="currentComponent" class="dynamic" />
```

动态组件的 scopeId 在运行时处理。

## 性能考虑

```css
/* 避免过于宽泛的选择器 */
* { }  /* 编译为 *[data-v-xxx]，性能差 */

/* 推荐使用类选择器 */
.specific { }
```

## 小结

Scoped CSS 编译的关键点：

1. **属性选择器**：添加 data-v-xxx
2. **选择器重写**：PostCSS 处理
3. **深度穿透**：:deep() 语法
4. **全局样式**：:global() 逃逸

下一章将分析 CSS v-bind 的编译实现。
