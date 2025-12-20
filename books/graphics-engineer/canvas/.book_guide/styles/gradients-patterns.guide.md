# 章节写作指导：渐变与图案

## 1. 章节信息

- **章节标题**: 渐变与图案
- **文件名**: styles/gradients-patterns.md
- **所属部分**: 第三部分：样式与视觉效果
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 掌握线性渐变的创建和使用
- 掌握径向渐变的创建和使用
- 理解渐变的坐标系统和作用范围
- 掌握图案填充的创建和使用

### 技能目标
- 能够创建多色渐变效果
- 能够实现圆形、椭圆形渐变
- 能够使用图像、Canvas 创建图案
- 能够控制图案的重复方式

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **CanvasGradient** | 渐变对象，可用作 fillStyle 或 strokeStyle |
| **线性渐变** | createLinearGradient(x0, y0, x1, y1) 沿直线方向变化 |
| **径向渐变** | createRadialGradient(x0, y0, r0, x1, y1, r1) 沿圆形方向变化 |
| **色标 (Color Stop)** | addColorStop(offset, color) 定义渐变的颜色位置 |
| **CanvasPattern** | 图案对象，用于重复填充 |

### 关键知识点

- 线性渐变的起点和终点定义渐变方向
- 径向渐变的两个圆定义渐变范围
- 色标位置 offset 范围 0-1
- 图案重复模式：repeat, repeat-x, repeat-y, no-repeat
- 渐变坐标是相对于 Canvas 坐标系的

### 边界与限制

- 渐变坐标不随图形移动
- 相同的渐变对象可以复用
- 图案源必须已加载完成
- 图案与跨域图像的安全限制

## 4. 写作要求

### 开篇方式
从视觉效果引入：纯色填充有时过于单调，渐变和图案可以让图形更加丰富多彩。本章介绍如何创建和使用 Canvas 的渐变和图案填充。

### 结构组织

```
1. 线性渐变
   - createLinearGradient 语法
   - 渐变方向控制
   - 添加色标
   - 多色渐变
   
2. 径向渐变
   - createRadialGradient 语法
   - 两个圆的含义
   - 创建聚光灯效果
   - 创建球体立体感
   
3. 渐变坐标系统
   - 渐变坐标与 Canvas 坐标
   - 渐变与图形位置的关系
   - 动态渐变效果
   
4. 图案填充
   - createPattern 语法
   - 重复模式
   - 使用图像作为图案
   - 使用 Canvas 作为图案
   
5. 实践应用
   - 按钮光泽效果
   - 进度条渐变
   - 网格背景图案
   
6. 本章小结
```

### 代码示例

1. **水平/垂直/对角线性渐变**
2. **多色彩虹渐变**
3. **径向渐变实现立体球**
4. **图像图案填充**
5. **Canvas 动态生成图案**
6. **按钮光泽效果**

### 图表需求

- **线性渐变方向图**：展示不同起点终点的渐变效果
- **径向渐变原理图**：展示两个圆如何定义渐变
- **图案重复模式图**：展示四种重复模式的效果

## 5. 技术细节

### 实现要点

```javascript
// 线性渐变
const linearGradient = ctx.createLinearGradient(0, 0, 200, 0);  // 水平渐变
linearGradient.addColorStop(0, 'red');
linearGradient.addColorStop(0.5, 'yellow');
linearGradient.addColorStop(1, 'blue');
ctx.fillStyle = linearGradient;
ctx.fillRect(0, 0, 200, 100);

// 径向渐变（立体球效果）
const radialGradient = ctx.createRadialGradient(
  75, 50, 5,   // 内圆（高光位置）
  90, 60, 100  // 外圆（球体范围）
);
radialGradient.addColorStop(0, 'white');
radialGradient.addColorStop(0.3, '#ff6666');
radialGradient.addColorStop(1, '#990000');
ctx.fillStyle = radialGradient;
ctx.beginPath();
ctx.arc(100, 100, 80, 0, Math.PI * 2);
ctx.fill();

// 图像图案
const img = new Image();
img.onload = () => {
  const pattern = ctx.createPattern(img, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, 400, 400);
};
img.src = 'texture.png';

// Canvas 作为图案源（网格背景）
function createGridPattern(size, color) {
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = size;
  patternCanvas.height = size;
  const pctx = patternCanvas.getContext('2d');
  
  pctx.strokeStyle = color;
  pctx.beginPath();
  pctx.moveTo(size, 0);
  pctx.lineTo(size, size);
  pctx.lineTo(0, size);
  pctx.stroke();
  
  return ctx.createPattern(patternCanvas, 'repeat');
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 渐变位置与图形不匹配 | 渐变坐标相对于 Canvas，需要与图形位置对应 |
| 图案不显示 | 确保图像已加载完成 |
| 径向渐变效果不对 | 检查两个圆的参数，特别是半径 |
| 图案在高 DPI 屏幕模糊 | 使用高分辨率图案源 |

## 6. 风格指导

### 语气语调
- 注重可视化效果展示
- 强调参数与效果的对应关系

### 类比方向
- 线性渐变类比"从一端涂到另一端"
- 径向渐变类比"从中心向外扩散"
- 图案类比"壁纸平铺"

## 7. 与其他章节的关系

### 前置依赖
- 第11章：填充与描边样式

### 后续章节铺垫
- 为第35章"属性系统"中的渐变属性提供基础

## 8. 章节检查清单

- [ ] 目标明确：读者能创建和使用渐变与图案
- [ ] 术语统一：渐变、色标、图案等术语定义清晰
- [ ] 最小实现：提供各种渐变和图案的示例代码
- [ ] 边界处理：说明坐标系统和跨域问题
- [ ] 性能与权衡：提及渐变对象可复用
- [ ] 图示与代码：效果图与代码对应
- [ ] 总结与练习：提供渐变图案创作练习
