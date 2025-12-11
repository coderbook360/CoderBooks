# 编辑器赋能：VS Code 插件详解

在编写原子化 CSS 时，最大的挑战之一是记忆大量的工具类名称。UnoCSS 官方提供了 VS Code 插件，它能提供智能提示、类名预览、快速文档查看等功能，让你在编辑器中就能获得流畅的开发体验。

本章将详细介绍 UnoCSS VS Code 插件的功能和配置。

---

## 1. 安装插件

### 1.1 从扩展市场安装

在 VS Code 中打开扩展面板（Ctrl+Shift+X），搜索 "UnoCSS"，找到由 Anthony Fu 发布的官方插件，点击安装。

### 1.2 通过命令安装

也可以通过命令面板（Ctrl+Shift+P）执行：

```
ext install antfu.unocss
```

### 1.3 确认安装

安装成功后，在状态栏右下角会看到 UnoCSS 图标，表示插件已激活。

---

## 2. 核心功能

### 2.1 自动补全

当你输入类名时，插件会自动弹出补全建议。例如，输入 `bg-` 后会显示所有以 `bg-` 开头的类名，如 `bg-red-500`、`bg-blue-100` 等。

补全列表会显示类名和对应的 CSS 预览，帮助你快速选择正确的类名。

### 2.2 悬停预览

将鼠标悬停在类名上，插件会显示该类名生成的 CSS 代码。这让你不需要查阅文档就能了解类名的作用。

例如，悬停在 `rounded-lg` 上会显示：

```css
.rounded-lg {
  border-radius: 0.5rem;
}
```

### 2.3 颜色预览

对于颜色相关的类名，插件会在行内显示颜色方块预览。例如 `text-blue-500` 旁边会显示一个蓝色的小方块，让你直观地看到颜色效果。

### 2.4 快捷方式展开

如果你定义了快捷方式，插件会在悬停时显示展开后的完整类名和 CSS。这对于理解和调试快捷方式非常有用。

---

## 3. 配置项目

### 3.1 自动检测

插件会自动检测项目根目录下的 UnoCSS 配置文件（如 `uno.config.ts`、`unocss.config.js` 等）。如果检测到配置文件，插件会使用你的自定义配置。

### 3.2 手动指定配置文件

如果配置文件不在根目录，可以在 VS Code 设置中指定路径：

```json
{
  "unocss.root": "./packages/ui"
}
```

### 3.3 禁用特定项目

如果某个工作区不使用 UnoCSS，可以禁用插件：

```json
{
  "unocss.disable": true
}
```

---

## 4. 工作区设置

### 4.1 创建设置文件

在项目根目录创建 `.vscode/settings.json`：

```json
{
  "unocss.root": ".",
  "editor.quickSuggestions": {
    "strings": true
  }
}
```

### 4.2 启用字符串中的建议

为了在类名字符串中获得自动补全，需要启用字符串中的快速建议：

```json
{
  "editor.quickSuggestions": {
    "strings": true
  }
}
```

### 4.3 文件关联

确保相关文件类型与正确的语言模式关联：

```json
{
  "files.associations": {
    "*.vue": "vue",
    "*.jsx": "javascriptreact",
    "*.tsx": "typescriptreact"
  }
}
```

---

## 5. 高级功能

### 5.1 装饰器颜色

插件支持自定义类名装饰器的样式。颜色预览会根据你配置的颜色主题自动调整。

### 5.2 匹配高亮

当光标位于类名上时，同一文件中相同的类名会被高亮显示。这有助于查看类名在文件中的使用情况。

### 5.3 代码操作

插件提供一些代码操作（Code Actions），比如快速排序类名、提取为快捷方式等。

---

## 6. 支持的文件类型

### 6.1 默认支持

插件默认支持以下文件类型：HTML、Vue（包括模板和 style 块）、React（JSX/TSX）、Svelte、Astro、PHP、Markdown。

### 6.2 配置额外文件类型

如果你需要在其他文件类型中使用 UnoCSS 提示，可以添加配置：

```json
{
  "unocss.languageIds": [
    "html",
    "vue",
    "javascriptreact",
    "typescriptreact",
    "svelte",
    "astro",
    "erb",
    "edge"
  ]
}
```

---

## 7. 与属性化模式配合

### 7.1 属性化语法支持

如果你使用属性化模式，插件同样提供支持。在 HTML 属性位置输入时，会提示可用的属性化类名。

### 7.2 示例

```html
<div bg="blue-500" text="white lg" p="4">
  <!-- 在 bg="" 中输入会得到颜色相关的补全 -->
</div>
```

### 7.3 Vue 类型支持

对于 Vue 项目，添加类型声明以获得更好的支持：

```ts
// env.d.ts
/// <reference types="@unocss/preset-attributify/volar" />
```

