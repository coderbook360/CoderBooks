# 调试利器：Inspector

在日常开发中，我们总会遇到各种样式问题：“这个类名忘了怎么写？”、“为什么我写的样式没有生效？”、“我想看看 UnoCSS 到底为我生成了哪些 CSS？”。如果只能靠阅读代码和猜测来解决这些问题，效率无疑会大打折扣。

幸运的是，UnoCSS 提供了一个官方的、功能强大的可视化调试工具——**Inspector**。

## 1. 什么是 Inspector？

简单来说，UnoCSS Inspector 是一个**随开发服务器一起运行的可视化调试面板**。你可以把它想象成一个专门为 UnoCSS 服务的、集成在浏览器中的“开发者工具”。

通过 Inspector，你可以：

- **搜索**所有可用的工具类，并实时预览效果。
- **审查**当前项目中所有被 UnoCSS 生成的 CSS 规则。
- **检查**你的 `uno.config.ts` 配置是否被正确加载。
- **定位**哪些文件中的样式被成功提取。

掌握它，你的 UnoCSS 开发效率将提升一个量级。

## 2. 启用 Inspector

启用 Inspector 非常简单，只需要两步。

### 步骤 1：安装

首先，你需要安装 `@unocss/inspector` 包。

```bash
npm install -D @unocss/inspector
```

### 步骤 2：配置

然后，在你的构建工具配置中（以 Vite 为例），引入并添加 Inspector 插件。通常，它应该放在 `UnoCSS` 插件之后。

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import UnoCSS from 'unocss/vite'
import Inspector from '@unocss/inspector' // 1. 引入

export default defineConfig({
  plugins: [
    UnoCSS({ /* ... */ }),
    Inspector(), // 2. 添加插件实例
  ],
})
```

现在，重新启动你的开发服务器。你会发现在命令行输出中，多了一行关于 Inspector 的提示：

```
  ➜  UnoCSS Inspector: http://localhost:5173/__unocss
```

在浏览器中打开这个地址，你就能看到 Inspector 的主界面了。

## 3. 核心功能区导览

Inspector 的界面主要分为几个核心功能区，让我们逐一探索。

### 搜索与沙盒 (Search & Sandbox)

这是 Inspector 最核心、最常用的功能。界面的上半部分是一个搜索框和预览区域。

**[此处应有截图：Inspector 界面顶部，红框标注出搜索框和下方的实时预览区域]**

- **功能**：你可以在搜索框中输入任何你想查找的工具类名。下方会立即展示所有匹配的工具类，以及它们生成的 CSS 和一个可视化的效果预览。
- **应用场景**：
    - **忘记类名时**：想设置一个 `box-shadow`，但不记得具体的类名了。在搜索框输入 `shadow`，所有相关的工具类都会被列出来。
    - **学习和测试时**：想知道 `flex-col-reverse` 是什么效果？直接输入，下方的 Flex 布局预览会立即告诉你答案。

### 概览 (Overview) 面板

点击界面左侧的“Overview”标签，你会看到一个列表，展示了当前项目中**所有已经被 UnoCSS 生成**的 CSS 规则。

**[此处应有截图：Inspector 的 Overview 面板，红框标注出 CSS 规则列表]**

- **功能**：这里是你项目中实际生效的 CSS 的“真相”。
- **应用场景**：“我的 `m-4` 样式为什么没生效？” -> 打开“Overview”面板，在列表中搜索 `m-4`。如果找不到，就意味着 UnoCSS 因为某些原因（比如没有扫描到这个类）并没有为它生成规则。

### 模块 (Modules) 面板

“Modules”面板列出了所有被 UnoCSS 扫描并成功提取出工具类的文件模块。

**[此处应有截图：Inspector 的 Modules 面板，红框标注出文件列表]**

- **功能**：确认哪些文件正在被 UnoCSS “监视”。
- **应用场景**：“为什么我新加的 `NewComponent.vue` 里的样式完全不工作？” -> 检查“Modules”面板，看看 `NewComponent.vue` 是否出现在列表中。如果没有，很可能是你的 `unocss.config.ts` 中配置的扫描范围没有包含这个新文件。

### 配置 (Config) 面板

“Config”面板以一个清晰、可交互的视图展示了你当前**最终生效**的 UnoCSS 配置。

**[此处应有截图：Inspector 的 Config 面板，红框标注出 theme.colors 部分]**

- **功能**：直观地检查你的自定义配置是否被正确加载和合并。
- **应用场景**：“我的自定义颜色 `brand-primary` 怎么用不了？” -> 打开“Config”面板，展开 `theme` -> `colors`，看看 `brand-primary` 是否如你所愿地出现在那里。

## 4. 实战：一个典型的调试流程

让我们通过一个真实的场景，串联起这些功能，看看如何系统地排查问题。

**场景**：你在一个组件中写了 `text-brand-primary`，但是文字颜色没有变成你预期的品牌主色。

1.  **第一步：检查配置**
    打开 Inspector 的 **“Config”** 面板，检查 `theme.colors` 下是否存在 `brand` 对象，以及其中是否有 `primary` 键。如果这里没有，说明你的 `uno.config.ts` 文件本身就有问题，或者没有被正确加载。

2.  **第二步：检查可用性**
    如果配置无误，回到 **“Search”** 区域，搜索 `text-brand-primary`。如果它能被搜索到，并且下方展示了正确的 CSS (`color: #...;`)，说明 UnoCSS 知道这个规则，规则本身是有效的。

3.  **第三步：检查生成**
    规则有效但样式不生效，最可能的原因是它没有被生成。切换到 **“Overview”** 面板，搜索 `text-brand-primary`。如果在列表中找不到它，就证实了我们的猜想：UnoCSS 没有在你的代码中“看到”你使用了这个类。

4.  **第四步：检查模块**
    为什么没看到？打开 **“Modules”** 面板，在文件列表中找到你正在编辑的那个组件文件。如果文件**不在**这个列表里，说明问题出在扫描范围上。如果文件**在**列表里，点击它，你可以看到 UnoCSS 从这个文件中提取出的所有类。检查一下 `text-brand-primary` 是否在其中。如果不在，可能是你写错了，或者它被注释掉了，或者存在于某种 UnoCSS 无法解析的语法中。

通过这个四步流程，你可以系统地定位绝大部分“样式不生效”的问题。

## 总结

UnoCSS Inspector 是一个被低估的神器。它不仅是一个调试工具，更是一个强大的学习工具。当你对某个工具类的行为感到困惑时，当你想探索一个预设到底提供了哪些能力时，当你想确认自己的配置是否正确时，都请第一时间打开 Inspector。

将它作为你开发流程中的一部分，随意探索和尝试，你对 UnoCSS 的理解和掌控力必将达到新的高度。
