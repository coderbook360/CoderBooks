# compileStyle 样式编译

compileStyle 处理 SFC 的 style 块，支持 scoped 样式、CSS Modules、CSS 预处理器和 v-bind 动态样式。

## 核心接口

```typescript
export function compileStyle(
  options: SFCStyleCompileOptions
): SFCStyleCompileResults {
  return doCompileStyle({
    ...options,
    isAsync: false
  }) as SFCStyleCompileResults
}

export async function compileStyleAsync(
  options: SFCStyleCompileOptions
): Promise<SFCStyleCompileResults> {
  return doCompileStyle({
    ...options,
    isAsync: true
  })
}
```

## 编译选项

```typescript
interface SFCStyleCompileOptions {
  source: string                // CSS 源码
  filename: string              // 文件名
  id: string                    // 组件唯一 ID
  scoped?: boolean              // 是否 scoped
  trim?: boolean                // 是否去除首尾空白
  isProd?: boolean              // 是否生产模式
  inMap?: RawSourceMap          // 输入 source map
  preprocessLang?: PreprocessLang  // 预处理器
  preprocessOptions?: any       // 预处理器选项
  postcssOptions?: any          // PostCSS 选项
  postcssPlugins?: any[]        // PostCSS 插件
  modules?: boolean             // CSS Modules
  modulesOptions?: CSSModulesOptions
}
```

## 编译流程

```typescript
function doCompileStyle(options) {
  const { source, filename, id, scoped, modules, preprocessLang } = options
  
  const plugins: any[] = []
  
  // 1. 预处理
  let preprocessedSource = source
  if (preprocessLang) {
    const result = preprocess(source, preprocessLang, options)
    preprocessedSource = result.code
  }
  
  // 2. Scoped CSS 处理
  if (scoped) {
    plugins.push(scopedPlugin(id))
  }
  
  // 3. CSS Modules 处理
  if (modules) {
    plugins.push(modulesPlugin(options.modulesOptions))
  }
  
  // 4. v-bind 处理
  plugins.push(cssVarsPlugin({ id, isProd: options.isProd }))
  
  // 5. 运行 PostCSS
  const result = postcss(plugins).process(preprocessedSource, {
    from: filename,
    map: { inline: false, annotation: false }
  })
  
  return {
    code: result.css,
    map: result.map,
    errors: [],
    modules: extractModules(result),
    rawResult: result
  }
}
```

## 预处理器

### SCSS/Sass

```vue
<style lang="scss">
$primary-color: #42b883;

.container {
  color: $primary-color;
  
  .title {
    font-size: 24px;
  }
}
</style>
```

### Less

```vue
<style lang="less">
@primary-color: #42b883;

.container {
  color: @primary-color;
  
  .title {
    font-size: 24px;
  }
}
</style>
```

### Stylus

```vue
<style lang="stylus">
primary-color = #42b883

.container
  color primary-color
  
  .title
    font-size 24px
</style>
```

预处理实现：

```typescript
function preprocess(source, lang, options) {
  switch (lang) {
    case 'scss':
    case 'sass':
      return require('sass').compileString(source, options.preprocessOptions)
    case 'less':
      let result
      require('less').render(source, options.preprocessOptions, (err, output) => {
        result = output
      })
      return result
    case 'stylus':
      return { code: require('stylus').render(source, options.preprocessOptions) }
  }
}
```

## Scoped CSS

添加 data 属性选择器：

```css
/* 输入 */
.container { color: red; }
.container .title { font-size: 24px; }

/* 输出（id = 'data-v-abc123'）*/
.container[data-v-abc123] { color: red; }
.container .title[data-v-abc123] { font-size: 24px; }
```

PostCSS 插件实现：

```typescript
function scopedPlugin(id: string) {
  return {
    postcssPlugin: 'vue-sfc-scoped',
    Rule(rule) {
      rule.selectors = rule.selectors.map(selector => {
        return addScopeAttribute(selector, id)
      })
    }
  }
}

function addScopeAttribute(selector, id) {
  // 解析选择器，在合适位置添加 [data-v-xxx]
  return transformSelector(selector, node => {
    if (node.type === 'selector') {
      // 在最后一个元素选择器后添加属性选择器
      const lastElement = findLastElement(node)
      if (lastElement) {
        insertAfter(lastElement, createAttributeSelector(id))
      }
    }
  })
}
```

## CSS Modules

生成唯一类名：

```vue
<style module>
.container { padding: 20px; }
.title { font-size: 24px; }
</style>
```

输出：

```css
._container_1a2b3 { padding: 20px; }
._title_1a2b3 { font-size: 24px; }
```

返回映射：

```javascript
{
  container: '_container_1a2b3',
  title: '_title_1a2b3'
}
```

模板中使用：

```vue
<template>
  <div :class="$style.container">
    <h1 :class="$style.title">{{ title }}</h1>
  </div>
</template>
```

## v-bind CSS 变量

```vue
<script setup>
const textColor = ref('red')
</script>

<style>
.text {
  color: v-bind(textColor);
}
</style>
```

编译为：

```css
.text {
  color: var(--abc123-textColor);
}
```

运行时组件设置 CSS 变量：

```javascript
// 运行时自动注入
el.style.setProperty('--abc123-textColor', textColor.value)
```

## 深度选择器

### :deep()

```css
.container :deep(.child) {
  color: red;
}
```

编译为：

```css
.container[data-v-abc123] .child {
  color: red;
}
```

### :slotted()

```css
:slotted(.slot-content) {
  margin: 10px;
}
```

编译为：

```css
.slot-content[data-v-abc123-s] {
  margin: 10px;
}
```

### :global()

```css
:global(.global-class) {
  color: blue;
}
```

编译为（不加 scoped 属性）：

```css
.global-class {
  color: blue;
}
```

## 错误处理

```typescript
interface SFCStyleCompileResults {
  code: string
  map: RawSourceMap | undefined
  rawResult: Result | LazyResult | undefined
  errors: Error[]
  modules?: Record<string, string>
  dependencies: Set<string>
}
```

错误收集：

```typescript
try {
  const result = processor.process(source)
  return { code: result.css, errors: [] }
} catch (e) {
  return { code: '', errors: [e] }
}
```

## Source Map

保持与原始文件的映射：

```typescript
const result = postcss(plugins).process(source, {
  from: filename,
  to: filename,
  map: {
    inline: false,
    annotation: false,
    prev: options.inMap
  }
})
```

## 小结

compileStyle 处理 SFC 样式块的编译。支持 SCSS、Less、Stylus 等预处理器。Scoped CSS 通过添加属性选择器实现样式隔离。CSS Modules 生成唯一类名并返回映射。v-bind 转换为 CSS 变量，运行时动态更新。深度选择器和全局选择器提供了突破 scoped 限制的能力。整个流程基于 PostCSS，可以轻松扩展自定义插件。
