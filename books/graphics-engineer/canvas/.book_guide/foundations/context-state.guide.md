# 章节写作指导：绘制上下文与状态管理

## 1. 章节信息

- **章节标题**: 绘制上下文与状态管理
- **文件名**: foundations/context-state.md
- **所属部分**: 第一部分：Canvas 基础入门
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 CanvasRenderingContext2D 对象的结构
- 掌握 Canvas 状态的组成：样式、变换、裁剪等
- 理解状态栈（State Stack）的工作原理
- 理解 save() 和 restore() 的内部机制

### 技能目标
- 能够正确使用 save()/restore() 管理状态
- 能够避免状态污染问题
- 能够设计可维护的绑定上下文封装

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **绘图上下文** | 详解 CanvasRenderingContext2D 对象，它是所有绑定操作的入口 |
| **状态（State）** | 定义什么是 Canvas 状态：样式属性、变换矩阵、裁剪区域 |
| **状态栈** | 解释 save/restore 基于栈的状态保存机制 |
| **状态属性分类** | 区分可保存的状态属性和不可保存的属性 |

### 关键知识点

- Context 属性全览：fillStyle, strokeStyle, lineWidth, font 等
- 可被 save/restore 保存的状态清单
- 状态嵌套与作用域概念
- 状态重置的几种方法

### 边界与限制

- save/restore 不配对的后果
- 过深的状态栈嵌套性能影响
- 状态属性的默认值

## 4. 写作要求

### 开篇方式
设置一个问题场景：当你在 Canvas 上绑定多个不同样式的图形时，如何避免样式"串味"？通过这个实际问题引入状态管理的重要性。

### 结构组织

```
1. 认识绘图上下文
   - Context 对象概览
   - 属性与方法分类
   
2. 什么是 Canvas 状态
   - 状态的组成部分
   - 可保存状态 vs 不可保存属性
   - 状态属性完整列表
   
3. 状态栈机制
   - save() 的作用
   - restore() 的作用
   - 栈操作可视化
   
4. 状态管理最佳实践
   - 配对使用模式
   - 封装复用技巧
   - 常见陷阱与避免
   
5. 状态重置方法
   - 重新获取 context
   - canvas.width 赋值技巧
   - 显式重置属性
   
6. 本章小结
```

### 代码示例

1. **Context 属性演示**（展示主要属性的效果）
2. **save/restore 配对使用**（标准模式）
3. **状态污染问题复现与解决**（对比示例）
4. **可复用的状态管理封装**（withState 高阶函数）

### 图表需求

- **状态栈示意图**：展示 save/restore 的栈操作过程
- **状态属性表格**：列出所有可保存的状态属性

## 5. 技术细节

### 实现要点

```javascript
// save/restore 标准使用模式
function drawWithStyle(ctx, drawFn) {
  ctx.save();
  try {
    drawFn(ctx);
  } finally {
    ctx.restore();
  }
}

// 可保存的状态属性列表
const SAVABLE_STATE = [
  'strokeStyle', 'fillStyle', 'globalAlpha',
  'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
  'lineDashOffset', 'shadowOffsetX', 'shadowOffsetY',
  'shadowBlur', 'shadowColor', 'globalCompositeOperation',
  'font', 'textAlign', 'textBaseline', 'direction',
  'imageSmoothingEnabled', 'imageSmoothingQuality',
  // 以及当前变换矩阵和裁剪区域
];

// 状态重置技巧
function resetCanvasState(canvas) {
  // 方法1：通过重设宽度触发重置
  canvas.width = canvas.width;
  
  // 方法2：获取新的 context 不会重置状态！
  // 同一个 canvas 的 getContext 返回同一个对象
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 样式"串味"到其他图形 | 使用 save/restore 隔离状态 |
| restore 调用过多导致错误 | 确保 save/restore 严格配对 |
| 想重置所有状态 | 使用 canvas.width = canvas.width |

## 6. 风格指导

### 语气语调
- 强调实践意义，多用实际场景说明
- 适当警告常见陷阱

### 类比方向
- 状态栈类比浏览器的撤销历史
- save/restore 类比 Git 的 stash/pop
- 状态隔离类比函数作用域

## 7. 与其他章节的关系

### 前置依赖
- 第1章：Canvas 概述与开发环境
- 第2章：Canvas 坐标系统

### 后续章节铺垫
- 为第11-14章"样式与视觉效果"铺垫样式属性基础
- 为第15-18章"变换"铺垫状态管理概念

## 8. 章节检查清单

- [ ] 目标明确：读者能正确管理 Canvas 状态
- [ ] 术语统一：状态、状态栈、上下文等术语定义清晰
- [ ] 最小实现：提供 withState 封装函数
- [ ] 边界处理：说明 save/restore 不配对的后果
- [ ] 性能与权衡：提及状态栈深度对性能的影响
- [ ] 图示与代码：状态栈图示与代码对应
- [ ] 总结与练习：提供状态管理的练习场景
