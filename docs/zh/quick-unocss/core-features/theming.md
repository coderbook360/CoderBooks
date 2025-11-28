# 主题化定制：深入 `theme` 配置

在构建任何有一定规模的前端应用时，我们都无法回避一个核心问题：如何保证设计语言的一致性？颜色、字体、间- 距、断点……这些构成我们视觉系统的基本元素，如果散落在代码的各个角落，将成为一场维护的噩梦。

想象一下，如果你的项目主色调是蓝色，你在几十个地方都写了 `bg-blue-500` 或 `text-blue-500`。当需要将主色调更换为紫色时，你将不得不进行一场“查找-替换”的冒险，祈祷不会遗漏任何一处。

这正是主题化（Theming）要解决的问题。UnoCSS 提供了强大而灵活的 `theme` 配置对象，让你能够将这些设计规范集中定义为“设计令牌”（Design Tokens），然后在整个应用中复用它们。这不仅极大地提升了可维护性，也为实现动态换肤等高级功能奠定了基础。

## 1. `theme` 对象：你的设计系统核心

`theme` 对象是 `uno.config.ts` 配置文件的核心部分之一。你可以在这里定义所有你希望在项目中重复使用的值。

让我们从一个基础的配置开始：

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'

export default defineConfig({
  theme: {
    // 1. 定义颜色
    colors: {
      primary: '#3B82F6', // 我们的主色调
      secondary: '#6B7280',
      success: '#10B981',
      danger: '#EF4444',
    },

    // 2. 定义字体家族
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      serif: ['Georgia', 'serif'],
    },

    // 3. 定义响应式断点
    breakpoints: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
    },
  },
})
```

通过上面的配置，我们做了三件事：
- **定义了一组品牌颜色**：`primary`, `secondary` 等。
- **指定了两种字体**：无衬线的 `sans` 和衬线 `serif`。
- **设置了标准的响应式断点**。

## 2. 使用主题值：与工具类的无缝集成

定义好 `theme` 后，最美妙的部分来了：这些值会自动与 UnoCSS 的核心工具类进行集成。UnoCSS 会智能地将你的主题令牌“注入”到对应的工具类中。

### 使用颜色

你可以像使用内置颜色一样，直接通过你定义的名字来使用它们：

```html
<!-- 使用我们定义的 'primary' 颜色 -->
<button class="bg-primary text-white px-4 py-2 rounded">
  Primary Button
</button>

<!-- UnoCSS 甚至能处理透明度 -->
<div class="bg-primary/50">
  一个半透明的背景
</div>

<!-- 边框颜色也一样 -->
<input class="border-secondary focus:border-primary" />
```

UnoCSS 会自动生成如下的 CSS 规则（或类似规则）：
```css
.bg-primary {
  --un-bg-opacity: 1;
  background-color: rgba(59, 130, 246, var(--un-bg-opacity));
}
.border-secondary {
  --un-border-opacity: 1;
  border-color: rgba(107, 114, 128, var(--un-border-opacity));
}
```

### 使用字体

同样，`font-` 工具类现在也认识了我们定义的 `sans` 和 `serif`：

```html
<h1 class="font-sans">这是一个无衬线标题</h1>
<p class="font-serif">这是一个衬线段落。</p>
```

### 使用响应式断点

我们定义的断点 `sm`, `md`, `lg`, `xl` 会直接生效，用于所有支持响应式的工具类。

```html
<!-- 在中等屏幕（md）及以上，文字居中 -->
<div class="text-left md:text-center">
  响应式文本对齐
</div>
```

## 3. 扩展与覆盖默认主题

UnoCSS 的预设（如 `preset-uno`）已经内置了一套非常完整的主题。在大多数情况下，你不需要从零开始。`theme` 对象的行为是**合并与覆盖**，而不是替换。

- **覆盖**：如果你定义的键与默认主题中的键相同（例如 `colors.blue`），你的值会覆盖默认值。
- **扩展**：如果你定义了新的键（例如 `colors.primary`），它会被添加到默认主题中。

假设我们想在 `preset-uno` 的基础上，只修改 `red` 色系，并增加我们的品牌色：

```typescript
// uno.config.ts
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
  ],
  theme: {
    colors: {
      // 覆盖默认的 red-500
      'red-500': '#DE3618', 
      // 添加新的品牌色，这属于扩展
      primary: 'var(--color-primary)', // 也可以使用 CSS 变量
    },
    // 扩展间距
    spacing: {
      '128': '32rem',
    }
  },
})
```

在这个例子中：
- `red-500` 的色值会被更新。
- 其他所有 `preset-uno` 的默认颜色（如 `blue-500`, `green-500`）保持不变。
- 新的 `primary` 颜色被添加进去。
- `spacing` 工具类（如 `p-`, `m-`, `w-`, `h-`）现在也认识了 `128` 这个尺寸。

```html
<div class="p-128">一个超大的内边距</div>
```

## 4. 嵌套与闭包：更高级的组织方式

当主题变得复杂时，你可以使用嵌套对象来组织你的颜色，甚至使用函数来动态生成主题。

### 嵌套颜色

```typescript
// uno.config.ts
theme: {
  colors: {
    brand: {
      primary: '#3B82F6',
      secondary: '#6B7280',
    },
  },
},
```

使用时，UnoCSS 会将它们用 `-` 连接起来：

```html
<div class="bg-brand-primary">
  品牌主色背景
</div>
```

### 使用函数动态生成主题

如果你需要基于某些基础值生成一系列变体，可以使用函数。这在处理颜色梯度或尺寸比例时非常有用。

```typescript
// uno.config.ts
theme: {
  colors: {
    primary: (theme) => theme.colors.blue, // 引用其他颜色
  },
  spacing: {
    // 动态创建一个从 1 到 10 的尺寸系列
    ...Object.fromEntries(
      Array.from({ length: 10 }).map((_, i) => [`dyn-${i + 1}`, `${(i + 1) * 0.25}rem`])
    ),
  }
},
```

## 总结

`theme` 对象是 UnoCSS 从一个“工具集”升级为“设计系统”的关键。通过将设计令牌集中化管理，你获得了：

- **一致性**：确保整个应用的视觉风格统一。
- **可维护性**：修改一个地方，全局生效。
- **灵活性**：轻松扩展和覆盖默认值，以匹配你的品牌。
- **可读性**：`bg-primary` 比 `bg-[#3B82F6]` 更具语义，代码更易理解。

掌握 `theme` 的使用，是高效运用 UnoCSS、构建高质量、可维护界面的核心技能。现在，就开始为你的项目定义一套专属的主题吧！
