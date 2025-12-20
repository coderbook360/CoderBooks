# 章节写作指导：填充与描边样式

## 1. 章节信息

- **章节标题**: 填充与描边样式
- **文件名**: styles/fill-stroke.md
- **所属部分**: 第三部分：样式与视觉效果
- **预计阅读时间**: 25分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 掌握 fillStyle 和 strokeStyle 的各种值类型
- 理解描边线条的属性：宽度、端点、连接
- 掌握虚线的绘制方法
- 理解描边与填充的渲染顺序

### 技能目标
- 能够设置纯色、渐变、图案填充
- 能够控制线条样式（宽度、端点、连接方式）
- 能够绘制各种虚线样式
- 能够实现复杂的描边效果

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **fillStyle** | 填充样式：可以是颜色字符串、渐变对象或图案对象 |
| **strokeStyle** | 描边样式：同上 |
| **lineWidth** | 描边线宽，默认值为 1 |
| **lineCap** | 线条端点样式：butt, round, square |
| **lineJoin** | 线条连接样式：miter, round, bevel |
| **miterLimit** | 斜接限制，防止尖角过长 |

### 关键知识点

- 颜色值的多种表示：颜色名、#hex、rgb()、rgba()、hsl()
- lineWidth 与像素对齐的关系
- 三种 lineCap 的可视化区别
- 三种 lineJoin 的可视化区别
- setLineDash() 和 lineDashOffset 的使用
- getLineDash() 获取当前虚线样式

### 边界与限制

- lineWidth 为 0 时不绘制
- 非常细的线条在某些显示器上可能不可见
- 虚线模式的性能影响

## 4. 写作要求

### 开篇方式
从视觉效果出发：一个好看的图形不仅需要正确的形状，还需要合适的颜色和线条样式。本章将详细介绍如何控制 Canvas 的填充和描边样式。

### 结构组织

```
1. 颜色设置
   - 颜色值的多种格式
   - fillStyle 基本用法
   - strokeStyle 基本用法
   
2. 线条宽度
   - lineWidth 属性
   - 与像素对齐的关系
   - 奇数与偶数宽度的区别
   
3. 线条端点
   - lineCap 三种类型
   - 可视化对比
   - 应用场景
   
4. 线条连接
   - lineJoin 三种类型
   - miterLimit 的作用
   - 可视化对比
   
5. 虚线绘制
   - setLineDash() 语法
   - 虚线模式解析
   - lineDashOffset 动画效果
   
6. 填充与描边顺序
   - 先填充后描边的原因
   - 描边覆盖问题
   
7. 本章小结
```

### 代码示例

1. **各种颜色格式演示**
2. **lineCap 三种类型对比**
3. **lineJoin 三种类型对比**
4. **各种虚线模式**
5. **虚线动画（蚂蚁线效果）**
6. **填充+描边组合效果**

### 图表需求

- **lineCap 对比图**：展示 butt、round、square 的区别
- **lineJoin 对比图**：展示 miter、round、bevel 的区别
- **虚线模式图**：展示不同 setLineDash 参数的效果

## 5. 技术细节

### 实现要点

```javascript
// 颜色设置
ctx.fillStyle = 'red';
ctx.fillStyle = '#ff0000';
ctx.fillStyle = 'rgb(255, 0, 0)';
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
ctx.fillStyle = 'hsl(0, 100%, 50%)';

// 线条宽度与像素对齐
ctx.lineWidth = 1;
// 为了清晰的 1px 线条，使用 0.5 像素偏移
ctx.beginPath();
ctx.moveTo(100.5, 50.5);
ctx.lineTo(100.5, 150.5);
ctx.stroke();

// 线条端点
ctx.lineCap = 'round';  // butt, round, square

// 线条连接
ctx.lineJoin = 'round';  // miter, round, bevel
ctx.miterLimit = 10;  // 默认值

// 虚线
ctx.setLineDash([10, 5]);  // 10px 实线，5px 空白
ctx.setLineDash([10, 5, 2, 5]);  // 交替模式
ctx.lineDashOffset = 0;  // 偏移量，可用于动画

// 虚线动画（蚂蚁线效果）
let offset = 0;
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setLineDash([4, 2]);
  ctx.lineDashOffset = -offset;
  ctx.strokeRect(10, 10, 100, 100);
  offset = (offset + 1) % 6;
  requestAnimationFrame(animate);
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 1px 线条模糊 | 使用 0.5 像素偏移 |
| 尖角连接处出现异常尖刺 | 调整 miterLimit 或使用 round/bevel |
| 虚线不显示 | 检查 setLineDash 参数是否正确 |
| 填充覆盖了描边 | 先调用 fill() 再调用 stroke() |

## 6. 风格指导

### 语气语调
- 可视化导向，用图示说明抽象概念
- 强调实际效果对比

### 类比方向
- lineCap 类比"笔尖的形状"
- lineJoin 类比"两根木条的连接方式"
- 虚线类比"剪切线"

## 7. 与其他章节的关系

### 前置依赖
- 第5章：基础图形
- 第6章：路径系统

### 后续章节铺垫
- 为第12章"渐变与图案"提供 fillStyle/strokeStyle 基础

## 8. 章节检查清单

- [ ] 目标明确：读者能控制填充和描边的各种样式
- [ ] 术语统一：fillStyle、strokeStyle、lineCap 等术语定义清晰
- [ ] 最小实现：提供各种样式的演示代码
- [ ] 边界处理：说明像素对齐和 miterLimit 问题
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：样式对比图与代码对应
- [ ] 总结与练习：提供样式组合练习
