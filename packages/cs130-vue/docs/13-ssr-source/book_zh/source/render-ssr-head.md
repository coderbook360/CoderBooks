# renderSSRHead 头部渲染

`renderSSRHead` 处理 HTML 头部（`<head>`）相关内容的 SSR 渲染，包括标题、meta 标签、link 标签等。这对 SEO 和社交分享至关重要。

## 头部管理的重要性

HTML 头部影响很多方面：

```html
<head>
  <!-- SEO -->
  <title>Page Title</title>
  <meta name="description" content="Page description">
  
  <!-- 社交分享 -->
  <meta property="og:title" content="Share Title">
  <meta property="og:image" content="https://example.com/image.jpg">
  
  <!-- 技术配置 -->
  <link rel="canonical" href="https://example.com/page">
  <script type="application/ld+json">{"@type": "Article"}</script>
</head>
```

在 SSR 中，这些标签需要在服务端渲染。

## useHead 组合式 API

Vue 生态中常用 `@vueuse/head` 或 `unhead` 来管理头部：

```javascript
import { useHead } from '@vueuse/head'

export default {
  setup() {
    useHead({
      title: 'My Page',
      meta: [
        { name: 'description', content: 'Page description' }
      ]
    })
  }
}
```

## SSR 头部收集

在 SSR 中，需要收集所有组件设置的头部信息：

```typescript
interface HeadTag {
  tag: string
  props: Record<string, string>
  children?: string
}

interface HeadState {
  title: string
  meta: HeadTag[]
  link: HeadTag[]
  script: HeadTag[]
  style: HeadTag[]
}
```

## 核心实现

```typescript
function renderSSRHead(head: HeadState): string {
  const tags: string[] = []
  
  // 渲染 title
  if (head.title) {
    tags.push(`<title>${escapeHtml(head.title)}</title>`)
  }
  
  // 渲染 meta 标签
  for (const meta of head.meta) {
    tags.push(renderTag('meta', meta.props))
  }
  
  // 渲染 link 标签
  for (const link of head.link) {
    tags.push(renderTag('link', link.props))
  }
  
  // 渲染 style 标签
  for (const style of head.style) {
    tags.push(renderTag('style', style.props, style.children))
  }
  
  // 渲染 script 标签
  for (const script of head.script) {
    tags.push(renderTag('script', script.props, script.children))
  }
  
  return tags.join('\n')
}

function renderTag(
  tag: string,
  props: Record<string, string>,
  children?: string
): string {
  const attrs = Object.entries(props)
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join('')
  
  if (children) {
    return `<${tag}${attrs}>${children}</${tag}>`
  }
  
  // 自闭合标签
  return `<${tag}${attrs}>`
}
```

## 去重和优先级

多个组件可能设置相同的标签：

```typescript
function mergeHead(heads: HeadState[]): HeadState {
  const merged: HeadState = {
    title: '',
    meta: [],
    link: [],
    script: [],
    style: []
  }
  
  const metaMap = new Map<string, HeadTag>()
  
  for (const head of heads) {
    // 后设置的 title 覆盖前面的
    if (head.title) {
      merged.title = head.title
    }
    
    // meta 按 key 去重
    for (const meta of head.meta) {
      const key = meta.props.name || meta.props.property || meta.props.charset
      if (key) {
        metaMap.set(key, meta)
      } else {
        merged.meta.push(meta)
      }
    }
    
    // link 和 script 累加
    merged.link.push(...head.link)
    merged.script.push(...head.script)
    merged.style.push(...head.style)
  }
  
  merged.meta = [...metaMap.values(), ...merged.meta]
  
  return merged
}
```

## 组件层级

深层组件可以覆盖浅层组件的设置：

```html
<!-- App.vue -->
<script setup>
useHead({ title: 'My App' })
</script>

<!-- pages/Product.vue -->
<script setup>
useHead({ title: 'Product Name - My App' })  // 覆盖
</script>
```

收集时按组件渲染顺序，后面的覆盖前面的。

## 动态 Head

在 SSR 中，head 可以是动态的：

