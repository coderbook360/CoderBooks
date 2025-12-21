# CSS 作用域：scoped 样式的实现

当我们给 `<style>` 添加 `scoped` 属性时，**Vue 是如何确保样式只作用于当前组件的？**

**理解 scoped CSS 的实现原理，能帮你避免样式穿透等常见问题。** 本章将分析 scoped CSS 的实现原理。

## 工作原理

源码：

```html
<template>
  <div class="example">hello</div>
</template>

<style scoped>
.example { color: red; }
</style>
```

编译后的模板：

```html
<div class="example" data-v-7ba5bd90>hello</div>
```

编译后的样式：

```css
.example[data-v-7ba5bd90] { color: red; }
```

核心机制：

1. 为组件生成唯一的 `scopeId`（如 `data-v-7ba5bd90`）
2. 模板编译时，为所有元素添加 `scopeId` 属性
3. 样式编译时，为所有选择器添加 `[scopeId]` 属性选择器

## scopeId 生成

```javascript
function generateScopeId(filename, source) {
  // 基于文件路径和内容生成哈希
  const hash = createHash(filename + source)
  return `data-v-${hash.substring(0, 8)}`
}

function createHash(str) {
  let hash = 5381
  let i = str.length
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }
  return (hash >>> 0).toString(16)
}
```

或使用 crypto：

```javascript
import { createHash } from 'crypto'

const hash = createHash('sha256')
  .update(filename + source)
  .digest('hex')
  .substring(0, 8)
const scopeId = `data-v-${hash}`
```

## 模板中添加 scopeId

**现在要问第二个问题**：scopeId 是如何添加到 DOM 元素上的？

有两种方式：

**方式一：编译时静态添加**

模板编译时，通过 TransformContext 传递 scopeId：

```javascript
interface TransformContext {
  scopeId: string | null
}

function genElement(node, context) {
  // 如果有 scopeId，直接生成带 scopeId 的代码
  if (context.scopeId) {
    // 生成: _createElementVNode("div", { "data-v-xxx": "" }, ...)
  }
}
```

**方式二：运行时动态添加**

对于动态组件或插槽内容，需要运行时处理：

```javascript
function renderComponentRoot(instance) {
  const { scopeId } = instance.type
  const result = render()
  
  if (scopeId) {
    setScopeId(result, scopeId)
  }
  
  return result
}

function setScopeId(vnode, scopeId) {
  if (vnode.el) {
    // 为 DOM 元素添加空属性
    vnode.el.setAttribute(scopeId, '')
  }
  // 递归处理子节点
  if (vnode.children) {
    for (const child of vnode.children) {
      setScopeId(child, scopeId)
    }
  }
}
```

## 样式编译

使用 PostCSS 插件处理选择器：

```javascript
import postcss from 'postcss'

function compileStyle(options) {
  const { source, id, scoped } = options
  
  const plugins = []
  
  if (scoped) {
    plugins.push(scopedPlugin(id))
  }
  
  return postcss(plugins).process(source)
}
```

scoped 插件实现：

```javascript
function scopedPlugin(id) {
  return {
    postcssPlugin: 'vue-scoped',
    Rule(rule) {
      processSelector(rule, id)
    }
  }
}

function processSelector(rule, id) {
  rule.selector = selectorParser(selectors => {
    selectors.each(selector => {
      // 找到最后一个非伪类/伪元素的节点
      let node = null
      selector.each(n => {
        if (n.type !== 'pseudo' && n.type !== 'combinator') {
          node = n
        }
      })
      
      // 在该节点后添加属性选择器
      if (node) {
        selector.insertAfter(
          node,
          selectorParser.attribute({ attribute: id })
        )
      }
    })
  }).processSync(rule.selector)
}
```

转换示例：

```css
/* 输入 */
.example { color: red; }
div .item { font-size: 14px; }

/* 输出 */
.example[data-v-7ba5bd90] { color: red; }
div .item[data-v-7ba5bd90] { font-size: 14px; }
```

## 特殊选择器

### :deep()

穿透子组件样式：

```css
.parent :deep(.child) { color: red; }

/* 编译为 */
.parent[data-v-xxx] .child { color: red; }
```

