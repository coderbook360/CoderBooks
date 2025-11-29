# 效率提升：快捷方式 (Shortcuts)

在前面的章节中，我们学习了大量的工具类。你可能已经注意到，实际开发中经常需要组合多个类来实现一个效果，比如一个按钮可能需要十几个类。

这种重复会带来两个问题：模板变得冗长难读，修改时需要在多处同步更改。快捷方式（Shortcuts）正是为解决这个问题而设计的。

本章将深入讲解 UnoCSS 的快捷方式功能，帮助你创建可复用的样式组合，提升开发效率。

---

## 1. 快捷方式的概念

快捷方式本质上是一种别名机制，让你可以用一个简短的名称代表一组工具类。它不会生成新的 CSS 规则，而是在处理时展开为对应的工具类。

### 1.1 为什么需要快捷方式

假设你有一个按钮样式：

```html
<button class="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg shadow hover:shadow-md transition-all">
  主要按钮
</button>
```

如果项目中有几十个这样的按钮，每次都写这么长的类名会非常繁琐。更麻烦的是，如果设计师要求修改按钮圆角，你需要修改所有这些地方。

使用快捷方式后，你可以这样写：

```html
<button class="btn-primary">主要按钮</button>
```

这不仅让模板更简洁，也让样式变更集中在一处管理。

### 1.2 快捷方式 vs 组件

你可能会问：为什么不直接抽取成组件？

快捷方式和组件解决的是不同层次的问题。组件封装的是结构和行为，而快捷方式封装的只是样式。有时候你需要在不同结构的元素上应用相同的样式，比如 `<button>` 和 `<a>` 都可能需要按钮样式，这时快捷方式更灵活。

此外，快捷方式是零运行时开销的，它在构建时就展开为工具类，不会增加任何 JavaScript 代码。

---

## 2. 基础配置

快捷方式在 `uno.config.ts` 中通过 `shortcuts` 选项配置。

### 2.1 简单数组格式

最简单的快捷方式是用数组将多个类组合在一起：

```ts
export default defineConfig({
  shortcuts: [
    ['btn', 'px-4 py-2 rounded-lg font-semibold inline-flex items-center justify-center'],
    ['btn-primary', 'btn bg-blue-500 text-white hover:bg-blue-600'],
    ['btn-secondary', 'btn bg-gray-200 text-gray-800 hover:bg-gray-300'],
  ],
})
```

数组中每个元素是一个二元组，第一个元素是快捷方式名称，第二个元素是要展开的类名字符串。

### 2.2 对象格式

也可以使用对象格式，更加直观：

```ts
export default defineConfig({
  shortcuts: {
    'btn': 'px-4 py-2 rounded-lg font-semibold inline-flex items-center justify-center',
    'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600',
    'btn-secondary': 'btn bg-gray-200 text-gray-800 hover:bg-gray-300',
  },
})
```

### 2.3 嵌套使用

如你所见，快捷方式可以引用其他快捷方式。在上面的例子中，`btn-primary` 和 `btn-secondary` 都引用了 `btn`。这让你可以建立一个层次化的样式系统。

```ts
shortcuts: {
  // 基础层
  'btn': 'px-4 py-2 rounded-lg font-semibold transition-all',
  
  // 尺寸变体
  'btn-sm': 'btn px-3 py-1.5 text-sm',
  'btn-lg': 'btn px-6 py-3 text-lg',
  
  // 颜色变体
  'btn-primary': 'bg-blue-500 text-white hover:bg-blue-600',
  'btn-danger': 'bg-red-500 text-white hover:bg-red-600',
  
  // 组合
  'btn-primary-lg': 'btn-lg btn-primary',
}
```

---

## 3. 动态快捷方式

有时候快捷方式需要支持动态参数，比如 `btn-blue`、`btn-red` 这样根据颜色变化的快捷方式。

### 3.1 正则匹配

动态快捷方式使用正则表达式匹配，返回函数处理匹配结果：

```ts
shortcuts: [
  [/^btn-(.+)$/, ([, c]) => `bg-${c}-500 text-white hover:bg-${c}-600 px-4 py-2 rounded-lg`],
]
```

现在 `btn-blue`、`btn-red`、`btn-green` 等都会生效，分别展开为对应颜色的按钮样式。

### 3.2 复杂动态匹配

可以捕获多个参数：

```ts
shortcuts: [
  // 匹配 btn-{color}-{size}
  [/^btn-(\w+)-(sm|md|lg)$/, ([, color, size]) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    }
    return `bg-${color}-500 text-white hover:bg-${color}-600 ${sizeClasses[size]} rounded-lg font-semibold`
  }],
]
```

使用：

```html
<button class="btn-blue-sm">小蓝按钮</button>
<button class="btn-red-lg">大红按钮</button>
```

### 3.3 条件逻辑

