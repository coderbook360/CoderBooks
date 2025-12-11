# 实战配置：安全列表、层与提取器

在前面的章节中，我们学习了 UnoCSS 的规则、变体、快捷方式和主题配置。那些知识足以应对大多数开发场景。但实际项目往往比教程复杂得多——你可能会遇到动态类名无法生成、样式优先级混乱、某些文件中的类名没被识别等问题。

本章将深入这些"实战级"配置，不只告诉你怎么配置，更重要的是帮你理解什么时候需要这些配置，以及配置错误会带来什么后果。

---

## 1. 从一个真实问题开始

假设你正在开发一个后台管理系统，其中有一个状态标签组件。产品经理要求根据不同状态显示不同颜色：待处理显示黄色，处理中显示蓝色，已完成显示绿色，已取消显示灰色。

你很自然地写出了这样的代码：

```vue
<template>
  <span :class="`bg-${statusColor}-100 text-${statusColor}-800 px-2 py-1 rounded`">
    {{ statusText }}
  </span>
</template>

<script setup>
const props = defineProps(['status'])

const statusMap = {
  pending: { color: 'yellow', text: '待处理' },
  processing: { color: 'blue', text: '处理中' },
  completed: { color: 'green', text: '已完成' },
  cancelled: { color: 'gray', text: '已取消' },
}

const statusColor = computed(() => statusMap[props.status].color)
const statusText = computed(() => statusMap[props.status].text)
</script>
```

代码逻辑没问题，但你会发现样式完全没有生效。打开浏览器开发者工具，这些类名确实被添加到了元素上，但对应的 CSS 根本不存在。

这就是我们要解决的第一个实战问题：动态类名的处理。

---

## 2. 安全列表：确保动态类名被生成

### 2.1 理解问题根源

UnoCSS 在构建时会扫描你的源代码，提取其中的类名字符串，然后只为这些类名生成 CSS。但它是通过静态分析完成的，无法理解 JavaScript 运行时的拼接逻辑。

当 UnoCSS 扫描上面的代码时，它看到的是模板字符串 `` `bg-${statusColor}-100` ``，而不是具体的 `bg-yellow-100` 或 `bg-blue-100`。由于它无法确定 `statusColor` 的值，这些类名就不会被生成。

### 2.2 安全列表解决方案

安全列表（Safelist）的作用是告诉 UnoCSS：无论是否在代码中检测到，都要生成这些类名。

```ts
// uno.config.ts
export default defineConfig({
  safelist: [
    'bg-yellow-100', 'text-yellow-800',
    'bg-blue-100', 'text-blue-800',
    'bg-green-100', 'text-green-800',
    'bg-gray-100', 'text-gray-800',
  ],
})
```

现在这些类名一定会被生成，动态拼接也能正常工作了。

### 2.3 更优雅的写法

手动列出每个类名很繁琐，而且容易遗漏。我们可以用代码生成：

```ts
const statusColors = ['yellow', 'blue', 'green', 'gray']

export default defineConfig({
  safelist: statusColors.flatMap(color => [
    `bg-${color}-100`,
    `text-${color}-800`,
  ]),
})
```

这样当你需要新增一个状态颜色时，只需要在 `statusColors` 数组中添加一项。

### 2.4 正则模式：强大但危险

UnoCSS 还支持使用正则表达式定义安全列表：

```ts
safelist: [
  /^bg-(yellow|blue|green|gray)-100$/,
  /^text-(yellow|blue|green|gray)-800$/,
]
```

正则模式更加简洁，但要小心一个陷阱。如果你写成这样：

```ts
// 危险！不要这样写
safelist: [
  /^bg-.*$/,  // 匹配所有背景色
]
```

这个正则会导致 UnoCSS 生成所有可能的背景色类名。在使用 preset-uno 的情况下，这可能意味着几千个类名，生成的 CSS 文件会从几 KB 膨胀到几百 KB。

