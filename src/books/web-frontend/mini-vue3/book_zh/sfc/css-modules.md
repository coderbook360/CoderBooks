# CSS Modules 与 v-bind in CSS

上一章分析了 scoped CSS 通过属性选择器实现样式隔离。**但属性选择器不是唯一的方案**——Vue 还提供了 CSS Modules 和 `v-bind()` in CSS 两种高级样式方案。

**首先要问的是**：这三种方案有什么本质区别？各自适用于什么场景？

- **scoped CSS**：编译时添加属性选择器，运行时零开销
- **CSS Modules**：编译时哈希类名，提供 `$style` 对象供 JS 引用
- **v-bind()**：编译时转为 CSS 变量，运行时响应式更新

**理解这两种方案的编译原理，能帮你在不同场景做出最佳选择。**

## CSS Modules 概述

```html
<template>
  <div :class="$style.container">
    <span :class="$style.text">Hello</span>
  </div>
</template>

<style module>
.container { padding: 20px; }
.text { color: red; }
</style>
```

编译后的 CSS：

```css
.container_abc123 { padding: 20px; }
.text_def456 { color: red; }
```

`$style` 对象：

```javascript
{
  container: 'container_abc123',
  text: 'text_def456'
}
```

## CSS Modules 编译

使用 PostCSS 的 CSS Modules 插件：

```javascript
async function compileCSSModules(source, filename, options) {
  const modulesPlugin = require('postcss-modules')
  
  let cssModulesJSON = {}
  
  const plugins = [
    modulesPlugin({
      generateScopedName: options.isProd
        ? '[hash:base64:8]'
        : '[name]_[local]_[hash:base64:5]',
      
      getJSON: (cssFileName, json) => {
        cssModulesJSON = json
      }
    })
  ]
  
  const result = await postcss(plugins).process(source)
  
  return {
    code: result.css,
    modules: cssModulesJSON
  }
}
```

类名生成策略：

```javascript
function generateScopedName(localName, filename, css) {
  const hash = createHash(filename + css)
  
  // 开发模式：保留原始类名
  if (!isProd) {
    return `${localName}_${hash.substring(0, 8)}`
  }
  
  // 生产模式：只用哈希
  return `_${hash.substring(0, 8)}`
}
```

## $style 注入

compileScript 时注入 CSS Modules 映射：

```javascript
function processStyleModules(descriptor, options) {
  const cssModules = {}
  
  for (const style of descriptor.styles) {
    if (style.module) {
      // module 属性值作为键名
      // <style module> -> $style
      // <style module="classes"> -> classes
      const name = typeof style.module === 'string'
        ? style.module
        : '$style'
      
      cssModules[name] = style.modules
    }
  }
  
  // 注入到组件
  if (Object.keys(cssModules).length) {
    return `
const cssModules = ${JSON.stringify(cssModules)}
export default {
  ...${defaultExport},
  __cssModules: cssModules
}
`
  }
}
```

运行时获取：

```javascript
function useCssModule(name = '$style') {
  const instance = getCurrentInstance()
  const modules = instance.type.__cssModules
  
  if (!modules) {
    warn('当前组件没有 CSS Modules')
    return {}
  }
  
  return modules[name] || {}
}
```

## v-bind() in CSS

在 CSS 中绑定 JavaScript 变量：

```html
<script setup>
import { ref } from 'vue'
const color = ref('red')
</script>

<style>
.text {
  color: v-bind(color);
}
</style>
```

编译后的 CSS：

```css
.text {
  color: var(--7ba5bd90-color);
}
```

运行时注入 CSS 变量：

```javascript
// 组件挂载时
element.style.setProperty('--7ba5bd90-color', color.value)
```

## v-bind() 编译实现

样式解析时提取 v-bind 表达式：

```javascript
function parseCssVars(styles) {
  const cssVars = []
  
  for (const style of styles) {
    const content = style.content
    
    // 匹配 v-bind(xxx)
    const vBindRE = /v-bind\s*\(\s*([^)]+)\s*\)/g
    let match
    
    while ((match = vBindRE.exec(content))) {
      const exp = match[1].trim()
      cssVars.push(exp)
    }
  }
  
  return cssVars
}
```

生成 CSS 变量名：

```javascript
function getCssVarName(id, raw) {
  // id: 组件唯一标识
  // raw: 表达式文本
  return `--${id}-${raw.replace(/[^a-z0-9]/gi, '-')}`
}
```

样式转换：

```javascript
function transformVBind(source, id) {
  return source.replace(
    /v-bind\s*\(\s*([^)]+)\s*\)/g,
    (_, exp) => `var(${getCssVarName(id, exp)})`
  )
}
```

## 运行时 CSS 变量更新

**这是 v-bind() 的关键**：CSS 变量需要在响应式数据变化时更新。

**问题**：如何让 CSS 变量响应式更新？

**答案**：使用 `watchEffect` 监听变化，自动更新 CSS 变量。

```javascript
function useCssVars(getter) {
  const instance = getCurrentInstance()
  
  // watchEffect 会在依赖变化时重新执行
  watchEffect(() => {
    const vars = getter()  // 读取响应式数据
    setVars(instance, vars)  // 更新 CSS 变量
  })
}

function setVars(instance, vars) {
  const el = instance.vnode.el
  
  for (const key in vars) {
    // 通过 style.setProperty 设置 CSS 变量
    el.style.setProperty(`--${instance.uid}-${key}`, vars[key])
  }
}
```

