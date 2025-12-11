# 终极玩法：创建你自己的预设

到目前为止，我们已经学习了 UnoCSS 的所有核心概念：规则、变体、快捷方式、主题、转换器等。现在是时候将这些知识整合起来，创建属于你自己的预设了。

预设（Preset）是 UnoCSS 配置的封装和复用单元。通过创建预设，你可以将公司的设计系统、个人的常用配置打包成可复用的模块，在多个项目间共享。

本章将从零开始，带你创建一个完整的自定义预设。

---

## 1. 预设的本质

### 1.1 预设是什么

预设本质上是一个返回配置对象的函数。这个配置对象可以包含规则、变体、快捷方式、主题、转换器等任何 UnoCSS 支持的配置项。

```ts
import { Preset } from 'unocss'

export function myPreset(): Preset {
  return {
    name: 'my-preset',
    rules: [
      // 规则
    ],
    variants: [
      // 变体
    ],
    shortcuts: {
      // 快捷方式
    },
    theme: {
      // 主题
    },
  }
}
```

### 1.2 预设的合并

当项目使用多个预设时，UnoCSS 会将它们的配置深度合并。后面的预设可以覆盖或扩展前面预设的配置。

```ts
export default defineConfig({
  presets: [
    presetUno(),       // 基础预设
    presetIcons(),     // 图标预设
    myPreset(),        // 你的自定义预设
  ],
})
```

### 1.3 预设的参数

预设函数可以接受参数，让使用者自定义行为：

```ts
interface MyPresetOptions {
  prefix?: string
  colors?: Record<string, string>
}

export function myPreset(options: MyPresetOptions = {}): Preset {
  const { prefix = '', colors = {} } = options
  
  return {
    name: 'my-preset',
    // 根据 options 生成配置
  }
}
```

---

## 2. 创建基础预设

让我们从一个简单的预设开始，逐步添加功能。

### 2.1 项目结构

创建一个新的 npm 包来存放预设：

```
my-preset/
├── src/
│   ├── index.ts
│   ├── rules.ts
│   ├── shortcuts.ts
│   ├── theme.ts
│   └── variants.ts
├── package.json
└── tsconfig.json
```

### 2.2 package.json

```json
{
  "name": "unocss-preset-my",
  "version": "1.0.0",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "unocss": ">=0.50.0"
  },
  "devDependencies": {
    "unocss": "^0.58.0",
    "typescript": "^5.0.0"
  }
}
```

### 2.3 入口文件

```ts
// src/index.ts
import type { Preset } from 'unocss'
import { rules } from './rules'
import { shortcuts } from './shortcuts'
import { theme } from './theme'
import { variants } from './variants'

export interface MyPresetOptions {
  prefix?: string
}

export function presetMy(options: MyPresetOptions = {}): Preset {
  return {
    name: 'unocss-preset-my',
    rules,
    shortcuts,
    theme,
    variants,
  }
}

export default presetMy
```

---

## 3. 编写预设规则

规则是预设的核心，定义了类名到 CSS 的映射。

### 3.1 静态规则

```ts
// src/rules.ts
import type { Rule } from 'unocss'

export const rules: Rule[] = [
  // 简单的静态规则
  ['flex-center', { display: 'flex', alignItems: 'center', justifyContent: 'center' }],
  ['absolute-center', { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }],
  
  // 可见性
  ['invisible', { visibility: 'hidden' }],
  ['visible', { visibility: 'visible' }],
]
```

### 3.2 动态规则

```ts
export const rules: Rule[] = [
  // 动态间距规则
  [/^space-(\d+)$/, ([, d]) => ({ gap: `${Number(d) * 0.25}rem` })],
  
  // 动态颜色规则
  [/^brand-(\w+)-(\d+)$/, ([, color, shade], { theme }) => {
    const colorValue = theme.colors?.brand?.[color]?.[shade]
    if (colorValue) {
      return { color: colorValue }
    }
  }],
  
  // 带选项的规则
  [/^truncate-(\d+)$/, ([, lines]) => ({
    display: '-webkit-box',
    '-webkit-line-clamp': lines,
    '-webkit-box-orient': 'vertical',
    overflow: 'hidden',
  })],
]
```

### 3.3 规则分层

可以为规则指定层级：

```ts
export const rules: Rule[] = [
  ['base-styles', {
    fontFamily: 'system-ui, sans-serif',
    lineHeight: '1.5',
  }, { layer: 'base' }],
]
```

---

## 4. 编写预设变体

变体扩展了类名的应用条件。