我曾在一个项目中见过这样的配置，最终生成的 CSS 文件达到了 800KB，其中大部分都是未使用的安全列表类名。

### 2.5 安全列表的替代方案

在使用安全列表之前，考虑是否有更好的方案。

第一种方案是使用完整类名。重构代码，避免动态拼接：

```vue
<template>
  <span :class="[statusStyles[status], 'px-2 py-1 rounded']">
    {{ statusText }}
  </span>
</template>

<script setup>
const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
}
</script>
```

这种写法不需要安全列表，因为完整的类名字符串可以被静态分析提取出来。

第二种方案是使用快捷方式。如果这是一个常用模式，可以定义为快捷方式：

```ts
shortcuts: {
  'status-pending': 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded',
  'status-processing': 'bg-blue-100 text-blue-800 px-2 py-1 rounded',
  'status-completed': 'bg-green-100 text-green-800 px-2 py-1 rounded',
  'status-cancelled': 'bg-gray-100 text-gray-800 px-2 py-1 rounded',
}
```

然后在组件中使用：

```vue
<span :class="`status-${status}`">{{ statusText }}</span>
```

这样代码更简洁，而且快捷方式名也需要加入安全列表，但数量少得多。

### 2.6 安全列表对体积的影响

为了让你有直观的认识，这里提供一些实测数据。在一个典型的 Vue 3 项目中，只使用 preset-uno，不同配置下生成的 CSS 大小如下。

正常使用约 50 个工具类时，生成的 CSS 大约 3KB。添加 100 个具体类名到安全列表后，CSS 增加到约 5KB。添加 `/^bg-\w+-\d+$/` 这样的宽泛正则后，CSS 可能达到 150KB 以上。

安全列表中的每个类名都会生成对应的 CSS，无论它是否真的被使用。

---

## 3. 阻止列表：排除不需要的类名

阻止列表（Blocklist）是安全列表的反面，它告诉 UnoCSS 即使检测到这些类名也不要生成 CSS。

### 3.1 实际使用场景

场景一：与第三方库冲突。假设你的项目使用了一个 UI 组件库，它自带了 `container` 类的样式。UnoCSS 的 preset-uno 也会生成 `container` 类，两者发生冲突。

```ts
export default defineConfig({
  blocklist: ['container'],
})
```

场景二：禁用不需要的功能。如果你的项目不需要动画相关的工具类，可以排除它们以减少 CSS 体积：

```ts
blocklist: [/^animate-/],
```

场景三：调试时临时禁用。当你怀疑某个类名导致样式问题时，可以临时将它加入阻止列表，确认是否是它的问题。

### 3.2 阻止列表与预设配置

有些预设提供了更细粒度的控制。例如禁用 preset-uno 中的特定功能：

```ts
presetUno({
  dark: false,  // 禁用暗色模式支持
})
```

这比使用阻止列表更高效，因为从根源上避免了规则的匹配检查。

---

## 4. CSS 层：掌控样式优先级

如果你曾经遇到过"明明加了工具类却被其他样式覆盖"的问题，CSS 层就是你需要了解的概念。

### 4.1 一个典型的优先级问题

假设你有一个全局样式文件：

```css
/* global.css */
.btn {
  padding: 8px 16px;
  background: blue;
  color: white;
}
```

然后你想用工具类覆盖某个按钮的背景色：

```html
<button class="btn bg-red-500">红色按钮</button>
```

你期望按钮是红色的，但实际上它仍然是蓝色的。这是因为 CSS 选择器优先级相同时，后加载的样式生效。如果 `global.css` 在 UnoCSS 生成的样式之后加载，全局样式就会覆盖工具类。

### 4.2 CSS 原生 @layer

CSS 原生的 `@layer` 规则可以解决这个问题。它允许你定义样式的层级，无论加载顺序如何，层级低的样式总是会被层级高的覆盖。

