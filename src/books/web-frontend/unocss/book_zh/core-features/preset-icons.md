# 图标系统：开箱即用的图标方案

图标是现代界面不可或缺的元素。传统的图标解决方案要么需要引入图标字体，要么需要手动管理 SVG 文件，都有各自的痛点。

UnoCSS 的图标预设（preset-icons）提供了一种全新的图标使用方式：直接通过类名引用图标，按需生成，支持海量图标库。这可能是你用过的最便捷的图标方案。

本章将深入讲解这个强大的图标系统，从基础配置到高级定制。

---

## 1. 图标预设简介

`preset-icons` 是 UnoCSS 的官方图标预设，它基于 Iconify 生态，可以访问超过 100 个图标库、100,000+ 个图标。

### 1.1 工作原理

当你在代码中使用图标类名如 `i-mdi-home` 时，UnoCSS 会从 Iconify 图标集中获取对应的 SVG 数据，然后将其转换为 CSS。最终图标以纯 CSS 的方式渲染，不需要任何图标字体或外部 SVG 文件。

这种方式的优势非常明显。首先是按需加载，只有用到的图标才会被打包。其次是统一的 API，所有图标库都用相同的方式使用。第三是纯 CSS 渲染，可以像普通元素一样控制颜色和大小。最后是构建时处理，不会增加运行时开销。

### 1.2 基础配置

首先安装预设和你需要的图标集：

```bash
npm install -D @unocss/preset-icons @iconify-json/mdi
```

然后在配置中启用：

```ts
import { defineConfig, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
})
```

---

## 2. 使用图标

启用预设后，就可以通过类名使用图标了。

### 2.1 基础语法

图标类名的格式是 `i-{collection}-{name}`，其中 `collection` 是图标集名称，`name` 是图标名称：

```html
<span class="i-mdi-home"></span>
<span class="i-ph-heart-fill"></span>
<span class="i-carbon-document"></span>
```

### 2.2 常用图标集

Iconify 包含众多图标集，每个都有不同的设计风格。Material Design Icons（mdi）是谷歌的 Material 设计图标，包含 7000+ 图标，适合 Material 风格的应用。Phosphor Icons（ph）是一套灵活的图标库，支持多种粗细变体。Carbon Icons（carbon）来自 IBM 的设计系统，简洁专业。Heroicons（heroicons）由 Tailwind 团队设计，有 outline 和 solid 两种风格。Lucide（lucide）是 Feather Icons 的社区分支，持续更新。Tabler Icons（tabler）是一套清晰一致的线性图标。

### 2.3 查找图标

Iconify 提供了一个在线图标搜索工具 icones.js.org，你可以在这里浏览和搜索所有可用的图标。找到想要的图标后，复制其名称，按照 `i-{collection}-{name}` 格式使用即可。

---

## 3. 控制图标样式

图标以纯 CSS 方式渲染，因此可以用常规的工具类控制其样式。

### 3.1 大小控制

图标默认继承 `font-size`，可以用 `text-*` 类控制大小：

```html
<span class="i-mdi-home text-sm"></span>
<span class="i-mdi-home text-base"></span>
<span class="i-mdi-home text-xl"></span>
<span class="i-mdi-home text-4xl"></span>
```

也可以用 `w-*` 和 `h-*` 精确控制尺寸：

```html
<span class="i-mdi-home w-6 h-6"></span>
<span class="i-mdi-home w-8 h-8"></span>
```

### 3.2 颜色控制

默认情况下，图标使用 `currentColor`，即继承当前文本颜色。这意味着你可以用 `text-*` 类改变图标颜色：

```html
<span class="i-mdi-home text-blue-500"></span>
<span class="i-mdi-home text-red-500"></span>
<span class="i-mdi-home text-gray-400"></span>
```

在不同状态下改变颜色：

```html
<button class="text-gray-600 hover:text-blue-600">
  <span class="i-mdi-settings"></span>
  设置
</button>
```

### 3.3 旋转和翻转

可以使用变换类旋转或翻转图标：

```html
<span class="i-mdi-arrow-right rotate-90"></span>
<span class="i-mdi-arrow-right rotate-180"></span>
<span class="i-mdi-arrow-right scale-x-[-1]"></span>
```

### 3.4 动画效果

图标可以配合动画类使用：

```html
<span class="i-mdi-loading animate-spin"></span>
<span class="i-mdi-bell animate-bounce"></span>
```

---

## 4. 图标集安装

默认情况下，图标数据需要从 npm 包中获取，因此需要安装对应的图标集。

### 4.1 按需安装

只安装你需要的图标集：