### 4.1 简单变体

```ts
// src/variants.ts
import type { Variant } from 'unocss'

export const variants: Variant[] = [
  // 打印媒体查询
  {
    name: 'print',
    match(matcher) {
      if (!matcher.startsWith('print:')) return matcher
      return {
        matcher: matcher.slice(6),
        parent: '@media print',
      }
    },
  },
  
  // 横屏/竖屏
  {
    name: 'landscape',
    match(matcher) {
      if (!matcher.startsWith('landscape:')) return matcher
      return {
        matcher: matcher.slice(10),
        parent: '@media (orientation: landscape)',
      }
    },
  },
]
```

### 4.2 选择器变体

```ts
export const variants: Variant[] = [
  // 第一个子元素
  {
    name: 'first-child',
    match(matcher) {
      if (!matcher.startsWith('first-child:')) return matcher
      return {
        matcher: matcher.slice(12),
        selector: s => `${s} > *:first-child`,
      }
    },
  },
  
  // 支持 RTL
  {
    name: 'rtl',
    match(matcher) {
      if (!matcher.startsWith('rtl:')) return matcher
      return {
        matcher: matcher.slice(4),
        selector: s => `[dir="rtl"] ${s}`,
      }
    },
  },
]
```

### 4.3 参数化变体

```ts
export const variants: Variant[] = [
  // 支持任意断点
  {
    name: 'at-breakpoint',
    match(matcher) {
      const match = matcher.match(/^at-\[(\d+)px\]:/)
      if (!match) return matcher
      return {
        matcher: matcher.slice(match[0].length),
        parent: `@media (min-width: ${match[1]}px)`,
      }
    },
  },
]
```

---

## 5. 编写预设主题

主题定义设计令牌。

### 5.1 颜色主题

```ts
// src/theme.ts
import type { Theme } from 'unocss/preset-uno'

export const theme: Theme = {
  colors: {
    brand: {
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      secondary: {
        // ...
      },
    },
    semantic: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
}
```

### 5.2 排版主题

```ts
export const theme: Theme = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Merriweather', 'Georgia', 'serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
  },
}
```

### 5.3 动画主题

```ts
export const theme: Theme = {
  animation: {
    keyframes: {
      'slide-in': '{from{transform:translateX(-100%)}to{transform:translateX(0)}}',
      'slide-out': '{from{transform:translateX(0)}to{transform:translateX(100%)}}',
      'fade-in': '{from{opacity:0}to{opacity:1}}',
      'scale-in': '{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}',
    },
    durations: {
      'slide-in': '300ms',
      'slide-out': '300ms',
      'fade-in': '200ms',
      'scale-in': '200ms',
    },
    timingFns: {
      'slide-in': 'ease-out',
      'slide-out': 'ease-in',
      'fade-in': 'ease-out',
      'scale-in': 'ease-out',
    },
  },
}
```

---

## 6. 编写预设快捷方式

快捷方式封装常用的类组合。

### 6.1 组件快捷方式

```ts
// src/shortcuts.ts

export const shortcuts = {
  // 按钮
  'btn': 'px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2',
  'btn-primary': 'btn bg-brand-primary-500 text-white hover:bg-brand-primary-600',
  'btn-secondary': 'btn bg-gray-200 text-gray-800 hover:bg-gray-300',
  'btn-ghost': 'btn bg-transparent hover:bg-gray-100',
  
  // 输入框
  'input': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-brand-primary-500 focus:ring-2 focus:ring-brand-primary-500/20 outline-none transition-colors',
  
  // 卡片
  'card': 'bg-white rounded-xl shadow-md overflow-hidden',
  'card-header': 'px-6 py-4 border-b border-gray-100',
  'card-body': 'px-6 py-4',
  'card-footer': 'px-6 py-4 border-t border-gray-100 bg-gray-50',
}
```

### 6.2 动态快捷方式

```ts
export const shortcuts = [
  // 静态快捷方式
  { btn: 'px-4 py-2 rounded-lg font-medium transition-colors' },
  
  // 动态快捷方式
  [/^btn-(\w+)$/, ([, color]) => `btn bg-${color}-500 text-white hover:bg-${color}-600`],
  [/^badge-(\w+)$/, ([, color]) => `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-800`],
]
```

---

## 7. 添加 Preflight

预设可以包含基础样式重置。

### 7.1 Preflight 配置

