# 调试利器：Inspector

在前面的章节中，我们学习了大量的 UnoCSS 配置和用法。但实际开发中，你一定会遇到"为什么这个类名不生效"、"这个样式到底从哪来的"这样的问题。

传统的 CSS 调试，你可以在浏览器 DevTools 中查看计算样式。但原子化 CSS 带来了新的挑战——当你看到一个元素有二十个类名时，很难快速理解每个类名的作用，也不知道它们是由什么规则生成的。

UnoCSS 提供了一个强大的内置调试工具——Inspector。本章将通过几个**真实的调试案例**，教你如何用 Inspector 快速定位和解决问题。

---

## 1. 快速启动 Inspector

### 1.1 访问 Inspector

Inspector 默认集成在 Vite 开发服务器中。启动项目后，在浏览器中访问：

```
http://localhost:5173/__unocss
```

如果你用的是其他端口，替换 5173 为你的端口号。

**第一次打开 Inspector，你会看到什么？** 一个分为左右两栏的界面。左侧是导航和列表区域，右侧是详情区域。顶部有四个标签页：Overview、Modules、Config、REPL。

### 1.2 确认 Inspector 正常工作

如果访问 `/__unocss` 显示 404，检查两件事：

第一，确认 UnoCSS 插件已正确配置：

```ts
// vite.config.ts
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [UnoCSS()],
})
```

第二，确认没有禁用 Inspector：

```ts
// 这样会禁用 Inspector
UnoCSS({
  inspector: false, // 删除这行或改为 true
})
```

---

## 2. 案例一：类名不生效

### 2.1 问题场景

你在代码中写了 `bg-primary`，但元素没有背景色。打开浏览器 DevTools，发现这个类名确实在元素上，但没有对应的 CSS。

### 2.2 用 Inspector 诊断

**第一步：打开 REPL 标签页**

REPL 是最快的诊断工具。在输入框中输入 `bg-primary`，看看下方是否有输出。

**情况 A：REPL 没有输出**

这说明 `bg-primary` 没有匹配任何规则。可能的原因有：

拼写错误——你可能想用的是 `bg-blue-500` 这样的标准类名。

缺少自定义规则——如果你期望 `bg-primary` 是自定义的品牌色，你需要在配置中定义它：

```ts
// uno.config.ts
export default defineConfig({
  theme: {
    colors: {
      primary: '#3b82f6',
    },
  },
})
```

定义主题颜色后，`bg-primary`、`text-primary`、`border-primary` 等类名就会自动生效。

**情况 B：REPL 有输出**

这说明 UnoCSS 确实能生成 CSS，问题出在其他地方。继续下一步。

**第二步：检查 Modules 标签页**

切换到 Modules 标签页，搜索你的文件名。

如果找不到你的文件，说明 UnoCSS 没有扫描到它。检查你的 `content` 配置：

```ts
export default defineConfig({
  content: {
    pipeline: {
      include: [
        './src/**/*.{vue,jsx,tsx,html}',
        // 确保你的文件类型在这里
      ],
    },
  },
})
```

如果找到了文件，点击展开，看看 `bg-primary` 是否在提取到的类名列表中。

如果不在列表中，说明类名没有被正确提取。检查你的代码写法——动态拼接的类名（如 `` `bg-${color}` ``）不会被提取，需要加入安全列表。

**第三步：检查 CSS 优先级**

如果 REPL 有输出，Modules 中也有记录，但样式还是不生效，问题可能是 CSS 优先级。

回到浏览器 DevTools，选中元素，在 Styles 面板中搜索 `bg-primary`。看看是否有其他样式覆盖了它（被划掉的样式）。

### 2.3 总结诊断流程

```
类名不生效
    ↓
REPL 中测试类名
    ↓
有输出？ → 检查 Modules 是否提取 → 检查 CSS 优先级
    ↓
无输出？ → 检查拼写 / 检查是否需要配置主题或规则
```

---

## 3. 案例二：快捷方式不工作

### 3.1 问题场景

你在配置中定义了一个快捷方式 `btn-primary`：

```ts
export default defineConfig({
  shortcuts: {
    'btn-primary': 'px-4 py-2 bg-blue-500 text-white rounded',
  },
})
```

但在代码中使用 `btn-primary` 时，样式没有生效。

### 3.2 用 Inspector 诊断

