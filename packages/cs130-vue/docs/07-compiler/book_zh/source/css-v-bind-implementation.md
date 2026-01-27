# CSS v-bind 编译

CSS v-bind 允许在样式中使用响应式 JavaScript 变量。

## 基本用法

```vue
<script setup>
import { ref } from 'vue'
const color = ref('red')
const fontSize = ref(16)
</script>

<template>
  <p class="text">Hello</p>
</template>

<style>
.text {
  color: v-bind(color);
  font-size: v-bind(fontSize + 'px');
}
</style>
```

## 编译流程

```typescript
export function compileStyle(options: SFCStyleCompileOptions) {
  const { source, id } = options

  // 1. 提取 v-bind 表达式
  const cssVars = extractCSSVars(source)

  // 2. 替换为 CSS 变量
  const code = replaceCSSVars(source, cssVars, id)

  return { code, cssVars }
}
```

## 表达式提取

```typescript
const cssVarRE = /v-bind\s*\(\s*(?:'([^']+)'|"([^"]+)"|([^)\s]+))\s*\)/g

function extractCSSVars(source: string): string[] {
  const vars: string[] = []
  let match

  while ((match = cssVarRE.exec(source))) {
    const exp = match[1] || match[2] || match[3]
    vars.push(exp.trim())
  }

  return vars
}
```

## CSS 变量替换

```typescript
function replaceCSSVars(
  source: string,
  vars: string[],
  id: string
): string {
  let index = 0

  return source.replace(cssVarRE, () => {
    const varName = `--${id}-${index++}`
    return `var(${varName})`
  })
}
```

## 编译结果

```css
/* 输入 */
.text {
  color: v-bind(color);
  font-size: v-bind(fontSize + 'px');
}

/* 输出 */
.text {
  color: var(--7ba5bd90-0);
  font-size: var(--7ba5bd90-1);
}
```

## 运行时注入

```typescript
// SFC 编译时生成
_useCssVars((_ctx) => ({
  '7ba5bd90-0': _ctx.color,
  '7ba5bd90-1': _ctx.fontSize + 'px'
}))

// useCssVars 实现
export function useCssVars(getter: () => Record<string, string>) {
  const instance = getCurrentInstance()!

  // 响应式更新
  watchPostEffect(() => {
    const vars = getter()
    setVarsOnVNode(instance.vnode, vars)
  })
}

function setVarsOnVNode(vnode: VNode, vars: Record<string, string>) {
  const el = vnode.el as HTMLElement
  if (!el) return

  for (const key in vars) {
    el.style.setProperty(`--${key}`, vars[key])
  }
}
```

## 完整编译输出

```vue
<script setup>
import { ref } from 'vue'
const color = ref('red')
</script>

<style>
.text { color: v-bind(color); }
</style>
```

```typescript
import { useCssVars as _useCssVars } from 'vue'

export default {
  setup(__props) {
    const color = ref('red')

    _useCssVars((_ctx) => ({
      "7ba5bd90-0": color.value
    }))

    return { color }
  }
}
```

## 表达式处理

```css
/* 简单变量 */
color: v-bind(color);
/* -> var(--xxx-0)，getter: color.value */

/* 表达式 */
width: v-bind(size + 'px');
/* -> var(--xxx-1)，getter: size.value + 'px' */

/* 字符串引号 */
content: v-bind('message');
/* -> var(--xxx-2)，getter: message.value */

/* 复杂表达式 */
transform: v-bind('`rotate(${angle}deg)`');
/* -> var(--xxx-3)，getter: `rotate(${angle.value}deg)` */
```

## ref 解包

```typescript
function genCssVarsGetter(
  vars: string[],
  bindings: BindingMetadata
): string {
  return vars.map((v, i) => {
    let exp = v

    // 根据绑定类型处理
    if (bindings[v] === BindingTypes.SETUP_REF) {
      exp = `${v}.value`
    }

    return `"${id}-${i}": (${exp})`
  }).join(',\n')
}
```

## Scoped 与 CSS 变量

```vue
<style scoped>
.text {
  color: v-bind(color);
}
</style>
```

```css
/* 同时应用 scoped 和 CSS 变量 */
.text[data-v-7ba5bd90] {
  color: var(--7ba5bd90-0);
}
```

## SSR 支持

```typescript
// SSR 时通过 style 属性注入
function ssrRenderStyle(vars: Record<string, string>): string {
  let style = ''
  for (const key in vars) {
    style += `--${key}:${vars[key]};`
  }
  return style
}

// 渲染结果
<div style="--7ba5bd90-0:red;">
```

## 性能注意

```typescript
// 每个组件实例有独立的 CSS 变量
// 更新时只修改该实例的 style

// 避免频繁更新
const color = ref('red')
// 每次 color 变化都会触发 style 更新
```

## 小结

CSS v-bind 编译的关键点：

1. **表达式提取**：正则匹配 v-bind()
2. **变量替换**：生成 CSS 自定义属性
3. **运行时注入**：useCssVars 响应式更新
4. **绑定解包**：自动处理 ref.value

下一章将进入 Vue 3.3+ 新增编译特性。
