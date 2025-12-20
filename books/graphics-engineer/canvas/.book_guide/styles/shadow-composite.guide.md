# 章节写作指导：阴影与合成操作

## 1. 章节信息

- **章节标题**: 阴影与合成操作
- **文件名**: styles/shadow-composite.md
- **所属部分**: 第三部分：样式与视觉效果
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 掌握 Canvas 阴影的四个属性
- 理解阴影与模糊效果的实现原理
- 掌握 globalCompositeOperation 的各种模式
- 理解合成操作在图形绘制中的应用

### 技能目标
- 能够为图形添加各种阴影效果
- 能够实现内阴影效果（变通方法）
- 能够使用合成模式实现遮罩、擦除等效果
- 能够选择正确的合成模式解决实际问题

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **shadowColor** | 阴影颜色，默认透明 |
| **shadowBlur** | 阴影模糊程度，值越大越模糊 |
| **shadowOffsetX/Y** | 阴影偏移量 |
| **globalCompositeOperation** | 定义新绘制内容如何与已有内容组合 |

### 关键知识点

- 阴影的四个属性及其默认值
- 阴影与透明度的结合
- 12 种以上的合成模式
- 常用合成模式：source-over, source-in, source-out, destination-over 等
- 合成模式的分类：源操作、目标操作、混合操作

### 边界与限制

- 阴影会显著影响性能
- 阴影只能外阴影，内阴影需要技巧
- 部分合成模式的浏览器兼容性
- 合成模式只影响之后的绘制

## 4. 写作要求

### 开篇方式
从视觉效果引入：阴影可以让平面图形产生立体感，而合成操作可以实现诸如遮罩、擦除、叠加等复杂效果。掌握这两个特性，可以大大丰富 Canvas 的表现力。

### 结构组织

```
1. 阴影效果
   - 阴影属性详解
   - 基本阴影效果
   - 阴影与颜色、透明度
   - 文本阴影
   
2. 阴影进阶
   - 多层阴影模拟（通过多次绘制）
   - 内阴影技巧
   - 阴影性能优化
   
3. 合成操作概述
   - globalCompositeOperation 的作用
   - 源与目标的概念
   - 模式分类
   
4. 常用合成模式
   - source-over（默认）
   - source-in / source-out
   - destination-over / destination-in
   - xor, lighter
   
5. 混合模式
   - multiply, screen
   - overlay, darken, lighten
   - difference, exclusion
   
6. 实践应用
   - 实现图像遮罩
   - 实现擦除效果
   - 实现发光效果
   
7. 本章小结
```

### 代码示例

1. **基本阴影效果**
2. **发光效果（阴影模拟）**
3. **内阴影模拟技巧**
4. **合成模式对比演示**
5. **图像遮罩效果**
6. **橡皮擦效果**

### 图表需求

- **阴影参数图**：展示阴影偏移和模糊的效果
- **合成模式对比表**：展示各种合成模式的效果
- **源与目标概念图**：解释 source 和 destination 的含义

## 5. 技术细节

### 实现要点

```javascript
// 基本阴影
ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
ctx.shadowBlur = 10;
ctx.shadowOffsetX = 5;
ctx.shadowOffsetY = 5;
ctx.fillRect(50, 50, 100, 100);

// 发光效果
ctx.shadowColor = '#00ff00';
ctx.shadowBlur = 20;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;
ctx.fillStyle = '#00ff00';
ctx.fillRect(50, 50, 100, 100);

// 清除阴影
ctx.shadowColor = 'transparent';
// 或
ctx.shadowBlur = 0;

// 合成模式：源在目标内部显示
ctx.globalCompositeOperation = 'source-in';

// 橡皮擦效果
ctx.globalCompositeOperation = 'destination-out';
ctx.beginPath();
ctx.arc(mouseX, mouseY, 20, 0, Math.PI * 2);
ctx.fill();
ctx.globalCompositeOperation = 'source-over';  // 恢复默认

// 图像遮罩效果
// 1. 先绘制遮罩形状
ctx.beginPath();
ctx.arc(100, 100, 80, 0, Math.PI * 2);
ctx.fill();
// 2. 设置合成模式
ctx.globalCompositeOperation = 'source-in';
// 3. 绘制图像
ctx.drawImage(img, 0, 0);
// 4. 恢复默认
ctx.globalCompositeOperation = 'source-over';
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 阴影影响所有后续绘制 | 绘制完成后重置阴影属性 |
| 合成模式影响所有后续绘制 | 使用 save/restore 或重置为 source-over |
| 内阴影无法直接实现 | 使用 clip 或合成模式模拟 |
| 合成模式效果不对 | 确认源和目标的绘制顺序 |

## 6. 风格指导

### 语气语调
- 效果导向，用实际效果展示概念
- 强调合成模式的分类和选择

### 类比方向
- 阴影类比"物体在光照下的投影"
- 合成模式类比"Photoshop 图层混合模式"
- source/destination 类比"新图层/底图"

## 7. 与其他章节的关系

### 前置依赖
- 第11章：填充与描边样式
- 第12章：渐变与图案

### 后续章节铺垫
- 为第14章"透明度与混合模式"提供合成操作基础

## 8. 章节检查清单

- [ ] 目标明确：读者能使用阴影和合成操作
- [ ] 术语统一：阴影、合成、源、目标等术语定义清晰
- [ ] 最小实现：提供常见效果的实现代码
- [ ] 边界处理：说明性能影响和状态重置
- [ ] 性能与权衡：强调阴影的性能影响
- [ ] 图示与代码：合成模式对比图与代码对应
- [ ] 总结与练习：提供效果实现练习