**第一步：检查 Config 标签页**

切换到 Config 标签页，搜索 `shortcuts` 或 `btn-primary`。

**如果找不到 shortcuts**：说明配置文件没有被正确加载。可能的原因有：

配置文件名称错误——UnoCSS 默认查找 `uno.config.ts`、`unocss.config.ts`、`uno.config.js` 等。

配置文件位置错误——配置文件应该在项目根目录。

Vite 缓存问题——尝试重启开发服务器。

**如果找到了 shortcuts 但没有 btn-primary**：说明配置写法有问题。检查语法：

```ts
// 正确写法
shortcuts: {
  'btn-primary': 'px-4 py-2 bg-blue-500 text-white rounded',
}

// 或数组写法
shortcuts: [
  ['btn-primary', 'px-4 py-2 bg-blue-500 text-white rounded'],
]
```

**第二步：在 REPL 中测试**

输入 `btn-primary`，看看输出。

正常情况下，你应该看到快捷方式展开后的所有 CSS：

```css
.btn-primary {
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  --un-bg-opacity: 1;
  background-color: rgba(59, 130, 246, var(--un-bg-opacity));
  --un-text-opacity: 1;
  color: rgba(255, 255, 255, var(--un-text-opacity));
  border-radius: 0.25rem;
}
```

如果快捷方式中引用了其他自定义类名（如 `btn-primary: 'btn-base bg-blue-500'`），确保 `btn-base` 也已定义或是有效的工具类。

---

## 4. 案例三：样式被覆盖

### 4.1 问题场景

你给一个按钮添加了 `bg-blue-500`，但它显示的是红色背景。

### 4.2 用 Inspector 配合 DevTools 诊断

**第一步：确认 CSS 已生成**

在 REPL 中输入 `bg-blue-500`，确认有正常输出。

**第二步：在 DevTools 中检查**

打开浏览器 DevTools，选中这个按钮元素，在 Styles 面板中：

查看 `.bg-blue-500` 规则是否存在。如果存在但被划掉，看看是谁覆盖了它。

常见的覆盖来源有：

内联样式（`style="background: red"`）——优先级最高。

ID 选择器（`#my-button { background: red }`）——优先级高于类选择器。

更具体的选择器（`.card .button { background: red }`）——选择器越具体优先级越高。

`!important` 声明——强制最高优先级。

**第三步：解决方案**

如果是内联样式覆盖，移除内联样式或使用 `!important`（不推荐）。

如果是其他样式覆盖，考虑以下方案：

方案 A：提高 UnoCSS 类的优先级，使用 `important` 前缀：

```html
<button class="!bg-blue-500">按钮</button>
```

方案 B：调整 CSS 层级，在配置中使用 `layers`：

```ts
export default defineConfig({
  layers: {
    default: 1, // 提高默认层优先级
  },
})
```

方案 C：移除或修改冲突的 CSS 规则。

---

## 5. 案例四：响应式样式不工作

### 5.1 问题场景

你写了 `md:flex`，但在中等屏幕下元素还是 `display: block`。

### 5.2 用 Inspector 诊断

**第一步：确认变体正确**

在 REPL 中输入 `md:flex`，确认输出包含媒体查询：

```css
@media (min-width: 768px) {
  .md\:flex {
    display: flex;
  }
}
```

如果没有输出，说明 `md` 变体没有正确配置。检查你的预设是否包含响应式变体（`presetUno` 默认包含）。

**第二步：检查断点值**

在 Config 标签页中，搜索 `breakpoints` 或 `screens`。确认 `md` 对应的断点值：

```json
{
  "breakpoints": {
    "sm": "640px",
    "md": "768px",
    "lg": "1024px",
    "xl": "1280px"
  }
}
```

**第三步：检查视口宽度**

打开浏览器 DevTools，查看当前视口宽度。如果窗口宽度小于 768px，`md:flex` 自然不会生效。

**第四步：检查是否有其他样式覆盖**

`md:flex` 生成的选择器是 `.md\:flex`，如果有其他更高优先级的样式（如 `.container .item { display: block !important }`），会覆盖响应式样式。

---

## 6. 案例五：动态类名问题

### 6.1 问题场景

你有这样的代码：

```vue
<template>
  <div :class="`bg-${status}-500`">
    {{ message }}
  </div>
</template>

<script setup>
const status = ref('green') // 可能是 'green', 'yellow', 'red'
</script>
```