实现：

```javascript
if (node.value === ':deep') {
  // 将 scopeId 添加到 :deep 之前
  selector.insertBefore(
    node,
    selectorParser.attribute({ attribute: id })
  )
  // 移除 :deep 包装
  node.replaceWith(node.nodes[0])
}
```

### :slotted()

匹配插槽内容：

```css
:slotted(.item) { color: red; }

/* 编译为 */
.item[data-v-xxx-s] { color: red; }
```

运行时为插槽内容添加特殊的 scopeId 后缀。

### :global()

全局样式：

```css
:global(.title) { color: red; }

/* 编译为 */
.title { color: red; }
```

实现：

```javascript
if (node.value === ':global') {
  // 不添加 scopeId，直接解包
  node.replaceWith(node.nodes[0])
  // 标记跳过后续处理
  selector._skip = true
}
```

## 子组件根元素

父组件的 scoped 样式可以影响子组件的根元素：

```html
<!-- Parent.vue -->
<template>
  <Child class="child-root" />
</template>

<style scoped>
.child-root { border: 1px solid red; }
</style>
```

这是因为子组件的根元素会同时拥有：

1. 子组件自己的 scopeId
2. 父组件传递的 scopeId（通过 `$attrs`）

## 性能考虑

属性选择器的性能开销：

```css
/* scoped 生成 */
.example[data-v-xxx] { }

/* 性能略低于 */
.example { }
```

但在现代浏览器中，这个差异可以忽略不计。scoped 样式的主要价值在于**样式隔离**，避免全局污染。

## 本章小结

本章分析了 scoped CSS 的实现原理：

- **scopeId 生成**：基于文件路径和内容的哈希
- **模板处理**：为元素添加 scopeId 属性
- **样式编译**：PostCSS 插件添加属性选择器
- **特殊选择器**：:deep()、:slotted()、:global()
- **子组件根元素**：可被父组件 scoped 样式影响

下一章将分析 CSS Modules 和 v-bind in CSS 的实现。

---

## 源码参考

本章涉及的 Vue 3 源码位置：

- **compileStyle**：`packages/compiler-sfc/src/compileStyle.ts`
- **scopedPlugin**：`packages/compiler-sfc/src/style/pluginScoped.ts`
- **processSelector**：`packages/compiler-sfc/src/style/pluginScoped.ts`
- **:deep 处理**：`packages/compiler-sfc/src/style/pluginScoped.ts` 约 L100

---

## 踩坑经验

**1. :deep() 使用不当**

```css
/* ❌ 错误：:deep 必须有父选择器 */
<style scoped>
:deep(.child-class) { color: red; }
</style>

/* ✅ 正确：在父选择器后使用 */
<style scoped>
.parent :deep(.child-class) { color: red; }
</style>

/* 或者使用 :global 代替 */
<style scoped>
:global(.child-class) { color: red; }
</style>
```

**2. 第三方组件样式穿透失败**

```css
/* Element Plus 等组件库的类名可能包含特殊字符 */
/* ❌ 可能不生效 */
.parent :deep(.el-input__inner) { }

/* ✅ 使用更具体的选择器或检查实际渲染的 DOM */
```

**3. scoped 样式影响性能？**

```css
/* 属性选择器在现代浏览器中性能影响极小 */
/* 不需要为了"性能"而放弃 scoped */

/* 如果确实有性能敏感场景，可考虑 CSS Modules */
```

**4. 动态组件的 scoped 样式**

```html
<!-- 动态组件的根元素也会继承父组件的 scopeId -->
<component :is="currentComponent" class="styled" />

<style scoped>
/* 这个样式会影响动态组件的根元素 */
.styled { border: 1px solid red; }
</style>
```

---

## 练习与思考

1. **代码分析**：以下 scoped 样式编译后的结果是什么？

   ```css
   .parent .child { color: red; }
   .item:hover { background: blue; }
   ```

2. **思考题**：为什么 Vue 选择属性选择器而不是 BEM 命名或 CSS-in-JS 方案来实现样式隔离？

3. **进阶探索**：尝试实现一个简单的 PostCSS 插件，为所有选择器添加自定义前缀。
