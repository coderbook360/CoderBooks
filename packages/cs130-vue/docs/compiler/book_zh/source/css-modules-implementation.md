# CSS Modules 实现

CSS Modules 是另一种样式隔离方案，通过生成唯一类名实现。Vue SFC 支持 CSS Modules，提供 `$style` 对象访问转换后的类名。

## 基本用法

```vue
<template>
  <div :class="$style.container">
    <h1 :class="$style.title">{{ title }}</h1>
    <p :class="[$style.text, $style.highlight]">{{ content }}</p>
  </div>
</template>

<style module>
.container {
  padding: 20px;
}
.title {
  font-size: 24px;
}
.text {
  color: #333;
}
.highlight {
  background: yellow;
}
</style>
```

## 编译结果

样式编译后：

```css
._container_x7k2s_1 {
  padding: 20px;
}
._title_x7k2s_4 {
  font-size: 24px;
}
._text_x7k2s_7 {
  color: #333;
}
._highlight_x7k2s_10 {
  background: yellow;
}
```

返回的映射对象：

```javascript
{
  container: '_container_x7k2s_1',
  title: '_title_x7k2s_4',
  text: '_text_x7k2s_7',
  highlight: '_highlight_x7k2s_10'
}
```

## 实现原理

使用 postcss-modules 插件：

```typescript
import postcssModules from 'postcss-modules'

function compileStyleWithModules(options) {
  let modules = {}
  
  const plugins = [
    postcssModules({
      generateScopedName: options.isProd
        ? '[hash:base64:5]'
        : '[name]_[local]_[hash:base64:5]',
      getJSON(cssFileName, json) {
        modules = json
      },
      ...options.modulesOptions
    })
  ]
  
  const result = postcss(plugins).process(options.source)
  
  return {
    code: result.css,
    modules
  }
}
```

## 类名生成策略

### 开发模式

保留原始类名，便于调试：

```css
/* 输入 */
.container { }

/* 输出 */
._container_x7k2s_1 { }
```

格式：`_[原类名]_[hash]_[行号]`

### 生产模式

最小化类名：

```css
/* 输入 */
.container { }

/* 输出 */
._x7k2s { }
```

格式：`_[hash]`

配置：

```typescript
{
  generateScopedName: isProd
    ? '[hash:base64:5]'
    : '[name]_[local]_[hash:base64:5]'
}
```

## 命名 CSS Modules

使用 `module` 属性指定名称：

```vue
<template>
  <div :class="classes.container">
    <span :class="styles.text">{{ text }}</span>
  </div>
</template>

<style module="classes">
.container { padding: 20px; }
</style>

<style module="styles">
.text { color: blue; }
</style>
```

编译时生成不同的注入：

```javascript
setup() {
  return {
    classes: { container: '_container_abc_1' },
    styles: { text: '_text_def_1' }
  }
}
```

## 与 script setup 集成

使用 `useCssModule`：

```vue
<script setup>
import { useCssModule } from 'vue'

const $style = useCssModule()
const classes = useCssModule('classes')

// 动态使用
const containerClass = computed(() => {
  return [$style.container, active.value && $style.active]
})
</script>
```

编译时注入：

```javascript
import { useCssModule as _useCssModule } from 'vue'

setup() {
  const $style = _useCssModule()
  // $style 从组件实例的 __cssModules 获取
}
```

## 运行时处理

组件定义中注入 `__cssModules`：

```javascript
export default {
  __cssModules: {
    $style: {
      container: '_container_x7k2s_1',
      title: '_title_x7k2s_4'
    }
  },
  setup() { ... }
}
```

`useCssModule` 实现：

```typescript
export function useCssModule(name = '$style') {
  const instance = getCurrentInstance()
  const modules = instance.type.__cssModules
  
  if (!modules) {
    __DEV__ && warn('No CSS modules found')
    return {}
  }
  
  const mod = modules[name]
  if (!mod) {
    __DEV__ && warn(`CSS module "${name}" not found`)
    return {}
  }
  
  return mod
}
```

## 组合类名

```vue
<template>
  <div :class="[$style.base, $style[type], isActive && $style.active]">
</template>

<style module>
.base { display: flex; }
.primary { color: blue; }
.secondary { color: gray; }
.active { font-weight: bold; }
</style>
```

动态类名通过方括号语法访问。

## 与 Scoped CSS 对比

| 特性 | CSS Modules | Scoped CSS |
|------|-------------|------------|
| 类名 | 转换为唯一 | 保持原样 |
| 使用方式 | `:class="$style.x"` | `class="x"` |
| 选择器 | 普通选择器 | 属性选择器 |
| 深度穿透 | 不支持 | `:deep()` |
| 全局样式 | `:global` | `:global()` |
| 调试 | 可读性稍差 | 更直观 |

## 全局类名

```css
/* 输入 */
:global(.external-lib-class) {
  color: red;
}

/* 输出 */
.external-lib-class {
  color: red;
}
```

`:global` 内的类名不转换。

## 组合（Composition）

```css
.base {
  color: blue;
}

.derived {
  composes: base;
  font-size: 20px;
}
```

编译后 `.derived` 会包含 `.base` 的类名：

```javascript
{
  base: '_base_x1',
  derived: '_base_x1 _derived_x2'
}
```

## 从其他文件组合

```css
.title {
  composes: heading from './typography.css';
}
```

导入外部 CSS Module 的类名。

## 配置选项

```typescript
interface CSSModulesOptions {
  // 类名生成模式
  generateScopedName?: string | ((name, filename, css) => string)
  // 是否使用驼峰命名
  localsConvention?: 'camelCase' | 'camelCaseOnly' | 'dashes' | 'dashesOnly'
  // 作用域行为
  scopeBehaviour?: 'global' | 'local'
  // 全局模式前缀
  globalModulePaths?: RegExp[]
  // 哈希前缀
  hashPrefix?: string
}
```

## 小结

CSS Modules 通过转换类名实现样式隔离。postcss-modules 插件处理转换，生成唯一类名和映射对象。模板通过 `$style` 对象或 `useCssModule` 访问转换后的类名。命名 modules 支持多个独立的样式块。composes 提供类名组合能力。与 scoped CSS 相比，CSS Modules 更适合需要精确控制类名的场景，且与第三方 CSS Modules 生态兼容。