```ts
// src/index.ts
export function presetMy(options: MyPresetOptions = {}): Preset {
  return {
    name: 'unocss-preset-my',
    rules,
    shortcuts,
    theme,
    variants,
    preflights: [
      {
        layer: 'base',
        getCSS: ({ theme }) => `
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          html {
            font-family: ${theme.fontFamily?.sans?.join(', ') || 'system-ui, sans-serif'};
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
          }
          
          img, picture, video, canvas, svg {
            display: block;
            max-width: 100%;
          }
          
          input, button, textarea, select {
            font: inherit;
          }
          
          p, h1, h2, h3, h4, h5, h6 {
            overflow-wrap: break-word;
          }
        `,
      },
    ],
  }
}
```

---

## 8. 预设选项设计

好的预设应该提供灵活的配置选项。

### 8.1 完整的选项接口

```ts
export interface MyPresetOptions {
  // 前缀
  prefix?: string
  
  // 功能开关
  preflight?: boolean
  darkMode?: 'class' | 'media'
  
  // 主题扩展
  colors?: Record<string, Record<string, string>>
  fonts?: Record<string, string[]>
  
  // 其他选项
  important?: boolean
}
```

### 8.2 处理选项

```ts
export function presetMy(options: MyPresetOptions = {}): Preset {
  const {
    prefix = '',
    preflight = true,
    darkMode = 'class',
    colors = {},
    fonts = {},
    important = false,
  } = options
  
  // 合并颜色
  const mergedColors = {
    ...defaultColors,
    ...colors,
  }
  
  // 根据选项生成规则
  const finalRules = rules.map(rule => {
    if (important && Array.isArray(rule) && typeof rule[1] === 'object') {
      // 为所有规则添加 !important
      const declarations = rule[1] as Record<string, string>
      const importantDeclarations = Object.fromEntries(
        Object.entries(declarations).map(([k, v]) => [k, `${v} !important`])
      )
      return [rule[0], importantDeclarations, rule[2]]
    }
    return rule
  })
  
  return {
    name: 'unocss-preset-my',
    rules: finalRules,
    shortcuts,
    theme: {
      colors: mergedColors,
      fontFamily: { ...defaultFonts, ...fonts },
    },
    variants,
    preflights: preflight ? [...defaultPreflights] : [],
  }
}
```

---

## 9. 测试预设

预设应该有完善的测试。

### 9.1 单元测试

```ts
// tests/rules.test.ts
import { createGenerator } from '@unocss/core'
import { presetMy } from '../src'
import { describe, it, expect } from 'vitest'

describe('preset-my rules', () => {
  const uno = createGenerator({
    presets: [presetMy()],
  })
  
  it('should generate flex-center', async () => {
    const { css } = await uno.generate('flex-center')
    expect(css).toContain('display: flex')
    expect(css).toContain('align-items: center')
    expect(css).toContain('justify-content: center')
  })
  
  it('should handle dynamic rules', async () => {
    const { css } = await uno.generate('space-4')
    expect(css).toContain('gap: 1rem')
  })
})
```

### 9.2 快照测试

```ts
it('should match snapshot', async () => {
  const { css } = await uno.generate('btn btn-primary card')
  expect(css).toMatchSnapshot()
})
```

---

## 10. 发布预设

### 10.1 构建

使用 tsup 或 unbuild 构建预设：

```bash
npx tsup src/index.ts --format cjs,esm --dts
```

### 10.2 发布到 npm

```bash
npm login
npm publish
```

### 10.3 文档

好的预设需要完善的文档，包括安装说明、配置选项、可用的类名列表和示例代码。

---

## 11. 小结

本章从零开始创建了一个完整的 UnoCSS 预设。

预设是配置的封装单元，本质是一个返回配置对象的函数。预设可以接受参数，让使用者自定义行为。多个预设的配置会被深度合并。

预设结构包括规则（定义类名到 CSS 的映射，支持静态和动态规则）、变体（扩展类名的应用条件）、主题（定义设计令牌如颜色、字体、间距等）、快捷方式（封装常用的类组合）和 Preflight（基础样式重置）。

预设选项设计应该考虑功能开关、主题扩展、行为修改等。好的选项设计能让预设更灵活，适应不同项目的需求。

测试对于预设很重要，包括单元测试验证各个功能，快照测试确保输出稳定。

发布预设需要正确的构建配置和完善的文档。好的预设应该有清晰的 API、详细的使用说明和丰富的示例。

创建自己的预设是 UnoCSS 进阶的标志。通过预设，你可以将设计系统、团队规范打包成可复用的模块，大大提升开发效率和一致性。

下一章我们将进入生态与工具链部分，学习如何在各种框架中集成 UnoCSS。
