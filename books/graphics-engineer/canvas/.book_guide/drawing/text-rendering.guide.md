# 章节写作指导：文本渲染与测量

## 1. 章节信息

- **章节标题**: 文本渲染与测量
- **文件名**: drawing/text-rendering.md
- **所属部分**: 第二部分：图形绘制详解
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 掌握 Canvas 文本渲染的方法和属性
- 理解文本对齐和基线的概念
- 掌握 measureText() 方法和 TextMetrics 对象
- 理解文本渲染的限制（不支持自动换行）

### 技能目标
- 能够在 Canvas 上绑制和描边文本
- 能够正确设置字体和样式
- 能够精确测量文本尺寸
- 能够实现文本居中和多行文本

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **fillText / strokeText** | 两种文本绘制方法及其差异 |
| **font 属性** | CSS 风格的字体设置语法 |
| **textAlign** | 水平对齐：start, end, left, right, center |
| **textBaseline** | 垂直基线：top, hanging, middle, alphabetic, ideographic, bottom |
| **TextMetrics** | 文本测量结果对象的各个属性 |

### 关键知识点

- font 属性的完整语法（必须包含字号和字体族）
- 对齐方式与坐标点的关系
- measureText() 返回的 TextMetrics 详解
- 最大宽度参数 maxWidth 的作用
- Canvas 不支持自动换行的处理方案

### 边界与限制

- 字体加载问题（自定义字体可能未加载完成）
- TextMetrics 部分属性的浏览器兼容性
- 文本渲染的抗锯齿无法控制
- 复杂排版（如从右到左语言）的限制

## 4. 写作要求

### 开篇方式
提出问题：如何在 Canvas 上精确地将一段文字放置在画布中央？看似简单，但需要理解文本对齐、基线和测量等多个概念。

### 结构组织

```
1. 文本绘制基础
   - fillText 和 strokeText
   - 坐标参数的含义
   - maxWidth 参数
   
2. 字体设置
   - font 属性语法
   - 必需和可选部分
   - 常见问题排查
   
3. 文本对齐
   - textAlign 水平对齐
   - textBaseline 垂直基线
   - 可视化理解对齐方式
   
4. 文本测量
   - measureText() 方法
   - TextMetrics 对象详解
   - 计算文本边界框
   
5. 高级应用
   - 文本居中绘制
   - 手动实现多行文本
   - 自动换行算法
   
6. 字体加载处理
   - 自定义字体问题
   - Font Loading API
   - 降级策略
   
7. 本章小结
```

### 代码示例

1. **基本文本绘制**（fillText 和 strokeText）
2. **字体设置的正确方式**
3. **文本对齐可视化**（展示不同对齐方式的效果）
4. **文本居中绘制函数**
5. **多行文本绘制函数**
6. **自动换行文本函数**

### 图表需求

- **文本对齐示意图**：展示不同 textAlign 值的效果
- **基线示意图**：展示不同 textBaseline 值的位置
- **TextMetrics 属性图**：展示各个测量值的含义

## 5. 技术细节

### 实现要点

```javascript
// 基本文本绘制
ctx.font = '24px Arial';
ctx.fillStyle = 'black';
ctx.fillText('Hello Canvas', 100, 100);

// 文本居中绘制
function drawCenteredText(ctx, text, x, y) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// 测量文本宽度
const text = 'Hello World';
const metrics = ctx.measureText(text);
console.log('文本宽度:', metrics.width);

// TextMetrics 完整信息（现代浏览器）
// metrics.width - 文本宽度
// metrics.actualBoundingBoxLeft - 左边界
// metrics.actualBoundingBoxRight - 右边界
// metrics.actualBoundingBoxAscent - 上边界（基线以上）
// metrics.actualBoundingBoxDescent - 下边界（基线以下）

// 计算文本完整高度
function getTextHeight(ctx, text) {
  const metrics = ctx.measureText(text);
  return metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
}

// 多行文本绘制
function drawMultilineText(ctx, text, x, y, lineHeight) {
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

// 自动换行
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  lines.push(currentLine);
  return lines;
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 字体设置不生效 | 确保包含字号和字体族，如 '16px Arial' |
| 自定义字体显示为默认字体 | 使用 Font Loading API 等待字体加载 |
| 文本位置不准确 | 检查 textAlign 和 textBaseline 设置 |
| measureText 返回的高度属性为 undefined | 检查浏览器兼容性，部分属性是新增的 |

## 6. 风格指导

### 语气语调
- 注重实践，提供可复用的工具函数
- 强调对齐和基线的可视化理解

### 类比方向
- textAlign 类比 CSS text-align
- textBaseline 类比文字在横线本上的书写位置
- measureText 类比获取文字的"边界框"

## 7. 与其他章节的关系

### 前置依赖
- 第3章：绑制上下文与状态管理

### 后续章节铺垫
- 为第34章"图形对象基类设计"中的文本对象提供基础
- 为编辑器中的文本编辑功能做铺垫

## 8. 章节检查清单

- [ ] 目标明确：读者能正确绑制和测量文本
- [ ] 术语统一：对齐、基线、TextMetrics 等术语定义清晰
- [ ] 最小实现：提供居中、多行、换行等实用函数
- [ ] 边界处理：说明字体加载问题和兼容性
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：对齐/基线图与代码对应
- [ ] 总结与练习：提供文本绘制练习
