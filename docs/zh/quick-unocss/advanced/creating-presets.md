# 终极玩法：创建你自己的预设

你已经掌握了 UnoCSS 的核心工具类、快捷方式、主题化以及各种高级配置。现在，是时候进入 UnoCSS 的终极领域了：创建属于你自己的预设（Preset）。

预设是 UnoCSS 可组合性的极致体现。它允许你将一套完整的设计规范——包括自定义的工具类规则、快捷方式、变体、颜色主题、字体等——打包成一个独立的、可复用的模块。这对于维护设计系统、在多个项目中共享统一 UI 规范、或者为特定框架提供深度集成来说，是无价的。

## 1. 为什么需要创建预设？

想象一下，你的团队为公司的产品线维护着一套严格的设计系统。这套系统包含：

- 一套品牌颜色（`brand-primary`, `brand-secondary` 等）。
- 特定的字体和间距规范。
- 一系列常用的组件样式，如按钮、卡片、表单等（通过 `shortcuts` 实现）。
- 一些特殊的、非标准的 CSS 规则（通过 `rules` 实现）。

如果没有预设，每当开启一个新项目时，你都必须将一个庞大的 `uno.config.ts` 文件复制过去，并确保它与所有其他项目保持同步。一旦设计系统更新，你将不得不在每个项目中手动更新配置。这显然是低效且容易出错的。

**预设就是解决方案**。你可以将所有这些配置封装到一个独立的 npm 包中，例如 `@my-company/unocss-preset`。在任何项目中，你只需要安装并引入这个预舍，即可获得整套设计系统。

```typescript
// uno.config.ts in a new project
import { defineConfig } from 'unocss'
import presetMyCompany from '@my-company/unocss-preset'

export default defineConfig({
  presets: [
    presetMyCompany(), // 一行代码，引入整个设计系统
  ],
})
```

## 2. 预设的结构

一个 UnoCSS 预设本质上是一个返回 `Preset` 对象的函数。这个对象描述了预设包含的所有内容。

一个典型的预设结构如下：

```typescript
import type { Preset } from 'unocss'

export function presetMyCompany(): Preset {
  return {
    name: '@my-company/unocss-preset', // 预设的名称
    theme: { /* ... */ },       // 主题配置
    rules: [ /* ... */ ],       // 自定义规则
    shortcuts: { /* ... */ }, // 快捷方式
    variants: [ /* ... */ ],   // 自定义变体
    // ... 还有更多高级选项
  }
}
```

接下来，我们将一步步填充这个结构，创建一个实用的预设。

## 3. 实战：创建一个简单的设计系统预设

假设我们要创建一个名为 `preset-acme` 的预设，它包含 Acme 公司的基础设计规范。

### 步骤 1：初始化项目

首先，创建一个新的文件夹 `unocss-preset-acme`，并初始化一个 npm 项目。

### 步骤 2：定义 `theme`

我们将公司的品牌色和字体放入 `theme` 对象。

```typescript
// src/theme.ts
import type { Theme } from 'unocss/preset-uno'

export const theme: Theme = {
  colors: {
    acme: {
      primary: '#6366F1',
      secondary: '#EC4899',
    },
  },
  fontFamily: {
    acme: ['AcmeFont', 'sans-serif'],
  },
}
```

### 步骤 3：定义 `rules`

我们来添加一个自定义规则，用于创建文本描边效果，例如 `text-stroke-2`。

```typescript
// src/rules.ts
import type { Rule } from 'unocss'

export const rules: Rule[] = [
  [/^text-stroke-(\d+)$/, ([, d]) => ({ '-webkit-text-stroke-width': `${parseInt(d, 10) / 10}rem` })],
  [/^text-stroke-color-(.+)$/, ([, c], { theme }) => {
    const color = theme.colors[c] || c;
    return { '-webkit-text-stroke-color': color };
  }],
]
```

### 步骤 4：定义 `shortcuts`

我们将常用的按钮样式定义为快捷方式。

```typescript
// src/shortcuts.ts
import type { UserShortcuts } from 'unocss'

export const shortcuts: UserShortcuts = {
  'btn-acme': 'px-4 py-2 rounded-lg bg-acme-primary text-white font-acme hover:bg-acme-secondary',
}
```

### 步骤 5：组合成预设

最后，我们在主文件 `src/index.ts` 中将所有部分组合起来，并导出一个标准的预设函数。

```typescript
// src/index.ts
import type { Preset } from 'unocss'
import { theme } from './theme'
import { rules } from './rules'
import { shortcuts } from './shortcuts'

export function presetAcme(): Preset {
  return {
    name: 'unocss-preset-acme',
    theme,
    rules,
    shortcuts,
  }
}

export default presetAcme
```

至此，一个功能完备的 UnoCSS 预设就创建好了！

## 4. 在项目中使用你的预设

要在项目中使用这个本地预设，你可以通过文件路径直接在 `uno.config.ts` 中引入它。

```typescript
// uno.config.ts
import { defineConfig, presetUno } from 'unocss'
import { presetAcme } from './path/to/your/unocss-preset-acme/src' // 直接引入

export default defineConfig({
  presets: [
    presetUno(), // 最好保留一个基础预设
    presetAcme(), // 引入你的自定义预设
  ],
})
```

现在，你可以在你的 HTML 中使用预设提供的所有功能了：

```html
<!-- 使用预设的 shortcut -->
<button class="btn-acme">Acme Button</button>

<!-- 使用预设的 theme 和 rule -->
<h1 class="font-acme text-stroke-2 text-stroke-color-acme-primary">
  Hello Acme!
</h1>
```

## 总结

创建预设是 UnoCSS 生态系统的基石。它将配置提升到了一个新的抽象层次，实现了真正的“一次定义，处处使用”。通过创建自己的预设，你不仅是在编写配置，更是在构建一个可移植、可维护、可共享的设计系统。

当你发现自己在多个项目中重复着相似的 UnoCSS 配置时，就是时候动手创建属于你自己的预设了。这是通往 UnoCSS 专家之路的最后，也是最重要的一步。
