# 章节写作指导：路径系统：直线、曲线与贝塞尔

## 1. 章节信息

- **章节标题**: 路径系统：直线、曲线与贝塞尔
- **文件名**: drawing/path-system.md
- **所属部分**: 第二部分：图形绘制详解
- **预计阅读时间**: 35分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 Canvas 路径的概念和生命周期
- 掌握路径的开始、构建、闭合流程
- 理解贝塞尔曲线的数学原理（直观理解，非深入公式）
- 掌握二次和三次贝塞尔曲线的区别和应用场景

### 技能目标
- 能够使用 moveTo/lineTo 绑制折线和多边形
- 能够使用 quadraticCurveTo 绘制二次贝塞尔曲线
- 能够使用 bezierCurveTo 绘制三次贝塞尔曲线
- 能够绘制复杂的曲线路径

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **路径（Path）** | 解释路径是一系列相连或独立的子路径的集合 |
| **子路径（Subpath）** | 一个 moveTo 开始到下一个 moveTo 之前的连续绘制 |
| **当前点** | 路径绘制的当前位置，影响下一个绑制操作的起点 |
| **控制点** | 贝塞尔曲线中不在曲线上但决定曲线形状的点 |

### 关键知识点

- beginPath() 的作用：清除之前的路径
- moveTo(x, y)：移动画笔，开始新的子路径
- lineTo(x, y)：绘制直线到指定点
- closePath()：闭合当前子路径
- quadraticCurveTo(cpx, cpy, x, y)：二次贝塞尔曲线
- bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)：三次贝塞尔曲线

### 边界与限制

- 没有 beginPath 时的路径累积问题
- 空路径的 fill/stroke 行为
- 控制点对曲线形状的影响范围

## 4. 写作要求

### 开篇方式
引入一个问题：如何在 Canvas 上绘制一个心形或者自定义的复杂形状？这就需要理解 Canvas 的路径系统。路径就像是用隐形的笔在画布上规划形状，然后一次性填充或描边。

### 结构组织

```
1. 路径系统概述
   - 什么是路径
   - 路径的生命周期
   - beginPath 的重要性
   
2. 直线路径
   - moveTo 移动画笔
   - lineTo 绘制直线
   - 绘制折线
   - 绘制多边形
   
3. 路径闭合与填充规则
   - closePath 闭合路径
   - fill() 与 stroke() 的区别
   - 非零绑回规则预览
   
4. 二次贝塞尔曲线
   - 曲线原理（直观解释）
   - quadraticCurveTo 参数
   - 控制点的作用
   - 实际应用示例
   
5. 三次贝塞尔曲线
   - 与二次曲线的区别
   - bezierCurveTo 参数
   - 两个控制点的协同作用
   - 绘制平滑曲线
   
6. 曲线应用实践
   - 绘制心形
   - 绘制圆角矩形
   - 绘制波浪线
   
7. 本章小结
```

### 代码示例

1. **路径生命周期演示**（beginPath 重要性）
2. **绘制三角形和正多边形**
3. **二次贝塞尔曲线交互演示**（展示控制点效果）
4. **三次贝塞尔曲线绘制平滑曲线**
5. **绘制圆角矩形函数**
6. **绘制心形路径**

### 图表需求

- **路径生命周期图**：beginPath → 构建 → fill/stroke
- **二次贝塞尔曲线原理图**：起点、控制点、终点的关系
- **三次贝塞尔曲线原理图**：两个控制点的作用
- **常用曲线形状库**：展示不同控制点产生的曲线形状

## 5. 技术细节

### 实现要点

```javascript
// 路径绑制的标准模式
ctx.beginPath();
ctx.moveTo(50, 50);
ctx.lineTo(150, 50);
ctx.lineTo(100, 150);
ctx.closePath();
ctx.fill();

// 绘制正多边形
function drawPolygon(ctx, cx, cy, radius, sides) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

// 绘制圆角矩形
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// 二次贝塞尔曲线
ctx.beginPath();
ctx.moveTo(50, 200);
ctx.quadraticCurveTo(150, 50, 250, 200);  // 控制点在上方，形成拱形
ctx.stroke();

// 三次贝塞尔曲线
ctx.beginPath();
ctx.moveTo(50, 200);
ctx.bezierCurveTo(100, 50, 200, 350, 250, 200);  // S形曲线
ctx.stroke();
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 多次绑制重叠在一起 | 每次绑制前调用 beginPath() |
| 曲线形状与预期不符 | 使用可视化工具调试控制点位置 |
| closePath 与直接 lineTo 到起点的区别 | closePath 会正确连接线帽样式 |

## 6. 风格指导

### 语气语调
- 循序渐进，先直线后曲线
- 用交互式思维解释控制点

### 类比方向
- 路径类比"先构思再落笔"
- 控制点类比"橡皮筋"拉扯曲线
- beginPath 类比"翻到新的一页"

## 7. 与其他章节的关系

### 前置依赖
- 第5章：基础图形

### 后续章节铺垫
- 为第7章"路径高级操作与裁剪"提供路径基础
- 为第21章"点击检测"提供路径概念

## 8. 章节检查清单

- [ ] 目标明确：读者能使用路径绑制复杂形状
- [ ] 术语统一：路径、子路径、控制点等术语定义清晰
- [ ] 最小实现：提供圆角矩形、多边形等实用函数
- [ ] 边界处理：说明空路径和累积路径的问题
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：贝塞尔曲线原理图与代码对应
- [ ] 总结与练习：提供曲线绑制练习
