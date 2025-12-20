# 章节写作指导：Graphics 矢量绘制架构

## 1. 章节信息

- **章节标题**: Graphics 矢量绘制架构
- **文件名**: graphics/overview.md
- **所属部分**: 第十一部分：Graphics 矢量绘制
- **章节序号**: 60
- **预计阅读时间**: 32分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 Graphics 在 PixiJS 中的架构设计
- 掌握 Graphics 与 GraphicsContext 的分层关系
- 理解绘图指令如何被记录与执行
- 掌握矢量到三角形的转换过程

### 技能目标
- 能够使用 Graphics API 绘制各类图形
- 能够理解 GraphicsContext 复用的性能优势
- 能够选择 Graphics vs Sprite 的最优方案

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Graphics 类结构
```typescript
class Graphics extends Container {
  // 绘图上下文（可共享）
  context: GraphicsContext;
  
  // 链式 API
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y): this;
  arc(cx, cy, r, startAngle, endAngle, anticlockwise?): this;
  
  // 形状快捷方法
  rect(x, y, width, height): this;
  circle(x, y, radius): this;
  ellipse(x, y, halfWidth, halfHeight): this;
  roundRect(x, y, width, height, radius): this;
  poly(points: number[], close?: boolean): this;
  
  // 填充与描边
  fill(style?: FillInput): this;
  stroke(style?: StrokeInput): this;
}
```

#### 3.2 GraphicsContext 指令存储
```typescript
class GraphicsContext {
  // 指令列表
  instructions: GraphicsInstruction[];
  
  // 指令类型
  type GraphicsInstruction = 
    | { action: 'fill', data: FillStyle }
    | { action: 'stroke', data: StrokeStyle }
    | { action: 'moveTo', data: [x, y] }
    | { action: 'lineTo', data: [x, y] }
    | { action: 'bezierCurveTo', data: [...] }
    | { action: 'arc', data: [...] };
  
  // 缓存的几何体数据
  batchedPath: BatchableGraphics;
}
```

#### 3.3 矢量到三角形流程
```
Graphics API 调用
    ↓
指令记录到 GraphicsContext
    ↓
三角化 (Triangulation)
    ↓
生成顶点数据 (vertices, uvs, indices)
    ↓
提交给 Batcher 渲染
```

### 关键知识点（必须全部覆盖）
1. **Graphics vs Container**: Graphics 继承 Container，添加矢量绘制能力
2. **Context 分离设计**: 多个 Graphics 可共享同一 Context
3. **链式 API**: 所有绘图方法返回 `this`
4. **三角化算法**: 路径转顶点的核心逻辑
5. **填充与描边**: fill/stroke 的状态管理
6. **批处理支持**: GraphicsBatcher 的工作方式
7. **与 Canvas2D 对比**: API 相似性与差异性

### 前置知识
- 第33-37章：场景图基础
- Canvas2D 绘图基础（理想，非强制）

## 4. 写作要求

### 开篇方式
以"如何在 WebGL/WebGPU 中绘制一个圆形？"开篇，引出矢量绘制的核心挑战。

### 结构组织
1. **引言**：矢量绘制的价值
2. **Graphics 概览**：类结构与职责
3. **API 设计**：链式调用
4. **基本使用**：绘制简单图形
5. **状态管理**：fill/stroke 配置
6. **与 Canvas 对比**：相似与差异
7. **小结**：Graphics 设计要点

### 代码示例
- 创建 Graphics
- 绑制基本图形
- 状态设置示例

### 图表需求
- **必须**：Graphics 类结构图
- **可选**：Graphics 渲染流程概览

## 5. 技术细节

### 源码参考
- `packages/graphics/src/Graphics.ts`
- `packages/graphics/src/GraphicsContext.ts`

### 实现要点
- Context 复用设计
- 指令列表结构
- 批处理支持
- 脏标记管理

### 常见问题
- Q: Graphics 和 Sprite 哪个更高效？
  A: 取决于场景，简单图形 Graphics 更灵活，复杂图形纹理更快
- Q: Graphics 可以导出为纹理吗？
  A: 可以，使用 renderer.generateTexture()

## 6. 风格指导

### 语气语调
- 概念清晰
- 渐进式介绍
- 与已知概念对比

### 类比方向
- 将 Graphics 类比为"画笔"—— 可以随意绑制
- 将 GraphicsContext 类比为"绘图指令集"—— 记录如何绑制

## 7. 章节检查清单

- [ ] 目标明确：本章输入/输出是否清晰
- [ ] 术语统一：是否给出标准引用与定义
- [ ] 最小实现：示例是否能运行且递进清晰
- [ ] 边界处理：异常/失败/限制是否覆盖
- [ ] 性能与权衡：优化思路与取舍是否明确
- [ ] 替代方案：对比与适用场景是否给出
- [ ] 图示与代码：是否一一对应
- [ ] 总结与练习：是否提供复盘与实操

## 8. 与其他章节的关系

### 前置章节
- 第33-37章：场景图

### 后续章节
- 第61章：GraphicsContext
- 第62-68章：Graphics 系统详解
