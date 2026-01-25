# patchStyle 样式更新

patchStyle 处理元素的 style 属性更新。与 class 的整体替换不同，style 需要进行精细的 diff 操作——只更新变化的属性，避免不必要的样式重计算。

## 函数实现

patchStyle 的核心逻辑：

```typescript
export function patchStyle(el: Element, prev: Style, next: Style) {
  const style = (el as HTMLElement).style
  const isCssString = isString(next)
  
  if (next && !isCssString) {
    // 设置新样式
    for (const key in next) {
      setStyle(style, key, next[key])
    }
    
    // 移除旧样式中不再存在的属性
    if (prev && !isString(prev)) {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '')
        }
      }
    }
  } else {
    const currentDisplay = style.display
    
    if (isCssString) {
      // 字符串形式，直接设置 cssText
      if (prev !== next) {
        style.cssText = next
      }
    } else if (prev) {
      // next 为 null/undefined，移除所有样式
      el.removeAttribute('style')
    }
    
    // 保持 v-show 的 display 值
    if ('_vod' in el) {
      style.display = currentDisplay
    }
  }
}

type Style = string | Record<string, string | string[]> | null
```

这段代码处理了三种场景：对象形式的样式 diff、字符串形式的直接替换、以及清空样式。特别值得注意的是 v-show 的处理——即使样式被替换，v-show 设置的 display 也需要保留。

## setStyle 函数

setStyle 处理单个样式属性的设置：

```typescript
function setStyle(
  style: CSSStyleDeclaration,
  name: string,
  val: string | string[]
) {
  if (isArray(val)) {
    // 数组值用于浏览器前缀回退
    val.forEach(v => setStyle(style, name, v))
  } else {
    if (val == null) val = ''
    
    if (name.startsWith('--')) {
      // CSS 自定义属性
      style.setProperty(name, val)
    } else {
      const prefixed = autoPrefix(style, name)
      
      if (importantRE.test(val)) {
        // 处理 !important
        style.setProperty(
          hyphenate(prefixed),
          val.replace(importantRE, ''),
          'important'
        )
      } else {
        style[prefixed as any] = val
      }
    }
  }
}

const importantRE = /\s*!important$/
```

这个函数处理了多个边界情况。数组值用于提供多个回退值（如不同浏览器前缀的版本）。CSS 自定义属性（以 -- 开头）必须用 setProperty。带 !important 的值需要特殊处理。

## 自动前缀

autoPrefix 为需要前缀的 CSS 属性添加浏览器前缀：

```typescript
const prefixes = ['Webkit', 'Moz', 'ms']
const prefixCache: Record<string, string> = {}

function autoPrefix(style: CSSStyleDeclaration, rawName: string): string {
  const cached = prefixCache[rawName]
  if (cached) {
    return cached
  }
  
  let name = camelize(rawName)
  
  if (name !== 'filter' && name in style) {
    return (prefixCache[rawName] = name)
  }
  
  // 首字母大写
  name = capitalize(name)
  
  for (let i = 0; i < prefixes.length; i++) {
    const prefixed = prefixes[i] + name
    if (prefixed in style) {
      return (prefixCache[rawName] = prefixed)
    }
  }
  
  return rawName
}
```

这个函数检测浏览器支持的属性名并缓存结果。比如 transform 在老浏览器中可能需要 webkitTransform。结果被缓存以避免重复检测。

## 对象形式的 diff

当使用对象形式的 style 绑定时，Vue 执行精细的 diff：

```typescript
// 新样式中的属性
for (const key in next) {
  setStyle(style, key, next[key])
}

// 旧样式中被移除的属性
if (prev && !isString(prev)) {
  for (const key in prev) {
    if (next[key] == null) {
      setStyle(style, key, '')
    }
  }
}
```

第一个循环设置所有新样式，第二个循环清除不再存在的样式。这种方式只触发变化的属性，比重写整个 cssText 更高效。

## 字符串形式处理

当 style 绑定是字符串时，直接设置 cssText：

```typescript
if (isCssString) {
  if (prev !== next) {
    style.cssText = next
  }
}
```

只有当值变化时才更新，避免不必要的样式重计算。

## v-show 兼容

v-show 指令通过 display 属性控制元素可见性，它在元素上设置 `_vod` 标记：

```typescript
const currentDisplay = style.display

// ... 样式更新 ...

if ('_vod' in el) {
  style.display = currentDisplay
}
```

这确保了用户的 style 绑定不会覆盖 v-show 的效果。无论样式如何变化，display 的值由 v-show 控制。

## 值的规范化

传入 patchStyle 之前，值已经被规范化：

```typescript
function normalizeStyle(value: unknown): Record<string, string> | string | undefined {
  if (isArray(value)) {
    const res: Record<string, string> = {}
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const normalized = isString(item)
        ? parseStringStyle(item)
        : normalizeStyle(item)
      if (normalized) {
        for (const key in normalized) {
          res[key] = normalized[key]
        }
      }
    }
    return res
  } else if (isString(value)) {
    return value
  } else if (isObject(value)) {
    return value
  }
}

function parseStringStyle(cssText: string): Record<string, string> {
  const ret: Record<string, string> = {}
  cssText.split(';').forEach(item => {
    const [key, val] = item.split(':')
    if (key && val) {
      ret[key.trim()] = val.trim()
    }
  })
  return ret
}
```

支持的绑定形式：

```html
<!-- 对象 -->
<div :style="{ color: 'red', fontSize: '14px' }">

<!-- 数组（合并） -->
<div :style="[baseStyles, overrideStyles]">

<!-- 字符串 -->
<div :style="'color: red; font-size: 14px'">
```

## 数组值的用途

样式值可以是数组，用于提供回退值：

```html
<div :style="{ display: ['-webkit-flex', 'flex'] }">
```

setStyle 会依次尝试设置每个值，浏览器会接受它支持的最后一个有效值。这对于需要浏览器前缀的值特别有用。

## 性能考量

patchStyle 的 diff 策略在性能上很有优势：

```typescript
// 只更新变化的属性
{ color: 'red', fontSize: '14px' }
  → { color: 'blue', fontSize: '14px' }

// 只触发 color 的更新，fontSize 不变
```

相比之下，直接设置 cssText 会导致所有属性重新解析。对于复杂的样式对象，diff 策略显著减少了浏览器的样式计算工作。

## 与 Transition 的关系

与 class 类似，Transition 可能会修改某些样式：

```typescript
// Transition 设置的样式直接通过 style 对象
el.style.transition = '...'
el.style.transform = '...'
```

这些样式与用户绑定的样式共存，因为 Vue 操作的是 style 对象的各个属性，而非替换整个 cssText。

## 小结

patchStyle 实现了精细的样式 diff 更新。对于对象形式的样式，只更新变化的属性；对于字符串形式，在值变化时整体替换。autoPrefix 处理浏览器兼容性，setStyle 处理各种特殊情况（数组值、自定义属性、!important）。v-show 兼容确保了指令功能不受影响。这套机制让 Vue 能够高效处理各种复杂的样式绑定场景。
