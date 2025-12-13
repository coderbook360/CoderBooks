# 玩转预设：`preset-wind` 与其他预设

如果把 UnoCSS 引擎比作一辆没有装配任何零件的汽车底盘，那么预设（Preset）就是发动机、轮胎、方向盘这些核心部件的套装。你可以选择"运动套装"获得强劲动力，也可以选择"舒适套装"获得平稳驾驶体验，甚至可以自己组装一套专属配置。

预设是 UnoCSS 的能力组织单元。通过选择和组合不同的预设，你可以快速构建出符合项目需求的样式系统。**不同预设解决不同问题**，本章将帮你理解各个预设的定位、差异和适用场景，让你在实际项目中做出合理选择。

---

## 1. 预设的设计哲学

在深入具体预设之前，先理解 UnoCSS 预设的设计哲学。

### 1.1 无主见的引擎

UnoCSS 核心是一个"无主见"的引擎。它不预设任何样式规范，也不强制任何设计语言，而是只提供规则匹配和 CSS 生成的基础能力。

**所有"主见"都来自预设。** 预设决定了支持哪些类名、类名如何映射为 CSS，以及使用什么样的设计 token。

这意味着什么？**UnoCSS 本身是中立的，你通过选择预设来决定它的"性格"。**

### 1.2 可组合性

现在要问第二个问题：**我能同时使用多个预设吗？**

答案是：当然可以。

```ts
presets: [
  presetUno(),        // 基础工具类
  presetAttributify(), // 属性化模式
  presetIcons(),       // 图标支持
]
```

每个预设负责一个特定领域，你可以像搭积木一样按需组合。

### 1.3 可替换性

预设也是可替换的。如果你不喜欢 `preset-uno` 的类名风格，可以换成 `preset-wind`；如果想要更精简的默认配置，可以使用 `preset-mini`；如果想要完全自定义，则可以从零编写自己的预设。

**这种灵活性是 UnoCSS 区别于其他原子化框架的关键特征。**

---

## 2. 核心预设概览

UnoCSS 官方维护了多个预设，它们的关系如下：

```
preset-mini（最小核心）
    ↓ 继承
preset-wind（Tailwind 兼容）
    ↓ 继承
preset-uno（默认推荐）
```

思考一下这个继承关系意味着什么：**preset-uno 包含了 preset-wind 的所有能力，preset-wind 又包含了 preset-mini 的所有能力。**

### 2.1 `@unocss/preset-mini`

**定位**：最小核心预设，提供基础的原子类支持。

`preset-mini` 包含最核心的工具类，如 display、position、sizing、spacing、colors 等，但不包含复杂的组件类或高级特性。它的体积最小、依赖最少，非常适合追求极致精简的项目，也可以作为自定义预设的基础，或者供需要完全控制类名设计的团队使用。

**安装与使用**：

```bash
npm install -D @unocss/preset-mini
```

```ts
import presetMini from '@unocss/preset-mini'

export default defineConfig({
  presets: [presetMini()],
})
```

### 2.2 `@unocss/preset-wind`

**定位**：Tailwind CSS 兼容预设。

在 `preset-mini` 的基础上，`preset-wind` 增加了 Tailwind CSS 风格的类名命名、完整的颜色、间距、字号 scale，以及 Tailwind 的变体语法。

这个预设特别适合从 Tailwind 迁移到 UnoCSS 的项目，也适合团队已熟悉 Tailwind 类名体系或希望使用 Tailwind 文档作为参考的场景。

### 2.3 `@unocss/preset-uno`

**定位**：默认推荐预设，UnoCSS 的"开箱即用"选择。

在 `preset-wind` 的基础上，`preset-uno` 增加了一些 UnoCSS 特有的便利功能，同时兼容 Tailwind 和 Windi CSS 的类名。

这是新项目的默认选择，适合希望获得最全面内置支持的开发者。如果你不确定选哪个预设，这是最安全的选择。

**为什么推荐**：`preset-uno` 功能最全，文档和社区资源最丰富，大多数情况下它就是你需要的。

---

## 3. `preset-wind` 深度解析

由于 Tailwind CSS 的流行，`preset-wind` 是许多团队的首选。让我们深入了解它的特点。

### 3.1 类名兼容性

现在要问一个问题：**如果我之前用 Tailwind，迁移到 UnoCSS 要改很多代码吗？**

答案是：**几乎不用改。**