函数内可以包含任意逻辑：

```ts
shortcuts: [
  [/^card-(\w+)$/, ([, type]) => {
    const base = 'rounded-lg p-6 shadow'
    if (type === 'elevated') {
      return `${base} shadow-lg hover:shadow-xl transition-shadow`
    }
    if (type === 'outlined') {
      return `${base} border border-gray-200 shadow-none`
    }
    return base
  }],
]
```

---

## 4. 快捷方式与变体

快捷方式完全支持变体系统。你可以在快捷方式内使用变体，也可以在使用快捷方式时添加变体。

### 4.1 快捷方式内的变体

```ts
shortcuts: {
  'btn': 'px-4 py-2 rounded-lg hover:scale-105 active:scale-95 transition-transform',
  'input-base': 'border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
}
```

这些快捷方式内部已经包含了交互状态的样式定义。

### 4.2 快捷方式外的变体

使用时可以添加更多变体：

```html
<!-- 在中等屏幕以上应用 btn 样式 -->
<button class="md:btn">响应式按钮</button>

<!-- 暗色模式下的不同表现 -->
<div class="card dark:card-dark">卡片内容</div>
```

### 4.3 结合变体组

配合 `transformerVariantGroup`，可以对快捷方式使用变体组语法：

```html
<button class="hover:(btn-primary shadow-lg)">
  悬停时变成主要按钮样式并添加阴影
</button>
```

---

## 5. 组织快捷方式

随着项目规模增长，快捷方式会越来越多。良好的组织方式能让维护更加轻松。

### 5.1 按类别分组

将相关的快捷方式放在一起：

```ts
// shortcuts/buttons.ts
export const buttonShortcuts = {
  'btn': 'px-4 py-2 rounded-lg font-semibold transition-all',
  'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600',
  'btn-secondary': 'btn bg-gray-200 text-gray-800 hover:bg-gray-300',
  'btn-outline': 'btn border border-current hover:bg-gray-50',
}

// shortcuts/forms.ts
export const formShortcuts = {
  'input': 'border border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none',
  'label': 'text-sm font-medium text-gray-700',
  'form-group': 'space-y-2',
}

// shortcuts/cards.ts
export const cardShortcuts = {
  'card': 'bg-white rounded-lg shadow p-6',
  'card-header': 'font-bold text-lg mb-4',
  'card-body': 'text-gray-600',
}
```

然后在配置中合并：

```ts
import { buttonShortcuts } from './shortcuts/buttons'
import { formShortcuts } from './shortcuts/forms'
import { cardShortcuts } from './shortcuts/cards'

export default defineConfig({
  shortcuts: {
    ...buttonShortcuts,
    ...formShortcuts,
    ...cardShortcuts,
  },
})
```

### 5.2 命名约定

建立一致的命名约定能让快捷方式更易发现和使用。常见的约定包括：使用组件名作为前缀（如 `btn-`、`card-`、`nav-`），用连字符分隔单词，变体用后缀表示（如 `-primary`、`-sm`、`-outline`）。

### 5.3 文档化

为快捷方式添加注释说明其用途：

```ts
shortcuts: {
  // 按钮 - 基础样式，不包含颜色
  'btn': 'px-4 py-2 rounded-lg font-semibold transition-all inline-flex items-center justify-center',
  
  // 按钮 - 主要操作，蓝色
  'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700',
  
  // 按钮 - 次要操作，灰色
  'btn-secondary': 'btn bg-gray-200 text-gray-800 hover:bg-gray-300',
  
  // 按钮 - 危险操作，红色
  'btn-danger': 'btn bg-red-500 text-white hover:bg-red-600',
}
```

---

## 6. 实战示例

让我们创建一套完整的快捷方式系统。

### 6.1 设计令牌快捷方式

首先定义一些基础的设计令牌：

```ts
shortcuts: {
  // 文本层次
  'text-heading': 'text-gray-900 dark:text-white font-bold',
  'text-body': 'text-gray-700 dark:text-gray-300',
  'text-muted': 'text-gray-500 dark:text-gray-400',
  'text-error': 'text-red-600 dark:text-red-400',
  'text-success': 'text-green-600 dark:text-green-400',
  
  // 背景层次
  'bg-surface': 'bg-white dark:bg-gray-900',
  'bg-muted': 'bg-gray-100 dark:bg-gray-800',
  'bg-elevated': 'bg-white dark:bg-gray-800 shadow-lg',
}
```

### 6.2 组件快捷方式

基于设计令牌构建组件样式：