UnoCSS 默认使用三个层，按优先级从低到高排列：`preflights` 包含 CSS 重置样式，优先级最低；`shortcuts` 包含快捷方式样式；`default` 包含工具类样式，优先级最高。

生成的 CSS 结构类似这样：

```css
@layer preflights, shortcuts, default;

@layer preflights {
  * { box-sizing: border-box; }
}

@layer shortcuts {
  .btn { /* 快捷方式的样式 */ }
}

@layer default {
  .bg-red-500 { background-color: #ef4444; }
}
```

### 4.3 自定义层

在实际项目中，你可能需要更细致的层级控制。比如你希望有一个 `components` 层放组件基础样式，优先级在工具类之下：

```ts
export default defineConfig({
  layers: {
    preflights: -2,
    components: -1,  // 新增的组件层
    shortcuts: 0,
    default: 1,
  },
})
```

现在你可以把全局组件样式放在 `components` 层中，确保工具类总能覆盖它。

### 4.4 规则中指定层

自定义规则时可以指定它属于哪个层：

```ts
rules: [
  ['card-base', { 
    padding: '1rem', 
    'border-radius': '0.5rem',
    'box-shadow': '0 1px 3px rgba(0,0,0,0.1)',
  }, { layer: 'components' }],
]
```

这条规则生成的样式会输出到 `components` 层，工具类可以覆盖它。

### 4.5 快捷方式的层级

快捷方式默认输出到 `shortcuts` 层。如果你希望某些快捷方式有更低的优先级：

```ts
shortcuts: [
  ['btn-base', 'px-4 py-2 rounded font-medium', { layer: 'components' }],
]
```

### 4.6 层顺序问题的排查

如果你遇到了样式优先级问题，可以这样排查。

首先，打开 Inspector（`/__unocss`），查看生成的 CSS 结构，确认层的顺序是否正确。

然后，在浏览器 DevTools 中检查元素样式，看哪条规则生效了，它来自哪个层。

最后，检查是否有样式没有使用 `@layer`，那些样式会有更高的优先级。

---

## 5. 提取器：让 UnoCSS 识别更多文件

提取器（Extractors）决定了 UnoCSS 如何从源代码中识别类名。默认提取器对大多数项目已经足够好，但某些特殊场景需要自定义配置。

### 5.1 默认提取器的工作原理

UnoCSS 使用正则表达式从文件中提取可能的类名字符串。它会识别各种形式：

```js
'text-red-500'           // 单引号字符串
"bg-blue-100"            // 双引号字符串
`p-4 m-2`                // 模板字符串
class="flex items-center" // HTML 属性
```

### 5.2 配置扫描范围

默认情况下，UnoCSS 会扫描项目中的大部分文件。但在大型项目中，精确配置扫描范围可以显著提升性能：

```ts
export default defineConfig({
  content: {
    pipeline: {
      include: [
        './src/**/*.{vue,jsx,tsx,html}',
        './components/**/*.{vue,jsx,tsx}',
      ],
      exclude: [
        './src/**/*.test.{js,ts}',
        './src/**/*.spec.{js,ts}',
        './src/**/*.d.ts',
        '**/node_modules/**',
        '**/dist/**',
      ],
    },
  },
})
```

在一个包含 500 个文件的项目中，正确配置扫描范围可以将构建时间从 3 秒减少到 0.8 秒。

### 5.3 处理特殊文件格式

有时候类名会出现在非代码文件中。比如一个 CMS 系统，内容存储在 JSON 文件中：

```json
{
  "hero": {
    "className": "bg-gradient-to-r from-blue-500 to-purple-500 text-white",
    "title": "欢迎"
  }
}
```

UnoCSS 默认不会处理 JSON 文件。需要添加配置：

```ts
content: {
  filesystem: [
    './content/**/*.json',
  ],
}
```

### 5.4 自定义提取器

对于更复杂的场景，可以编写自定义提取器。假设你的项目使用一种特殊的模板语法：