编译器自动生成 `useCssVars` 调用：

```javascript
// 编译后的组件
setup(__props) {
  const color = ref('red')
  
  // 编译器自动注入
  useCssVars(() => ({
    color: color.value
  }))
  
  return { color }
}
```

## 深度嵌套处理

CSS 变量设置在组件根元素上，子元素通过继承获得：

```html
<template>
  <div class="container">
    <span class="text">Hello</span>
  </div>
</template>

<style>
.text {
  color: v-bind(color);
}
</style>
```

编译后：

```css
.text {
  color: var(--xxx-color);
}
```

根元素 `.container` 设置了 `--xxx-color`，子元素 `.text` 通过 CSS 变量继承获得值。

## 方案对比

三种样式隔离方案各有特点：

**scoped CSS**
- 隔离方式：属性选择器（`[data-v-xxx]`）
- 运行时开销：无
- 动态样式：不支持
- 与 JS 交互：不直接交互
- 打包优化：一般

**CSS Modules**
- 隔离方式：类名哈希（`_button_1a2b3`）
- 运行时开销：无
- 动态样式：不支持
- 与 JS 交互：通过 `$style` 对象
- 打包优化：好（原子化友好）

**v-bind()**
- 隔离方式：CSS 变量（`--xxx-color`）
- 运行时开销：有（变量更新）
- 动态样式：支持
- 与 JS 交互：直接绑定响应式数据
- 打包优化：一般

**选择建议**：

- **scoped**：大多数场景的默认选择
- **CSS Modules**：需要在 JS 中引用类名，或与设计系统集成
- **v-bind()**：需要动态响应式样式

## 踩坑经验

以下是使用 CSS Modules 和 v-bind 时的常见问题：

**1. `$style` 在模板中 undefined**

```vue-html
<!-- ❌ 错误：忘记添加 module 属性 -->
<template>
  <div :class="$style.container">...</div>
</template>

<style>
/* 没有 module 属性，$style 不存在 */
</style>
```

**原因**：`$style` 只在 `<style module>` 时才会注入。

**解决**：确保 `<style>` 标签包含 `module` 属性。

**2. CSS Modules 类名与外部库冲突**

```vue-html
<style module>
/* ❌ 类名被哈希，无法匹配外部库的 DOM 结构 */
.el-input {
  border-color: red;
}
</style>
```

**原因**：CSS Modules 会哈希所有类名，包括你想覆盖的外部类名。

**解决**：使用 `:global()` 包裹外部类名：

```css
:global(.el-input) {
  border-color: red;
}
```

**3. v-bind() 在 SSR 首屏闪烁**

```vue-html
<script setup>
const theme = ref({ color: 'blue' })
</script>

<style>
/* SSR 时可能看到短暂的默认样式 */
.text { color: v-bind('theme.color'); }
</style>
```

**原因**：v-bind() 依赖运行时更新 CSS 变量，SSR 时初始值可能不同步。

**解决**：
- 确保 SSR 和客户端的初始数据一致
- 或使用 CSS-in-JS 方案处理关键样式

**4. v-bind() 深层对象属性的引号问题**

```vue-html
<style>
/* ❌ 错误：对象路径必须用引号包裹 */
.text { color: v-bind(theme.colors.primary); }

/* ✅ 正确 */
.text { color: v-bind('theme.colors.primary'); }
</style>
```

**原因**：编译器需要明确知道表达式边界，对象路径包含 `.` 需要引号。

## 源码参考

相关实现位于 `@vue/compiler-sfc` 包：

- **CSS Modules 处理**：`packages/compiler-sfc/src/compileStyle.ts` 中的 `cssModulesPlugin`
- **v-bind 转换**：`packages/compiler-sfc/src/cssVars.ts` 中的 `parseCssVars` 和 `genCssVarsCode`
- **运行时更新**：`packages/runtime-dom/src/helpers/useCssVars.ts`
- **模块注入**：`packages/compiler-sfc/src/compileScript.ts` 中 `$style` 对象的生成逻辑

阅读这些源码时，建议关注：
1. `cssModulesPlugin` 如何调用 postcss-modules
2. `parseCssVars` 如何提取 v-bind() 表达式
3. `useCssVars` 如何利用 watchPostEffect 实现响应式更新

## 练习与思考

1. **CSS Modules 命名冲突**：如果两个组件的 CSS Modules 生成了相同的哈希类名（虽然概率极低），会发生什么？Vue 的实现如何避免这种情况？

2. **v-bind 性能优化**：如果一个组件有 20 个 v-bind() 绑定，每次响应式数据变化都会触发所有变量更新吗？如何优化？

3. **SSR 同构**：v-bind() 在 SSR 场景下是如何处理的？服务端渲染时 CSS 变量的初始值从哪里来？

4. **混合使用**：一个组件能否同时使用 scoped、CSS Modules 和 v-bind()？如果能，它们的优先级如何？

## 本章小结

本章分析了 CSS Modules 和 v-bind in CSS：

- **CSS Modules**：类名哈希 + $style 对象注入
- **v-bind()**：编译为 CSS 变量 + 运行时更新
- **方案对比**：各有适用场景

下一章将分析 Vite Vue 插件的实现。