```bash
# Material Design Icons
npm install -D @iconify-json/mdi

# Phosphor Icons
npm install -D @iconify-json/ph

# Carbon Icons
npm install -D @iconify-json/carbon

# Heroicons
npm install -D @iconify-json/heroicons

# Lucide Icons
npm install -D @iconify-json/lucide
```

### 4.2 自动安装

可以配置 `autoInstall` 让 UnoCSS 自动安装缺失的图标集：

```ts
presetIcons({
  autoInstall: true,
})
```

启用后，当你使用一个新图标集的图标时，UnoCSS 会自动安装对应的包。这在开发阶段很方便，但生产环境建议显式安装依赖。

### 4.3 CDN 模式

如果不想安装 npm 包，可以配置从 CDN 获取图标：

```ts
import { defineConfig, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetIcons({
      cdn: 'https://esm.sh/',
    }),
  ],
})
```

CDN 模式在开发时可能有网络延迟，但不需要安装任何图标包。

---

## 5. 自定义图标

除了使用图标库中的图标，你还可以添加自定义图标。

### 5.1 内联 SVG

通过 `collections` 选项定义自定义图标集：

```ts
presetIcons({
  collections: {
    custom: {
      logo: '<svg viewBox="0 0 24 24">...</svg>',
      'arrow-left': '<svg>...</svg>',
    },
  },
})
```

使用：

```html
<span class="i-custom-logo"></span>
<span class="i-custom-arrow-left"></span>
```

### 5.2 从文件加载

可以从文件系统加载 SVG 图标：

```ts
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders'

presetIcons({
  collections: {
    custom: FileSystemIconLoader('./assets/icons'),
  },
})
```

这会扫描 `./assets/icons` 目录下的 SVG 文件。文件名会成为图标名，如 `home.svg` 对应 `i-custom-home`。

### 5.3 异步加载

图标数据也可以异步加载：

```ts
presetIcons({
  collections: {
    custom: async (name) => {
      const response = await fetch(`https://example.com/icons/${name}.svg`)
      return await response.text()
    },
  },
})
```

---

## 6. 高级配置

`presetIcons` 提供了丰富的配置选项。

### 6.1 缩放比例

`scale` 选项控制图标相对于 `1em` 的缩放比例：

```ts
presetIcons({
  scale: 1.2,  // 图标会比字体大 20%
})
```

### 6.2 默认模式

图标可以以两种模式渲染：`mask` 模式使用 CSS mask，支持 `currentColor`，是默认模式。`background` 模式使用背景图，保留原始颜色。

```ts
presetIcons({
  mode: 'auto',  // 自动选择（默认）
  // mode: 'mask',  // 强制使用 mask 模式
  // mode: 'background',  // 强制使用 background 模式
})
```

### 6.3 图标前缀

默认前缀是 `i-`，可以修改或添加额外前缀：

```ts
presetIcons({
  prefix: 'icon-',  // 使用 icon-mdi-home 格式
  // prefix: ['i-', 'icon-'],  // 支持多个前缀
})
```

### 6.4 额外 CSS 属性

可以为所有图标添加默认 CSS 属性：

```ts
presetIcons({
  extraProperties: {
    'display': 'inline-block',
    'vertical-align': 'middle',
  },
})
```

### 6.5 自定义图标处理

`customizations` 选项允许对图标进行自定义处理：

```ts
presetIcons({
  customizations: {
    // 为所有图标添加属性
    customize(props) {
      props.width = '1em'
      props.height = '1em'
      return props
    },
    // 修改特定图标集
    iconCustomizer(collection, icon, props) {
      if (collection === 'mdi') {
        props['stroke-width'] = '2'
      }
    },
  },
})
```

---

## 7. 实战应用

让我们看看图标在实际场景中的应用。

### 7.1 导航菜单

```html
<nav class="flex gap-6">
  <a href="#" class="flex items-center gap-2 text-gray-600 hover:text-blue-600">
    <span class="i-mdi-home text-lg"></span>
    首页
  </a>
  <a href="#" class="flex items-center gap-2 text-gray-600 hover:text-blue-600">
    <span class="i-mdi-magnify text-lg"></span>
    搜索
  </a>
  <a href="#" class="flex items-center gap-2 text-gray-600 hover:text-blue-600">
    <span class="i-mdi-cog text-lg"></span>
    设置
  </a>
</nav>
```

### 7.2 按钮图标

```html
<button class="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
  <span class="i-mdi-plus"></span>
  新建
</button>

<button class="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
  <span class="i-mdi-download"></span>
  下载
</button>

<button class="p-2 rounded-full hover:bg-gray-100" title="更多">
  <span class="i-mdi-dots-vertical text-xl"></span>