`preset-wind` 的类名设计目标是与 Tailwind CSS 保持一致。Spacing 方面支持 `p-4`、`m-2`、`gap-4`，Colors 方面支持 `text-red-500`、`bg-blue-600`，Typography 方面支持 `text-lg`、`font-bold`、`leading-relaxed`，Flexbox 方面支持 `flex`、`justify-center`、`items-start`，Grid 方面支持 `grid`、`grid-cols-3`、`col-span-2`。

如果你熟悉 Tailwind，使用 `preset-wind` 几乎没有学习成本。

### 3.2 主题配置

`preset-wind` 内置了与 Tailwind 类似的默认主题。在颜色方面，它提供完整的颜色体系，包括 gray、red、blue 等，每种都有 50-950 的色阶。在间距方面，它基于 0.25rem 的 spacing scale，从 0、1、2 一直到 96。在断点方面，它定义了 sm（640px）、md（768px）、lg（1024px）、xl（1280px）、2xl（1536px）。在字号方面，它提供了 xs、sm、base、lg、xl、2xl 等选项。

**你可以覆盖或扩展这些默认值**：

```ts
export default defineConfig({
  presets: [presetWind()],
  theme: {
    colors: {
      brand: {
        light: '#60a5fa',
        DEFAULT: '#3b82f6',
        dark: '#2563eb',
      },
    },
    breakpoints: {
      tablet: '640px',
      laptop: '1024px',
      desktop: '1280px',
    },
  },
})
```

### 3.3 变体支持

`preset-wind` 支持 Tailwind 的变体语法。在伪类变体方面，它支持 `hover:`、`focus:`、`active:`、`disabled:`，以及 `first:`、`last:`、`odd:`、`even:`，还有 `focus-within:`、`focus-visible:` 等。在响应式变体方面，它支持 `sm:`、`md:`、`lg:`、`xl:`、`2xl:`。在暗色模式方面，它支持 `dark:` 前缀。在组变体方面，它支持 `group-hover:`，但需要父元素有 `group` 类。

这些变体可以自由组合：

```html
<button class="md:hover:bg-blue-600 dark:md:hover:bg-blue-400">
  按钮
</button>
```

### 3.4 与 Tailwind 的差异

尽管高度兼容，`preset-wind` 与 Tailwind 仍有一些差异。

在生成机制方面，Tailwind 基于 PostCSS，扫描源码后生成 CSS，而 UnoCSS 则是即时按需生成，性能更优。在类名覆盖方面，Tailwind 的一些边缘类名可能在 `preset-wind` 中未实现，但通常可以通过自定义规则补充。在配置语法方面，UnoCSS 使用 `uno.config.ts` 而非 `tailwind.config.js`，主题配置结构类似但不完全相同。

如果你要从 Tailwind 迁移，建议的做法是先使用 `preset-wind` 启动项目，然后逐步验证现有类名是否正常工作，最后对于缺失的类名通过自定义规则补充。

---

## 4. 功能性预设

除了核心预设，UnoCSS 还提供了一些功能性预设，用于扩展特定能力。

### 4.1 `@unocss/preset-attributify`

**功能**：启用属性化模式，将类名写为 HTML 属性。

```html
<!-- 传统类名 -->
<div class="text-red-500 bg-blue-200 p-4">

<!-- 属性化模式 -->
<div text="red-500" bg="blue-200" p="4">
```

这个预设适合偏好更简洁模板写法的开发者，也适合希望按功能分组样式属性的场景，或者当类名太长影响阅读时使用。

不过它也有代价：可能与某些 HTML 属性冲突，IDE 支持不如传统类名完善，而且团队需要适应新的写法。

详见后续章节"属性化模式与变体组"。

### 4.2 `@unocss/preset-icons`

**功能**：通过类名使用图标，支持海量图标集。

```html
<div class="i-carbon-sun text-2xl" />
<div class="i-mdi-account text-blue-500" />
```

这个预设支持 Iconify 收录的 100+ 图标集，图标作为纯 CSS 背景实现，无需 JS，并且支持按需加载，只打包使用到的图标。

**这解决了什么问题？** 传统方式使用图标要么引入整个图标库（体积大），要么逐个导入（繁琐）。`preset-icons` 让你像使用工具类一样使用图标，还能按需打包。

详见后续章节"图标系统"。

### 4.3 `@unocss/preset-typography`

**功能**：为富文本内容提供排版样式。

```html
<article class="prose">
  <h1>标题</h1>
  <p>段落内容...</p>
</article>
```

这个预设特别适合博客和文档站点，也适合处理 CMS 生成的富文本内容，以及任何需要排版长文本的场景。