```ts
shortcuts: {
  // 按钮系统
  'btn': 'px-4 py-2 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
  'btn-sm': 'btn px-3 py-1.5 text-sm',
  'btn-lg': 'btn px-6 py-3 text-lg',
  'btn-primary': 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 shadow-sm hover:shadow',
  'btn-secondary': 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600',
  'btn-ghost': 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
  
  // 卡片系统
  'card': 'bg-surface rounded-xl shadow-sm overflow-hidden',
  'card-header': 'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
  'card-body': 'px-6 py-4',
  'card-footer': 'px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-muted',
  
  // 表单系统
  'form-input': 'w-full border border-gray-300 rounded-lg px-4 py-2 text-body bg-surface focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-gray-600',
  'form-label': 'block text-sm font-medium text-body mb-1',
  'form-error': 'text-sm text-error mt-1',
  'form-group': 'space-y-1',
  
  // 导航系统
  'nav-link': 'text-body hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md transition-colors',
  'nav-link-active': 'nav-link bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
}
```

### 6.3 布局快捷方式

常用的布局模式：

```ts
shortcuts: {
  // Flex 布局
  'flex-center': 'flex items-center justify-center',
  'flex-between': 'flex items-center justify-between',
  'flex-col-center': 'flex flex-col items-center justify-center',
  
  // 容器
  'container-prose': 'max-w-prose mx-auto px-4',
  'container-wide': 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  
  // 分隔
  'divider': 'border-t border-gray-200 dark:border-gray-700 my-4',
  'divider-vertical': 'border-l border-gray-200 dark:border-gray-700 mx-4 h-full',
}
```

### 6.4 使用示例

```html
<div class="bg-surface min-h-screen">
  <header class="flex-between container-wide py-4 border-b border-gray-200">
    <h1 class="text-heading text-xl">网站标题</h1>
    <nav class="flex gap-2">
      <a href="#" class="nav-link-active">首页</a>
      <a href="#" class="nav-link">关于</a>
      <a href="#" class="nav-link">联系</a>
    </nav>
  </header>
  
  <main class="container-wide py-8">
    <div class="card">
      <div class="card-header">
        <h2 class="text-heading">卡片标题</h2>
      </div>
      <div class="card-body">
        <form class="space-y-4">
          <div class="form-group">
            <label class="form-label">邮箱</label>
            <input class="form-input" type="email" />
          </div>
          <div class="flex gap-4">
            <button class="btn btn-primary">提交</button>
            <button class="btn btn-secondary">取消</button>
          </div>
        </form>
      </div>
    </div>
  </main>
</div>
```

---

## 7. 最佳实践

### 7.1 何时使用快捷方式

快捷方式适合封装频繁重复的样式组合。一个好的经验法则是：如果某个样式组合在项目中出现三次以上，就值得考虑抽取为快捷方式。

但也不要过度使用。简单的样式组合直接写工具类可能更清晰，比如 `flex items-center` 就没必要抽取为快捷方式。

### 7.2 保持组合性

快捷方式应该设计成可组合的。不要试图在一个快捷方式中包含所有样式，而是拆分成可以自由组合的部分。

```ts
// 不推荐 - 太具体
shortcuts: {
  'primary-button-with-icon-and-shadow': '...',
}

// 推荐 - 可组合
shortcuts: {
  'btn': '...',
  'btn-primary': '...',
  'btn-with-icon': '...',
}
```

### 7.3 与原子类协作

快捷方式不是要取代原子类，而是与它们协作。快捷方式封装通用的基础样式，原子类用于微调和特殊情况。

```html
<!-- 使用快捷方式作为基础，原子类做微调 -->
<button class="btn btn-primary w-full mt-4">全宽按钮</button>
```

### 7.4 避免过度抽象

快捷方式的名称应该直观易懂。避免创建过于抽象或含义模糊的名称。

```ts
// 不推荐 - 含义不明
shortcuts: {
  'style-1': '...',
  'box-a': '...',
}

// 推荐 - 语义清晰
shortcuts: {
  'btn-primary': '...',
  'card-elevated': '...',
}
```

---

## 8. 小结

本章深入讲解了 UnoCSS 的快捷方式功能。

快捷方式是一种别名机制，让你用简短的名称代表一组工具类。它解决了模板冗长和样式分散的问题，提升了代码的可维护性。

配置方式支持数组格式和对象格式两种，快捷方式之间可以相互引用，形成层次化的样式系统。

动态快捷方式通过正则匹配实现，可以根据匹配的参数动态生成样式，适合创建颜色变体、尺寸变体等系列化的样式。

快捷方式完全兼容变体系统，无论是在快捷方式内部使用变体，还是在使用快捷方式时添加变体，都能正常工作。

组织大量快捷方式时，按类别分组、建立命名约定、添加文档注释都是好的实践。

设计快捷方式时应该注重组合性，让它们可以灵活搭配使用，而不是创建大量特定场景的一次性快捷方式。

快捷方式与原子类是协作关系，快捷方式封装通用样式，原子类用于微调，两者配合使用效果最佳。

下一章我们将学习属性化模式和变体组，这是另一种提升开发体验的重要特性。