运行时 `status` 的值确实是 `'green'`，元素上也有 `bg-green-500` 类名，但样式不生效。

### 6.2 诊断与解决

**问题原因**：UnoCSS 在构建时扫描源码，但它只能提取静态的类名字符串。对于 `` `bg-${status}-500` `` 这样的模板字符串，它无法确定 `status` 的运行时值，所以不会生成对应的 CSS。

**解决方案 A：使用安全列表**

在配置中明确列出可能用到的类名：

```ts
export default defineConfig({
  safelist: [
    'bg-green-500',
    'bg-yellow-500',
    'bg-red-500',
  ],
})
```

**解决方案 B：使用对象语法避免动态拼接**

```vue
<template>
  <div :class="statusClasses[status]">
    {{ message }}
  </div>
</template>

<script setup>
const statusClasses = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
}
</script>
```

这样每个类名都是完整的字符串，可以被正确提取。

**验证**：修改后，在 Inspector 的 Modules 标签页中检查你的文件，确认这些类名已被提取。

---

## 7. 高效使用 Inspector 的技巧

### 7.1 开发时常开 Inspector

建议在浏览器中固定一个 Inspector 标签页。遇到样式问题时，第一反应是切到 Inspector 检查，而不是去翻文档。

### 7.2 善用 REPL 探索类名

不确定某个类名的效果？直接在 REPL 中输入测试。比如你不记得 `space-x-4` 和 `gap-4` 的区别，输入测试就知道了：

```
space-x-4
```

输出会显示它使用的是 `margin-left` 实现间距。

```
gap-4
```

输出会显示它使用的是 `gap` 属性。

### 7.3 用 Modules 检查文件覆盖范围

如果你怀疑某个文件没有被 UnoCSS 处理，在 Modules 页面搜索文件名。如果找不到，说明文件不在扫描范围内。

### 7.4 用 Config 验证配置加载

修改配置后样式没变化？先在 Config 页面确认配置已更新。如果配置是旧的，可能是缓存问题，尝试重启开发服务器。

### 7.5 配合 VS Code 插件使用

VS Code 的 UnoCSS 插件提供悬停预览，Inspector 提供深度调试。两者配合：

编码时：靠 VS Code 插件的悬停提示和自动补全。

调试时：用 Inspector 诊断问题。

---

## 8. 常见问题 FAQ

**Q1：Inspector 页面是空白的，什么都没有？**

可能是项目中没有使用任何 UnoCSS 类名，或者入口文件没有引入 `uno.css`。检查是否有 `import 'uno.css'` 或 `import 'virtual:uno.css'`。

**Q2：修改配置后 Inspector 没有更新？**

尝试刷新 Inspector 页面。如果还不行，重启 Vite 开发服务器（Ctrl+C 后重新 `npm run dev`）。

**Q3：REPL 中能正常生成 CSS，但在项目中不生效？**

检查 `uno.css` 是否在正确的位置引入，是否有其他 CSS 覆盖，元素是否正确添加了类名。

**Q4：Inspector 中显示的类名和我写的不一样？**

可能使用了转换器（如变体组转换器）。`hover:(bg-blue text-white)` 会被转换为 `hover:bg-blue hover:text-white`。

**Q5：能否在生产环境使用 Inspector？**

不能。Inspector 只在开发模式下可用，不会被打包到生产代码中。这是设计如此，确保不影响生产包大小。

---

## 9. 小结

Inspector 是 UnoCSS 开发中不可或缺的调试工具。

**REPL** 是最快的诊断入口——输入类名立即看到 CSS 输出，能快速判断"规则是否存在"。

**Modules** 帮助你理解"哪些文件被扫描了，提取了哪些类名"——用于诊断提取问题。

**Config** 让你确认"配置是否正确加载"——用于诊断配置问题。

**Overview** 提供项目级的统计信息——用于监控整体状态。

掌握了 Inspector 的使用方法，大多数 UnoCSS 问题都能快速定位和解决。记住核心的诊断流程：先在 REPL 测试类名是否有效，再检查是否被正确提取，最后排查 CSS 优先级问题。

下一章我们将介绍 UnoCSS 的 VS Code 插件，它为编辑器带来智能提示和实时预览功能。
