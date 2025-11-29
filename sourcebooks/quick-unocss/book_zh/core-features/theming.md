# 主题化定制：深入 `theme` 配置

每个项目都有独特的设计需求。默认的颜色、间距、断点可能无法完全满足你的设计稿要求。UnoCSS 的主题系统让你能够定制这些设计令牌，创建专属于你项目的样式系统。

本章将深入探讨 `theme` 配置的方方面面，帮助你构建一套完整的设计系统。

---

## 1. 主题系统概述

UnoCSS 的主题系统控制着工具类生成时使用的设计令牌（Design Tokens）。这些令牌包括颜色、间距、字体大小、断点等基础值。

### 1.1 主题的作用

当你使用 `text-blue-500` 时，UnoCSS 需要知道 `blue-500` 对应什么颜色值。这个映射关系就存储在主题配置中。通过修改主题，你可以改变整个项目中 `blue-500` 的含义，而不需要修改任何类名。

主题配置是集中管理设计令牌的地方。设计师修改了品牌色？只需要改一处主题配置。需要支持新的断点？添加到主题中即可。

### 1.2 预设与主题

`preset-uno` 和 `preset-wind` 等预设已经提供了完整的默认主题。你的自定义主题会与预设主题合并，可以选择性地覆盖或扩展特定的值。

```ts
export default defineConfig({
  theme: {
    // 你的自定义主题配置
    // 会与预设的默认主题合并
  },
})
```

---

## 2. 颜色定制

颜色是最常需要定制的设计令牌。

### 2.1 添加新颜色

在 `theme.colors` 中添加新的颜色定义：

```ts
theme: {
  colors: {
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
  },
}
```

现在可以使用 `bg-brand-500`、`text-brand-700` 等类名。

### 2.2 覆盖默认颜色

可以覆盖预设的颜色值：

```ts
theme: {
  colors: {
    blue: {
      500: '#1e40af',  // 将 blue-500 改为更深的蓝色
    },
  },
}
```

### 2.3 简单颜色值

如果颜色不需要深浅变体，可以直接使用字符串：

```ts
theme: {
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    accent: '#f59e0b',
  },
}
```

使用：`bg-primary`、`text-secondary`。

### 2.4 CSS 变量颜色

使用 CSS 变量可以实现运行时主题切换：

```ts
theme: {
  colors: {
    primary: 'var(--color-primary)',
    surface: 'var(--color-surface)',
  },
}
```

然后在 CSS 中定义变量：

```css
:root {
  --color-primary: #3b82f6;
  --color-surface: #ffffff;
}

.dark {
  --color-primary: #60a5fa;
  --color-surface: #1f2937;
}
```

### 2.5 使用颜色函数

可以使用颜色函数来定义支持透明度的颜色：

```ts
import { parseColor } from '@unocss/preset-mini/utils'

theme: {
  colors: {
    primary: 'rgba(59, 130, 246, <alpha-value>)',
  },
}
```

这样 `bg-primary/50` 就能正确生成 50% 透明度的颜色。

---

## 3. 间距定制

间距系统控制着 padding、margin、gap 等属性的可用值。

### 3.1 扩展间距

添加新的间距值：

```ts
theme: {
  spacing: {
    '4.5': '1.125rem',
    '18': '4.5rem',
    '128': '32rem',
  },
}
```

现在可以使用 `p-4.5`、`m-18`、`w-128` 等类名。

### 3.2 语义化间距

可以使用语义化的名称：

```ts
theme: {
  spacing: {
    'page': '2rem',
    'section': '4rem',
    'card': '1.5rem',
  },
}
```

使用：`p-card`、`my-section`。

### 3.3 间距与尺寸

间距值同时用于 `w-*`、`h-*`、`size-*` 等尺寸类。自定义间距也会自动应用到这些类。

---

## 4. 断点定制

响应式断点定义了不同屏幕尺寸的分界点。

### 4.1 覆盖断点

完全替换默认断点：

```ts
theme: {
  breakpoints: {
    sm: '480px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
}
```

### 4.2 添加断点

添加新的断点：

```ts
theme: {
  breakpoints: {
    xs: '320px',
    '2xl': '1536px',
    '3xl': '1920px',
  },
}
```

现在可以使用 `xs:`、`3xl:` 等变体。

### 4.3 使用场景

断点应该根据你的设计需求设置。如果设计稿的分界点是 600px 而非默认的 640px，就应该调整 `sm` 断点。如果需要支持超大屏幕，可以添加更大的断点。

---

## 5. 字体定制

字体配置包括字体家族、字体大小、行高等。

### 5.1 字体家族

定义自定义字体栈：

```ts
theme: {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['Fira Code', 'monospace'],
    display: ['Lexend', 'sans-serif'],
    body: ['Open Sans', 'sans-serif'],
  },
}
```

使用：`font-display`、`font-body`。

### 5.2 字体大小

自定义字体大小及其默认行高：

```ts
theme: {
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
  },
}
```

数组的第一个元素是字体大小，第二个元素可以包含行高、字间距等默认值。

### 5.3 字体粗细

自定义字重值：

```ts
theme: {
  fontWeight: {
    hairline: '100',
    thin: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
}
```

---

## 6. 阴影与圆角

### 6.1 盒阴影

定义阴影级别：

```ts
theme: {
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },
}
```

`DEFAULT` 键对应不带后缀的 `shadow` 类。

### 6.2 圆角

定义圆角级别：

```ts
theme: {
  borderRadius: {
    none: '0',
    sm: '0.125rem',
    DEFAULT: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },
}
```

