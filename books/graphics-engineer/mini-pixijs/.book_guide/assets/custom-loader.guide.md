# 章节写作指导：自定义 Loader 插件

## 1. 章节信息

- **章节标题**: 自定义 Loader 插件
- **文件名**: assets/custom-loader.md
- **所属部分**: 第十六部分：Assets 资源系统
- **章节序号**: 100
- **预计阅读时间**: 22分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Loader 插件的架构
- 掌握 LoaderParser 接口
- 了解资源加载的生命周期钩子
- 理解扩展系统与 Loader 的集成

### 技能目标
- 能够实现自定义文件格式的 Loader
- 能够注册和使用自定义 Loader
- 能够处理复杂的资源转换

## 3. 内容要点

### 核心概念（必须全部讲解）
- **LoaderParser**: 加载器解析器接口
- **Extension**: 扩展系统集成
- **Load Hook**: 加载阶段钩子
- **Parse Hook**: 解析阶段钩子

### 关键知识点（必须全部覆盖）
- LoaderParser 接口定义
- test 方法：格式识别
- load 方法：资源加载
- parse 方法：资源解析
- unload 方法：资源卸载
- 扩展注册机制
- 内置 Loader 分析

### 前置知识
- 第4章：扩展系统
- 第95-96章：Assets 系统基础

## 4. 写作要求

### 开篇方式
以"如何让 PixiJS 支持我自己的资源格式？"的问题开篇。

### 结构组织
1. **引言**：自定义格式的需求
2. **LoaderParser 接口**：详细定义
3. **实现步骤**：完整流程
4. **注册与使用**：集成方法
5. **案例分析**：内置 Loader 源码
6. **最佳实践**：开发建议
7. **小结**：要点回顾

### 代码示例
- 完整的自定义 Loader 实现
- 扩展注册代码
- 使用自定义 Loader

### 图表需求
- **必须**：Loader 生命周期图
- **可选**：LoaderParser 接口图
- **可选**：内置 Loader 类图

## 5. 技术细节

### 源码参考
- `packages/assets/src/loader/Loader.ts`
- `packages/assets/src/loader/parsers/`
- `packages/spritesheet/src/SpritesheetLoader.ts`

### 实现要点
- 正确的类型定义
- 异步加载处理
- 错误处理机制
- 资源清理

### 常见问题
- Q: 如何确定我的 Loader 优先级？
  A: 使用 priority 属性，数值越大优先级越高
- Q: 可以覆盖内置 Loader 吗？
  A: 可以，通过相同的 test 条件和更高优先级

## 6. 风格指导

### 语气语调
- 接口导向
- 代码完整
- 实践性强

### 类比方向
- 将 LoaderParser 类比为"翻译器"

## 7. 章节检查清单

- [ ] 完整介绍了 LoaderParser 接口
- [ ] 提供了完整的实现示例
- [ ] 分析了内置 Loader 源码
- [ ] 给出了最佳实践建议
