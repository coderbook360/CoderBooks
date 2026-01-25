# 源码结构与阅读指南

在深入 Vue 编译器源码之前，先了解代码的组织结构和核心模块的职责。这将帮助你在阅读源码时快速定位关键逻辑，不至于迷失在细节中。

## 包结构

Vue 编译器相关代码分布在几个核心包中：

packages/compiler-core 是平台无关的编译器核心。这里包含解析器、AST 定义、转换系统、代码生成器的基础实现。大部分编译逻辑都在这里。

packages/compiler-dom 扩展 compiler-core，添加浏览器 DOM 平台的特定处理。比如 v-html、v-text 的转换，v-model 在不同表单元素上的行为差异等。

packages/compiler-sfc 处理单文件组件。它协调模板编译、脚本编译（包括 script setup）、样式编译。是 .vue 文件编译的入口。

packages/compiler-ssr 处理服务端渲染的代码生成。SSR 生成的代码直接输出 HTML 字符串，与客户端渲染的虚拟 DOM 代码截然不同。

## compiler-core 目录结构

这是最核心的包，目录结构如下：

```
compiler-core/src/
├── ast.ts              # AST 节点类型定义
├── codegen.ts          # 代码生成器
├── compile.ts          # 编译入口
├── errors.ts           # 错误定义
├── index.ts            # 公共导出
├── options.ts          # 编译选项类型
├── parse.ts            # 解析器
├── runtimeHelpers.ts   # 运行时辅助函数标识
├── transform.ts        # 转换系统核心
├── transforms/         # 内置转换插件
│   ├── transformElement.ts
│   ├── transformExpression.ts
│   ├── transformText.ts
│   ├── vFor.ts
│   ├── vIf.ts
│   ├── vBind.ts
│   ├── vOn.ts
│   ├── vModel.ts
│   ├── vSlot.ts
│   └── ...
└── utils.ts            # 工具函数
```

## 核心文件职责

compile.ts 是编译入口，导出 baseCompile 函数。它串联解析、转换、代码生成三个阶段：

```typescript
export function baseCompile(template, options) {
  const ast = baseParse(template, options)
  transform(ast, options)
  return generate(ast, options)
}
```

parse.ts 实现解析器，将模板字符串转换为 AST。核心函数是 baseParse 和 parseChildren。

ast.ts 定义所有 AST 节点类型。这是理解编译器数据结构的关键文件。

transform.ts 实现转换系统的骨架：上下文创建、节点遍历、插件调用。

transforms/ 目录包含各个转换插件，每个处理特定类型的节点或指令。

codegen.ts 实现代码生成器，将增强的 AST 转换为 JavaScript 代码字符串。

## 阅读顺序建议

建议按以下顺序阅读源码：

首先阅读 ast.ts。理解 AST 节点结构是一切的基础。重点关注 NodeTypes 枚举、ElementNode、DirectiveNode 等核心类型。

然后阅读 parse.ts。从 baseParse 开始，跟踪 parseChildren 如何识别不同内容类型。理解 ParserContext 的作用。

接着阅读 transform.ts。理解 TransformContext、traverseNode 的工作方式。看看 transform 函数如何组织整个转换流程。

之后选择一两个转换插件深入研究。vIf.ts 和 vFor.ts 是好的起点，它们展示了如何处理复杂的结构转换。

最后阅读 codegen.ts。理解 generate 函数如何遍历 codegenNode 生成代码。关注 genNode 的分发逻辑。

## 调试技巧

阅读源码时，实际运行和调试会帮助理解。

在 packages/compiler-core/__tests__/ 目录下有大量测试用例。运行特定测试可以观察编译器行为：

```bash
pnpm test compiler-core -- --grep "v-if"
```

可以在源码中添加 console.log 输出中间状态。AST 节点可以 JSON.stringify（注意处理循环引用）。

Vue 的 Template Explorer 在线工具（https://template-explorer.vuejs.org/）可以直观看到模板的编译结果，包括 AST 和生成的代码。

## 关键类型

理解这些类型有助于阅读源码：

RootNode 是 AST 的根节点，包含 children、helpers、hoists 等。

TemplateChildNode 是模板内容节点的联合类型，包括 ElementNode、TextNode、InterpolationNode 等。

TransformContext 是转换阶段的上下文，包含当前节点、父节点、辅助函数集合等。

CodegenContext 是代码生成阶段的上下文，包含输出代码缓冲区、缩进控制等。

## 源码中的约定

Vue 编译器源码有一些约定：

以 `__` 开头的属性是内部使用的，不保证稳定。

`__DEV__` 是编译时常量，开发环境为 true。生产构建时相关代码会被删除。

函数名通常以动词开头：parse、transform、generate、create 等。

类型通常以 Node、Context、Options 结尾。

## 相关工具

@vue/compiler-sfc 导出了一些有用的工具函数：

parse 解析 SFC 文件结构。compileScript 编译脚本部分。compileTemplate 编译模板部分。compileStyle 编译样式部分。

这些函数的源码在 packages/compiler-sfc/src 目录下。

## 小结

Vue 编译器采用清晰的三阶段架构，代码组织反映这个结构。compiler-core 是核心，compiler-dom 和 compiler-ssr 扩展它适应不同平台，compiler-sfc 处理单文件组件。阅读源码时，建议从 AST 类型定义开始，然后按解析→转换→生成的顺序深入。配合测试用例和调试工具，可以更好地理解实现细节。后续章节将逐个深入这些模块的具体实现。