```javascript
export default {
  async setup() {
    const product = await fetchProduct()
    
    useHead({
      title: product.name,
      meta: [
        { property: 'og:title', content: product.name },
        { property: 'og:image', content: product.image }
      ]
    })
  }
}
```

由于 SSR 会等待 async setup，动态数据可以正确渲染。

## 模板语法

一些库支持模板语法：

```javascript
useHead({
  title: 'My App',
  titleTemplate: '%s - My App'
})

// 子组件
useHead({
  title: 'Product Name'
})

// 最终: "Product Name - My App"
```

```typescript
function applyTitleTemplate(title: string, template: string): string {
  if (template.includes('%s')) {
    return template.replace('%s', title)
  }
  return title
}
```

## HTML 属性

有时需要设置 `<html>` 和 `<body>` 的属性：

```javascript
useHead({
  htmlAttrs: {
    lang: 'en',
    class: 'dark'
  },
  bodyAttrs: {
    class: 'antialiased'
  }
})
```

```typescript
function renderHTMLAttrs(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
    .join('')
}

// 使用
const html = `<html${renderHTMLAttrs(head.htmlAttrs)}>`
```

## 完整示例

```javascript
// server.js
import { renderToString } from 'vue/server-renderer'
import { createHead, renderHeadToString } from '@vueuse/head'

async function render(url) {
  const app = createSSRApp(App)
  const head = createHead()
  
  app.use(head)
  
  const ctx = {}
  const appHtml = await renderToString(app, ctx)
  
  // 渲染 head
  const headHtml = renderHeadToString(head)
  
  return `
    <!DOCTYPE html>
    <html${headHtml.htmlAttrs}>
    <head>
      ${headHtml.headTags}
    </head>
    <body${headHtml.bodyAttrs}>
      <div id="app">${appHtml}</div>
    </body>
    </html>
  `
}
```

## SEO 最佳实践

确保关键 SEO 标签正确渲染：

```typescript
function validateSEOTags(head: HeadState): string[] {
  const warnings: string[] = []
  
  if (!head.title) {
    warnings.push('Missing <title> tag')
  }
  
  const hasDescription = head.meta.some(
    m => m.props.name === 'description'
  )
  if (!hasDescription) {
    warnings.push('Missing meta description')
  }
  
  const hasCanonical = head.link.some(
    l => l.props.rel === 'canonical'
  )
  if (!hasCanonical) {
    warnings.push('Missing canonical link')
  }
  
  return warnings
}
```

## 社交分享标签

Open Graph 和 Twitter Card 标签：

```javascript
useHead({
  meta: [
    // Open Graph
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: 'Article Title' },
    { property: 'og:description', content: 'Description' },
    { property: 'og:image', content: 'https://example.com/image.jpg' },
    { property: 'og:url', content: 'https://example.com/article' },
    
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Article Title' },
    { name: 'twitter:description', content: 'Description' },
    { name: 'twitter:image', content: 'https://example.com/image.jpg' }
  ]
})
```

## 结构化数据

JSON-LD 结构化数据：

```javascript
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': 'Article Title',
        'author': {
          '@type': 'Person',
          'name': 'Author Name'
        }
      })
    }
  ]
})
```

## 安全考虑

Head 标签需要防止 XSS：

```typescript
function sanitizeHeadContent(head: HeadState): HeadState {
  return {
    ...head,
    title: escapeHtml(head.title),
    meta: head.meta.map(meta => ({
      ...meta,
      props: Object.fromEntries(
        Object.entries(meta.props).map(([k, v]) => [k, escapeHtml(v)])
      )
    }))
    // ... 其他标签
  }
}
```

## 小结

`renderSSRHead` 处理 HTML 头部的 SSR 渲染：

1. 收集组件设置的 head 信息
2. 合并和去重相同类型的标签
3. 渲染为 HTML 字符串
4. 支持 SEO、社交分享、结构化数据
5. 需要注意安全转义

头部管理是 SSR 应用的重要组成部分，正确的头部标签对 SEO 和用户体验都至关重要。