---

## 8. 性能优化

### 8.1 大型项目

在大型项目中，插件可能会消耗较多资源。可以通过以下方式优化：

限制扫描范围，在 UnoCSS 配置中明确指定需要扫描的文件：

```ts
// uno.config.ts
export default defineConfig({
  content: {
    pipeline: {
      include: [
        'src/**/*.{vue,jsx,tsx,html}',
      ],
    },
  },
})
```

### 8.2 排除不需要的文件

排除明显不需要处理的文件：

```ts
export default defineConfig({
  content: {
    pipeline: {
      exclude: [
        'node_modules',
        'dist',
        '.git',
      ],
    },
  },
})
```

### 8.3 延迟加载

插件会在需要时才加载 UnoCSS，打开非相关文件时不会启动。

---

## 9. 故障排除

### 9.1 插件未激活

如果状态栏没有显示 UnoCSS 图标，检查以下几点：项目中是否有 UnoCSS 配置文件，配置文件是否有语法错误，是否禁用了插件。

### 9.2 补全不工作

如果自动补全不显示，尝试重新加载窗口（Ctrl+Shift+P 输入 "Reload Window"），检查 `editor.quickSuggestions` 设置，确认文件类型在支持列表中。

### 9.3 颜色预览不显示

颜色预览需要类名明确指定颜色值。对于自定义颜色，确保在配置中正确定义了颜色值。

### 9.4 配置更改不生效

修改 UnoCSS 配置后，可能需要重新加载 VS Code 窗口才能生效。

---

## 10. 与其他插件协作

### 10.1 Tailwind CSS IntelliSense

如果同时安装了 Tailwind CSS IntelliSense，两个插件可能会冲突。建议在使用 UnoCSS 的项目中禁用 Tailwind 插件：

```json
{
  "tailwindCSS.enable": false
}
```

### 10.2 ESLint

UnoCSS 提供了 ESLint 插件用于类名排序和规范检查：

```bash
npm install -D @unocss/eslint-plugin
```

```js
// .eslintrc.js
module.exports = {
  plugins: ['@unocss'],
  rules: {
    '@unocss/order': 'warn',
  },
}
```

### 10.3 Prettier

可以使用 Prettier 插件自动排序类名：

```bash
npm install -D prettier-plugin-organize-attributes
```

---

## 11. 命令面板

### 11.1 可用命令

插件在命令面板（Ctrl+Shift+P）中提供以下命令：UnoCSS: Reload Config 用于重新加载配置文件，UnoCSS: Open Config 用于打开配置文件，UnoCSS: Show Output 用于显示插件输出日志。

### 11.2 查看日志

如果遇到问题，可以通过 "UnoCSS: Show Output" 命令查看详细日志，帮助诊断问题。

---

## 12. 实用技巧

### 12.1 快速查找类名

不记得具体类名时，可以输入大概的关键词。例如想设置阴影但不记得类名，输入 `shadow` 就会看到所有阴影相关的类名。

### 12.2 探索可用选项

通过补全功能可以发现你可能不知道的类名。输入常用前缀如 `text-`、`bg-`、`border-` 等，浏览补全列表了解所有可用选项。

### 12.3 学习 CSS

通过悬停预览功能，你可以学习每个工具类对应的原始 CSS。这对于加深 CSS 理解很有帮助。

### 12.4 验证快捷方式

定义快捷方式后，在代码中使用并悬停查看展开结果，确认定义正确。

---

## 13. 推荐配置

以下是推荐的项目配置，可以直接复制使用：

```json
// .vscode/settings.json
{
  "editor.quickSuggestions": {
    "strings": true
  },
  "editor.formatOnSave": true,
  "css.validate": false,
  "tailwindCSS.enable": false,
  "unocss.root": "."
}
```

```json
// .vscode/extensions.json
{
  "recommendations": [
    "antfu.unocss"
  ]
}
```

---

## 14. 小结

UnoCSS VS Code 插件为编辑器带来了强大的开发辅助功能。它提供智能补全，让你不需要记忆所有类名，输入前缀就能得到完整建议。悬停预览功能让你随时查看类名对应的 CSS 代码，颜色预览让颜色选择更加直观。

插件会自动检测项目配置，使用你定义的自定义规则、快捷方式和主题。它支持所有主流的前端文件类型，与属性化模式也能很好地配合。

正确配置插件后，你将获得接近原生 CSS 的开发体验，同时享受原子化 CSS 带来的便利。建议将 `.vscode/settings.json` 和 `.vscode/extensions.json` 加入版本控制，让团队成员都能获得一致的开发体验。

至此，我们完成了 UnoCSS 完整的学习之旅。从基础概念到高级特性，从核心功能到生态工具，希望这本书能帮助你掌握这个强大的原子化 CSS 引擎。
