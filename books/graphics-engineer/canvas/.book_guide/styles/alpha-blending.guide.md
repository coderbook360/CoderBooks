# 章节写作指导：透明度与混合模式

## 1. 章节信息

- **章节标题**: 透明度与混合模式
- **文件名**: styles/alpha-blending.md
- **所属部分**: 第三部分：样式与视觉效果
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Canvas 透明度的工作原理
- 掌握 globalAlpha 的使用
- 理解颜色的 Alpha 通道
- 掌握透明度与混合的数学计算

### 技能目标
- 能够控制全局和单独颜色的透明度
- 能够实现淡入淡出效果
- 能够理解透明度叠加的结果
- 能够调试透明度相关问题

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **globalAlpha** | 全局透明度，影响所有后续绑制操作，范围 0-1 |
| **Alpha 通道** | 颜色的第四个分量，表示透明度 |
| **Alpha 混合** | 半透明颜色与底色混合的计算方式 |
| **预乘 Alpha** | Premultiplied Alpha 的概念和影响 |

### 关键知识点

- globalAlpha 的默认值和范围
- rgba() 和 hsla() 中的 alpha 值
- globalAlpha 与颜色 alpha 的叠加
- Alpha 混合的数学公式
- clearRect 与透明度的关系

### 边界与限制

- globalAlpha 会影响所有绘制
- 多次半透明叠加的颜色变化
- 预乘 Alpha 在 ImageData 操作时的影响
- 透明度对性能的轻微影响

## 4. 写作要求

### 开篇方式
从实际需求引入：透明度是实现很多视觉效果的基础——从简单的半透明遮罩到复杂的淡入淡出动画。理解透明度的工作原理，才能正确地控制图形的显示效果。

### 结构组织

```
1. globalAlpha 属性
   - 基本用法
   - 影响范围
   - 与状态管理的配合
   
2. 颜色 Alpha 通道
   - rgba() 语法
   - hsla() 语法
   - globalAlpha vs 颜色 alpha
   
3. Alpha 混合原理
   - 混合公式
   - 多层叠加计算
   - 可视化理解
   
4. 透明度应用
   - 半透明遮罩
   - 淡入淡出动画
   - 水印效果
   
5. 预乘 Alpha
   - 什么是预乘 Alpha
   - 对像素操作的影响
   - 处理策略
   
6. 本章小结
```

### 代码示例

1. **globalAlpha 基本使用**
2. **颜色 alpha 与 globalAlpha 对比**
3. **Alpha 混合可视化演示**
4. **淡入淡出动画效果**
5. **半透明遮罩层**
6. **水印叠加效果**

### 图表需求

- **Alpha 混合示意图**：展示两个半透明颜色叠加的结果
- **透明度叠加计算表**：展示多层叠加的数值变化

## 5. 技术细节

### 实现要点

```javascript
// globalAlpha 基本使用
ctx.globalAlpha = 0.5;  // 50% 透明度
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 100, 100);
ctx.globalAlpha = 1;  // 恢复不透明

// 颜色 alpha
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';  // 半透明红色
ctx.fillStyle = 'hsla(0, 100%, 50%, 0.5)';  // 同上，HSL 格式

// globalAlpha 和颜色 alpha 叠加
ctx.globalAlpha = 0.5;
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
// 实际透明度 = 0.5 * 0.5 = 0.25

// Alpha 混合公式
// resultColor = srcColor * srcAlpha + dstColor * (1 - srcAlpha)
// resultAlpha = srcAlpha + dstAlpha * (1 - srcAlpha)

// 淡入效果
let opacity = 0;
function fadeIn() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, 0, 0);
  opacity += 0.02;
  if (opacity < 1) {
    requestAnimationFrame(fadeIn);
  } else {
    ctx.globalAlpha = 1;
  }
}

// 半透明遮罩
function drawOverlay(alpha = 0.5) {
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// 水印效果
function addWatermark(text, alpha = 0.3) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '48px Arial';
  ctx.fillStyle = 'gray';
  ctx.textAlign = 'center';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 全局透明度影响了后续绑制 | 使用 save/restore 或显式重置为 1 |
| 多次叠加后颜色变深/变浅 | 理解 Alpha 混合公式，累积效应正常 |
| 像素操作后透明区域颜色异常 | 考虑预乘 Alpha 的影响 |
| 透明度设置没效果 | 检查值是否在 0-1 范围，是否被后续设置覆盖 |

## 6. 风格指导

### 语气语调
- 从直观效果入手，逐步深入原理
- 适当涉及数学公式但不过于复杂

### 类比方向
- Alpha 混合类比"透过有色玻璃看东西"
- globalAlpha 类比"调暗整个图层"
- 预乘 Alpha 类比"预先计算好的混合结果"

## 7. 与其他章节的关系

### 前置依赖
- 第4章：像素操作
- 第13章：阴影与合成操作

### 后续章节铺垫
- 为动画章节中的淡入淡出效果提供基础

## 8. 章节检查清单

- [ ] 目标明确：读者理解并能控制透明度
- [ ] 术语统一：透明度、Alpha 通道、混合等术语定义清晰
- [ ] 最小实现：提供透明度控制和动画代码
- [ ] 边界处理：说明 globalAlpha 的状态管理
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：混合示意图与公式对应
- [ ] 总结与练习：提供透明度效果练习