```
{# style: bg-blue-500 text-white #}
<div>内容</div>
```

可以创建一个提取器来处理它：

```ts
extractors: [
  {
    name: 'custom-template',
    extract({ code }) {
      const matches = []
      const regex = /\{#\s*style:\s*([^#]+)\s*#\}/g
      let match
      while ((match = regex.exec(code)) !== null) {
        matches.push(...match[1].trim().split(/\s+/))
      }
      return matches
    },
  },
],
```

### 5.5 提取器顺序

当有多个提取器时，它们会按 `order` 属性排序执行。默认提取器的 order 是 0，你的自定义提取器可以设为负数（先执行）或正数（后执行）：

```ts
extractors: [
  {
    name: 'my-extractor',
    order: -1,  // 在默认提取器之前执行
    extract({ code }) { /* ... */ },
  },
],
```

---

## 6. Preflight 配置

Preflight 是 CSS 重置样式，用于消除浏览器默认样式的差异。

### 6.1 使用预设的 Preflight

preset-uno 和 preset-wind 都包含 Preflight。默认启用，可以这样禁用：

```ts
presetUno({
  preflight: false,
})
```

### 6.2 为什么要自定义 Preflight

有时候预设的 Preflight 不完全符合你的需求。比如你希望所有链接默认没有下划线，或者所有按钮有统一的基础样式。

### 6.3 添加自定义 Preflight