---

## 7. 动画与过渡

### 7.1 过渡时长

定义过渡持续时间：

```ts
theme: {
  duration: {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
}
```

### 7.2 缓动函数

定义缓动曲线：

```ts
theme: {
  easing: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}
```

### 7.3 自定义动画

定义关键帧动画：

```ts
theme: {
  animation: {
    keyframes: {
      'fade-in': '{from{opacity:0}to{opacity:1}}',
      'fade-out': '{from{opacity:1}to{opacity:0}}',
      'slide-up': '{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}',
    },
    durations: {
      'fade-in': '300ms',
      'fade-out': '300ms',
      'slide-up': '400ms',
    },
    timingFns: {
      'fade-in': 'ease-out',
      'fade-out': 'ease-in',
      'slide-up': 'ease-out',
    },
  },
}
```

使用：`animate-fade-in`、`animate-slide-up`。

---

## 8. 层级与 z-index

定义 z-index 层级：

```ts
theme: {
  zIndex: {
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    dropdown: '1000',
    sticky: '1100',
    fixed: '1200',
    modal: '1300',
    popover: '1400',
    tooltip: '1500',
  },
}
```

使用：`z-dropdown`、`z-modal`。语义化的层级名称比数字更易理解和维护。

---

## 9. 主题扩展与覆盖

### 9.1 扩展机制

UnoCSS 会深度合并你的主题配置和预设的默认主题。这意味着你只需要定义想要改变或添加的部分：

```ts
theme: {
  colors: {
    brand: '#3b82f6',  // 添加新颜色
    // 其他颜色保持默认
  },
}
```

### 9.2 完全覆盖

如果想完全替换某个类别（而不是合并），可以使用特殊的语法或在预设中配置。但通常情况下，合并行为是更好的选择。

### 9.3 访问其他主题值

在某些场景下，你可能需要引用主题中的其他值。UnoCSS 支持通过函数访问主题：

```ts
rules: [
  [/^custom-(.+)$/, ([, name], { theme }) => {
    const color = theme.colors[name]
    if (color) {
      return { color }
    }
  }],
]
```

---

## 10. 实战：构建设计系统

让我们创建一个完整的主题配置示例。

### 10.1 品牌色系统

```ts
const brandColors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
}
```

### 10.2 语义化颜色

```ts
const semanticColors = {
  success: {
    light: '#dcfce7',
    DEFAULT: '#22c55e',
    dark: '#15803d',
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#b45309',
  },
  error: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#b91c1c',
  },
  info: {
    light: '#dbeafe',
    DEFAULT: '#3b82f6',
    dark: '#1d4ed8',
  },
}
```

### 10.3 完整主题配置

```ts
export default defineConfig({
  theme: {
    colors: {
      ...brandColors,
      ...semanticColors,
      
      // 界面颜色
      surface: {
        DEFAULT: '#ffffff',
        muted: '#f9fafb',
        elevated: '#ffffff',
      },
      
      // 文本颜色
      content: {
        DEFAULT: '#1f2937',
        muted: '#6b7280',
        subtle: '#9ca3af',
      },
      
      // 边框颜色
      border: {
        DEFAULT: '#e5e7eb',
        muted: '#f3f4f6',
      },
    },
    
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['2rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.5rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
    },
    
    spacing: {
      'page': '1rem',
      'page-md': '1.5rem',
      'page-lg': '2rem',
    },
    
    borderRadius: {
      DEFAULT: '0.5rem',
      sm: '0.25rem',
      lg: '0.75rem',
      xl: '1rem',
    },
    
    boxShadow: {
      sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
      DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    },
  },
})
```

### 10.4 配合快捷方式

```ts
shortcuts: {
  // 使用主题颜色的组件
  'btn-primary': 'bg-primary-500 text-white hover:bg-primary-600',
  'btn-secondary': 'bg-secondary-200 text-secondary-800 hover:bg-secondary-300',
  'btn-accent': 'bg-accent-500 text-white hover:bg-accent-600',
  
  // 使用语义化颜色
  'alert-success': 'bg-success-light text-success-dark border-l-4 border-success',
  'alert-warning': 'bg-warning-light text-warning-dark border-l-4 border-warning',
  'alert-error': 'bg-error-light text-error-dark border-l-4 border-error',
  
  // 使用界面颜色
  'card': 'bg-surface rounded shadow p-6',
  'card-elevated': 'bg-surface-elevated rounded-lg shadow-lg p-6',
}
```

---

## 11. 小结

本章深入探讨了 UnoCSS 的主题系统。

主题是设计令牌的集中管理处，控制着颜色、间距、断点、字体等基础值。通过修改主题，可以全局影响所有使用这些令牌的工具类。

颜色定制支持添加新颜色、覆盖默认颜色、使用简单值或深浅变体、使用 CSS 变量实现运行时主题切换。

间距定制可以添加新的间距值，支持数字和语义化名称，间距同时应用于 padding、margin、width、height 等类。

断点定制可以添加或修改响应式断点，应该根据实际设计需求调整。

字体定制包括字体家族、字体大小（可以带默认行高）、字重等。

阴影与圆角、动画与过渡、z-index 层级都可以通过主题自定义，使用语义化名称能提高代码可读性。

主题扩展是深度合并的，只需定义想要改变或添加的部分。完整的设计系统应该包括品牌色、语义化颜色、界面颜色、排版设置等，配合快捷方式使用效果更佳。

下一章我们将进入高级技巧部分，学习转换器（Transformers）的深入用法。
