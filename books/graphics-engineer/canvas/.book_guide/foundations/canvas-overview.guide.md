# 章节写作指导：Canvas 概述与开发环境

## 1. 章节信息

- **章节标题**: Canvas 概述与开发环境
- **文件名**: foundations/canvas-overview.md
- **所属部分**: 第一部分：Canvas 基础入门
- **预计阅读时间**: 15分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Canvas 的本质：位图渲染与即时模式绘图
- 了解 Canvas 的应用场景与技术边界
- 掌握 Canvas 与 SVG 的核心差异
- 理解 Canvas 在浏览器渲染流程中的位置

### 技能目标
- 能够创建并配置 Canvas 元素
- 能够获取 2D 绘图上下文
- 能够搭建基础开发环境（TypeScript + 调试工具）
- 能够编写第一个 Canvas 绘图程序

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **位图画布** | 解释 Canvas 作为像素缓冲区的本质，与矢量图形的区别 |
| **即时模式 vs 保留模式** | 对比即时模式（Canvas）与保留模式（SVG/DOM）的渲染机制差异 |
| **绘图上下文 (Context)** | 解释 getContext('2d') 返回的 CanvasRenderingContext2D 对象的作用 |
| **Canvas 尺寸** | 区分 CSS 尺寸与 Canvas 实际像素尺寸（width/height 属性 vs style） |

### 关键知识点

- Canvas 元素的 HTML 属性与 DOM 属性
- 2D 上下文获取与 WebGL 上下文的简要对比
- Canvas 的浏览器兼容性与 Polyfill（简要提及）
- 开发工具推荐：VS Code 插件、浏览器 DevTools Canvas 面板

### 边界与限制

- Canvas 的最大尺寸限制（浏览器差异）
- 跨域图像安全限制（tainted canvas）的初步提及
- Canvas 不可访问性问题（无障碍）

## 4. 写作要求

### 开篇方式
以一个实际场景引入：想象你要在网页上实现一个简单的画板功能，选择 Canvas 还是 SVG？通过这个问题引出 Canvas 的定位。

### 结构组织

```
1. 什么是 Canvas
   - 定义与历史背景
   - 位图 vs 矢量
   
2. Canvas 的工作原理
   - 即时模式渲染
   - 绘图上下文概念
   
3. Canvas vs SVG 决策指南
   - 适用场景对比表格
   - 选型建议
   
4. 开发环境搭建
   - 基础 HTML 模板
   - TypeScript 配置建议
   - 调试工具介绍
   
5. 第一个 Canvas 程序
   - Hello Canvas：绘制一个简单图形
   - 代码逐行解析
   
6. 本章小结
```

### 代码示例

1. **基础 Canvas 元素创建**（HTML + JavaScript）
2. **获取 2D 上下文并绘制矩形**（完整可运行示例）
3. **正确设置 Canvas 尺寸**（对比错误与正确方式）

### 图表需求

- **对比图**：Canvas 即时模式 vs SVG 保留模式的渲染流程对比
- **表格**：Canvas vs SVG 特性对比表

## 5. 技术细节

### 实现要点

```javascript
// 必须展示的核心代码模式
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 尺寸设置的正确方式
canvas.width = 800;  // 实际像素
canvas.height = 600;
canvas.style.width = '800px';  // CSS 显示尺寸
canvas.style.height = '600px';
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| Canvas 内容模糊 | 正确设置 width/height 属性而非仅设置 CSS |
| 获取 context 返回 null | 检查 Canvas 元素是否存在，或上下文类型是否正确 |
| 绘制不显示 | 检查坐标是否在 Canvas 范围内，颜色是否正确设置 |

## 6. 风格指导

### 语气语调
- 友好、平易近人，像一位有经验的同事在分享知识
- 避免过于学术化的语言
- 适当使用类比帮助理解

### 类比方向
- Canvas 像一块画布 + 画笔，画完就成为画布的一部分
- SVG 像贴纸，每个元素都可以单独移动和修改
- 即时模式像在黑板上画画（画完就固定了）
- 保留模式像用磁铁贴字（可以随时移动每个字）

## 7. 与其他章节的关系

### 前置依赖
- 无（本章为起始章节）

### 后续章节铺垫
- 为第2章"坐标系统"铺垫 Canvas 的基础概念
- 为第3章"绘制上下文与状态管理"引入 context 概念

## 8. 章节检查清单

- [ ] 目标明确：读者读完能独立创建 Canvas 并绘制简单图形
- [ ] 术语统一：Canvas、Context、即时模式等术语首次出现时有明确定义
- [ ] 最小实现：提供可复制运行的最小代码示例
- [ ] 边界处理：提及 Canvas 尺寸限制和常见陷阱
- [ ] 性能与权衡：简要说明何时选择 Canvas vs SVG
- [ ] 图示与代码：流程图/对比图与代码一一对应
- [ ] 总结与练习：章末提供小结和思考题
