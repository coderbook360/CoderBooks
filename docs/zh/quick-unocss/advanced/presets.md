# 封装与复用：创建自己的预设

欢迎来到“高级技巧与定制”的最后一章。至此，你已经掌握了 UnoCSS 的几乎所有配置项：`rules`, `shortcuts`, `variants`, `safelist`, `theme`... 当你的 `uno.config.ts` 文件变得越来越庞大，或者你希望在多个项目间共享同一套设计规范时，自然会产生一个问题：如何将这些配置封装并复用？

答案就是**自定义预设 (Custom Preset)**。预设是 UnoCSS 中最高级别的抽象，它允许你将一整套配置打包成一个独立的、可分享的模块。

## 1. 为什么要创建预设？

-   **封装设计系统**：将公司的品牌颜色、字体、间距、组件样式（快捷方式）等封装起来，确保所有项目都遵循统一的视觉标准。
-   **跨项目复用**：避免在每个新项目中都复制粘贴 `uno.config.ts` 的内容。
-   **社区分享**：像 `preset-wind` 和 `preset-mini` 一样，将你的设计系统或工具集发布到 npm，供其他人使用。

## 2. 预设的结构

一个预设本质上就是一个返回特定结构对象的函数。这个对象包含了你所熟悉的所有配置项。

```typescript
import type { Preset } from 'unocss'

export function presetMyTheme(): Preset {
  return {
    name: '@my-company/preset-theme', // 预设名称
    theme: {
      // 主题配置，如颜色、字体、断点
      colors: {
        primary: '#007bff',
        secondary: '#6c757d',
      }
    },
    rules: [
      // 自定义规则
    ],
    shortcuts: {
      // 自定义快捷方式
    },
    variants: [
      // 自定义变体
    ],
    presets: [
      // 甚至可以包含其他预设！
    ]
  }
}
```

## 3. 实战：创建一个企业设计系统预设

让我们来创建一个名为 `preset-acme` 的预设，它包含了 Acme 公司的设计规范。

### 第一步：创建预设文件

在你的项目根目录下创建一个新文件，例如 `preset.acme.ts`。

### 第二步：定义预设内容

```typescript
// preset.acme.ts
import type { Preset } from 'unocss'
import { presetWind } from '@unocss/preset-wind'

export function presetAcme(): Preset {
  return {
    name: '@acme/preset',

    // 包含 presetWind 的所有功能
    presets: [presetWind()],

    // 定义 Acme 的品牌颜色
    theme: {
      colors: {
        brand: {
          primary: '#3b82f6', // 蓝色
          secondary: '#10b981', // 绿色
        }
      }
    },

    // 定义 Acme 的组件快捷方式
    shortcuts: {
      'btn-acme': 'px-4 py-2 rounded-lg text-white transition-colors duration-300',
      'btn-acme-primary': 'btn-acme bg-brand-primary hover:bg-blue-700',
      'btn-acme-secondary': 'btn-acme bg-brand-secondary hover:bg-green-700',
    },

    // 定义一个自定义规则
    rules: [
      ['text-shadow-brand', { 'text-shadow': '2px 2px 4px #3b82f6' }]
    ]
  }
}
```

在这个预设中，我们：
1.  通过 `presets: [presetWind()]` **继承**了 `preset-wind` 的所有功能，无需从零开始。
2.  在 `theme` 中添加了我们自己的 `brand` 颜色。
3.  创建了几个以 `btn-acme` 为基础的按钮快捷方式，它们使用了我们新定义的主题色。
4.  添加了一个名为 `text-shadow-brand` 的自定义规则。

### 第三步：在 `uno.config.ts` 中使用预设

现在，你的主配置文件可以变得极其简洁：

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import { presetAcme } from './preset.acme'

export default defineConfig({
  presets: [
    presetAcme(),
  ]
})
```

完成了！现在你的项目中就可以直接使用 `bg-brand-primary`, `btn-acme-primary`, `text-shadow-brand` 等所有我们自定义的工具了。

## 4. 发布你的预设

当你准备好将预设分享给团队或社区时，只需将其作为一个标准的 npm 包发布即可。其他用户可以通过 `npm install @acme/preset` 安装，然后在他们的配置中直接引入：

```typescript
// 其他人的 uno.config.ts
import { defineConfig } from 'unocss'
import { presetAcme } from '@acme/preset' // 从 npm 包导入

export default defineConfig({
  presets: [
    presetAcme(),
  ]
})
```

## 总结

自定义预设是 UnoCSS “组合式”思想的终极体现。它是你封装和分发设计系统的最佳工具。

-   **组合优于继承**：你可以通过组合多个现有预设来构建自己的预设。
-   **终极封装**：将 `theme`, `rules`, `shortcuts` 等所有相关配置聚合到一个可复用的单元中。
-   **提升协作**：为团队提供一个单一、可信的设计系统来源。

掌握了创建自定义预设的能力，意味着你已经从一个 UnoCSS 的“使用者”转变为一个“创造者”。你不仅能构建应用，更能构建构建应用所用的“工具”。

至此，本书的核心技术章节已全部完成。在最后一部分，我们将把目光投向生态，看看如何将 UnoCSS 与 Vite、VS Code 等工具链深度集成，打造极致的开发体验。