</button>
```

### 7.3 状态指示

```html
<div class="flex items-center gap-2 text-green-600">
  <span class="i-mdi-check-circle"></span>
  操作成功
</div>

<div class="flex items-center gap-2 text-red-600">
  <span class="i-mdi-alert-circle"></span>
  发生错误
</div>

<div class="flex items-center gap-2 text-yellow-600">
  <span class="i-mdi-alert"></span>
  警告信息
</div>

<div class="flex items-center gap-2 text-blue-600">
  <span class="i-mdi-information"></span>
  提示信息
</div>
```

### 7.4 加载状态

```html
<button class="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg" disabled>
  <span class="i-mdi-loading animate-spin"></span>
  加载中...
</button>

<div class="flex items-center justify-center h-40">
  <span class="i-mdi-loading animate-spin text-4xl text-blue-500"></span>
</div>
```

### 7.5 表单元素

```html
<div class="relative">
  <span class="i-mdi-magnify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></span>
  <input 
    class="pl-10 pr-4 py-2 border rounded-lg w-full"
    placeholder="搜索..."
  />
</div>

<div class="relative">
  <span class="i-mdi-email absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></span>
  <input 
    class="pl-10 pr-4 py-2 border rounded-lg w-full"
    type="email"
    placeholder="输入邮箱"
  />
</div>
```

### 7.6 社交图标

```html
<div class="flex gap-4">
  <a href="#" class="text-gray-400 hover:text-[#1DA1F2]">
    <span class="i-mdi-twitter text-2xl"></span>
  </a>
  <a href="#" class="text-gray-400 hover:text-[#333]">
    <span class="i-mdi-github text-2xl"></span>
  </a>
  <a href="#" class="text-gray-400 hover:text-[#0A66C2]">
    <span class="i-mdi-linkedin text-2xl"></span>
  </a>
</div>
```

---

## 8. 图标与快捷方式

可以将常用的图标样式封装为快捷方式。

### 8.1 图标按钮

```ts
shortcuts: {
  'icon-btn': 'p-2 rounded-full hover:bg-gray-100 transition-colors',
  'icon-btn-primary': 'icon-btn text-blue-500 hover:bg-blue-50',
  'icon-btn-danger': 'icon-btn text-red-500 hover:bg-red-50',
}
```

使用：

```html
<button class="icon-btn">
  <span class="i-mdi-heart text-xl"></span>
</button>

<button class="icon-btn-danger">
  <span class="i-mdi-delete text-xl"></span>
</button>
```

### 8.2 图标文本组合

```ts
shortcuts: {
  'icon-text': 'inline-flex items-center gap-2',
}
```

使用：

```html
<span class="icon-text">
  <span class="i-mdi-clock"></span>
  5 分钟前
</span>
```

---

## 9. 性能考虑

图标预设在设计时充分考虑了性能。

### 9.1 按需生成

只有实际使用的图标才会被处理和打包。这意味着即使安装了包含数千图标的图标集，最终打包体积只与你实际使用的图标数量相关。

### 9.2 CSS 大小

每个图标大约会增加几百字节的 CSS。对于大多数项目来说，即使使用几十个图标，总体积也在可接受范围内。如果图标数量特别多，可以考虑压缩和 CDN 缓存。

### 9.3 渲染性能

图标以纯 CSS 渲染，不涉及 JavaScript，渲染性能很好。相比图标字体，CSS 图标在小尺寸时更清晰，也不会出现 FOIT（Flash of Invisible Text）问题。

---

## 10. 小结

本章深入讲解了 UnoCSS 的图标系统。

图标预设基于 Iconify 生态，可以访问 100+ 图标库、100,000+ 图标。通过 `i-{collection}-{name}` 格式的类名使用图标，按需生成，不会增加无用的体积。

图标样式可以通过常规工具类控制。`text-*` 类控制大小和颜色，变换类实现旋转翻转，动画类添加动效。图标以纯 CSS 渲染，继承 `currentColor`，能很好地融入页面样式系统。

图标集需要通过 npm 安装，也可以配置自动安装或使用 CDN。自定义图标可以通过 `collections` 选项添加，支持内联 SVG、文件系统加载和异步获取。

高级配置包括缩放比例、渲染模式、图标前缀、额外属性和自定义处理函数，可以根据项目需求灵活调整。

图标在导航、按钮、状态指示、表单等场景广泛应用。配合快捷方式可以封装常用的图标样式组合，提高开发效率。

这个图标方案相比传统方式有显著优势：不需要管理字体文件，不需要手动引入 SVG，API 统一简洁，性能优秀。这可能是你体验过的最舒适的图标使用方式。

下一章我们将学习主题化定制，深入 `theme` 配置的各种可能性。