### 4.4 `@unocss/preset-web-fonts`

**功能**：便捷引入 Web 字体。

```ts
presetWebFonts({
  fonts: {
    sans: 'Inter',
    mono: ['Fira Code', 'Fira Mono:400,700'],
  },
})
```

这个预设支持 Google Fonts、Bunny Fonts 等来源，能够自动生成 `@font-face` 声明，并与主题的 `fontFamily` 配置联动。

---

## 5. 预设组合策略

现在要问一个实际问题：**我的项目应该用哪些预设的组合？**

### 5.1 典型组合示例

**通用 Web 应用**：

```ts
presets: [
  presetUno(),
  presetAttributify(),
  presetIcons({ scale: 1.2 }),
]
```

这个组合提供：完整的工具类 + 属性化写法 + 图标支持。

**Tailwind 迁移项目**：

```ts
presets: [
  presetWind(),
  presetIcons(),
]
```

保持 Tailwind 兼容性，同时获得 UnoCSS 的性能优势。

**极简项目**：

```ts
presets: [
  presetMini(),
]
```

只要最核心的能力，其他自己按需添加。

**文档/博客站点**：

```ts
presets: [
  presetUno(),
  presetTypography(),
  presetWebFonts({
    fonts: { sans: 'Inter' },
  }),
]
```

适合需要良好排版的内容站点。

### 5.2 预设顺序

预设数组的顺序会影响合并行为。后面预设的规则会追加到前面预设的规则列表末尾，主题配置则会深度合并，后者覆盖前者的同名字段。

建议的预设顺序是：首先放置核心预设（如 `preset-uno` 或 `preset-wind`），然后是功能预设（如 `preset-attributify`、`preset-icons` 等），最后是自定义预设（项目级规则）。

### 5.3 预设配置

大多数预设支持配置选项：

```ts
presetUno({
  dark: 'class',  // 暗色模式策略：'class' 或 'media'
})

presetIcons({
  scale: 1.2,  // 图标缩放
  cdn: 'https://esm.sh/',  // 图标 CDN
})
```

具体配置项请参考各预设的官方文档。

---

## 6. 选择预设的决策框架

面对多个预设选项，如何选择？以下是一个决策框架。

### 6.1 考虑团队背景

如果你的团队熟悉 Tailwind，那么 `preset-wind` 或 `preset-uno` 是最佳选择，因为几乎零学习成本，可以复用 Tailwind 的知识和文档。如果你的团队熟悉 Windi CSS，`preset-uno` 是更好的选择，因为它兼容 Windi 的类名，可以实现平滑迁移。如果是完全新手，也推荐使用 `preset-uno`，因为它的文档最全面，社区资源最丰富。

### 6.2 考虑项目需求

如果你需要最小体积，`preset-mini` 是最佳选择，因为它只包含最核心的功能，其他能力可以按需添加。如果你需要完整功能，`preset-uno` 是最佳选择，因为它开箱即用，大多数需求都能满足。如果你需要严格的 Tailwind 兼容性，`preset-wind` 是最佳选择，它适合迁移项目，也适合有 Tailwind 经验的团队。

### 6.3 考虑扩展性

如果你的项目可能需要大量定制，建议从 `preset-mini` 开始，这样可以完全控制类名设计，然后逐步添加需要的规则。如果你希望开箱即用，建议使用 `preset-uno` 加上功能预设，这样可以快速启动，后续按需覆盖。

### 6.4 迁移成本

从 Tailwind 迁移推荐使用 `preset-wind`，从 Windi CSS 迁移推荐使用 `preset-uno`，而全新项目可以根据团队偏好自由选择。

---

## 7. 小结

本章我们学习了 UnoCSS 的预设体系。

在核心预设方面，`preset-mini` 是最小核心，适合追求精简或完全自定义的场景；`preset-wind` 提供 Tailwind 兼容，适合 Tailwind 用户迁移；`preset-uno` 是默认推荐，功能最全面。

在功能预设方面，`preset-attributify` 提供属性化模式，`preset-icons` 提供图标支持，`preset-typography` 提供富文本排版，`preset-web-fonts` 提供 Web 字体引入能力。

在组合策略方面，你应该根据项目需求和团队背景选择预设组合，同时注意预设顺序会影响合并行为，并通过配置选项调整预设行为。

**预设的灵活组合是 UnoCSS 的核心优势之一。** 理解预设体系，你就掌握了按需构建样式系统的能力。

下一章，我们将深入变体系统，学习响应式、伪类、逻辑组合等变体的高级用法。