```ts
export default defineConfig({
  preflights: [
    {
      layer: 'preflights',
      getCSS: ({ theme }) => `
        /* 链接样式 */
        a {
          color: ${theme.colors.blue[600]};
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        
        /* 按钮重置 */
        button {
          font-family: inherit;
          font-size: inherit;
          cursor: pointer;
        }
        
        /* 平滑滚动 */
        html {
          scroll-behavior: smooth;
        }
        
        /* 自定义 CSS 变量 */
        :root {
          --header-height: 64px;
          --sidebar-width: 240px;
        }
      `,
    },
  ],
})
```

注意 `getCSS` 可以访问 `theme`，这样你的 Preflight 可以与主题配置保持一致。

---

## 7. 完整配置示例

现在让我们把所有知识点整合到一个真实项目的配置中。这是一个后台管理系统的 UnoCSS 配置：

```ts
// uno.config.ts
import { defineConfig, presetUno, presetIcons, presetWebFonts } from 'unocss'

// 项目中使用的状态颜色
const statusColors = ['success', 'warning', 'error', 'info']

export default defineConfig({
  // 预设
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
    presetWebFonts({
      fonts: {
        sans: 'Inter:400,500,600,700',
        mono: 'Fira Code',
      },
    }),
  ],

  // 主题扩展
  theme: {
    colors: {
      brand: {
        50: '#eff6ff',
        100: '#dbeafe',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
      },
      success: { light: '#d1fae5', DEFAULT: '#10b981', dark: '#065f46' },
      warning: { light: '#fef3c7', DEFAULT: '#f59e0b', dark: '#92400e' },
      error: { light: '#fee2e2', DEFAULT: '#ef4444', dark: '#991b1b' },
      info: { light: '#dbeafe', DEFAULT: '#3b82f6', dark: '#1e40af' },
    },
  },

  // 快捷方式
  shortcuts: {
    // 布局
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    
    // 按钮基础
    'btn-base': 'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    'btn-primary': 'btn-base bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
    'btn-secondary': 'btn-base bg-gray-100 text-gray-700 hover:bg-gray-200',
    
    // 表单元素
    'input-base': 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
    
    // 卡片
    'card': 'bg-white rounded-xl shadow-sm border border-gray-100 p-6',
  },

  // 安全列表：只添加确实需要动态使用的类名
  safelist: [
    // 状态相关的类名，用于动态渲染
    ...statusColors.flatMap(color => [
      `bg-${color}-light`,
      `text-${color}-dark`,
      `border-${color}`,
    ]),
    // 动态网格列数
    ...Array.from({ length: 4 }, (_, i) => `grid-cols-${i + 1}`),
  ],

  // 阻止列表：排除与项目冲突的类名
  blocklist: [
    'container',  // 项目已有自定义 container
  ],

  // 层配置
  layers: {
    preflights: -2,
    components: -1,
    shortcuts: 0,
    default: 1,
  },

  // 扫描范围
  content: {
    pipeline: {
      include: [
        './src/**/*.{vue,jsx,tsx}',
        './components/**/*.vue',
      ],
      exclude: [
        './src/**/*.test.ts',
        './src/**/*.spec.ts',
        '**/*.d.ts',
      ],
    },
  },

  // Preflight
  preflights: [
    {
      layer: 'preflights',
      getCSS: ({ theme }) => `
        :root {
          --header-height: 64px;
          --sidebar-width: 240px;
          --color-brand: ${theme.colors.brand[500]};
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        body {
          font-family: 'Inter', system-ui, sans-serif;
          background-color: #f9fafb;
        }
        
        a {
          color: ${theme.colors.brand[600]};
          text-decoration: none;
        }
      `,
    },
  ],
})
```

这个配置的特点是：主题扩展了项目的品牌色和状态色，快捷方式封装了常用组件样式，安全列表只包含确实需要动态使用的类名且数量可控，阻止列表排除了冲突的类名，层配置支持组件样式和工具类的优先级控制，扫描范围精确配置以优化性能，Preflight 设置了全局样式和 CSS 变量。

---

## 8. 常见问题 FAQ

**Q1: 我添加了安全列表但类名还是没生效？**

检查几个方面：确认类名拼写正确，UnoCSS 区分大小写；确认配置文件被正确加载，可以在配置文件中加入 `console.log` 验证；使用 Inspector 查看安全列表是否生效；如果使用了正则模式，确认正则能匹配到你的类名。

**Q2: 多个预设的层会冲突吗？**

不会。UnoCSS 会合并所有预设的层配置。如果有同名的层，它们会合并在一起。你可以通过配置 `layers` 选项调整合并后的顺序。

**Q3: 提取器的顺序重要吗？**

大多数情况下不重要，因为多个提取器的结果会合并。但如果你的自定义提取器需要对代码进行某种预处理，那就应该设置较小的 `order` 值让它先执行。

**Q4: 为什么修改配置后没有生效？**

开发服务器可能缓存了旧配置。尝试重启开发服务器，或者在 VS Code 中执行"UnoCSS: Reload Config"命令。

**Q5: 如何调试复杂的配置问题？**

最有效的方法是使用 Inspector（访问 `/__unocss`）。在 REPL 中测试类名是否能生成 CSS，在 Module 页查看文件是否被正确扫描，在 Config 页检查配置是否正确加载。

---

## 9. 小结

本章介绍了 UnoCSS 的实战配置技巧，这些是你从基础使用进阶到复杂项目必须掌握的知识。

安全列表解决了动态类名的问题，但要谨慎使用，避免宽泛的正则模式导致 CSS 体积失控。更好的方案是重构代码避免动态拼接，或使用快捷方式封装。

CSS 层是控制样式优先级的利器。理解 preflights、shortcuts、default 三层的关系，在需要时自定义层级，可以避免大量的优先级调试。

提取器决定了 UnoCSS 能识别哪些文件中的类名。正确配置扫描范围对大型项目的构建性能有显著影响。

Preflight 是 CSS 重置的配置入口，可以与主题配置结合使用，建立全局一致的基础样式。

这些配置选项相互配合，让你能够应对各种复杂的项目场景。建议在实践中逐步尝试，遇到问题时善用 Inspector 调试。

下一章我们将学习如何创建自己的预设，把这些配置封装成可复用的包，在多个项目间共享。
