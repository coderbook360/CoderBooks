# 章节写作指导：路径高级操作与裁剪

## 1. 章节信息

- **章节标题**: 路径高级操作与裁剪
- **文件名**: drawing/path-advanced.md
- **所属部分**: 第二部分：图形绘制详解
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Path2D 对象的作用和优势
- 掌握路径的填充规则（非零绑回规则和奇偶规则）
- 理解裁剪区域的概念和工作原理
- 掌握 isPointInPath 和 isPointInStroke 的使用

### 技能目标
- 能够使用 Path2D 复用和组合路径
- 能够使用不同填充规则实现镂空效果
- 能够使用 clip() 创建裁剪遮罩
- 能够实现路径的点击检测

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **Path2D** | 可复用的路径对象，支持 SVG 路径语法 |
| **填充规则** | "nonzero"（非零绑回）和 "evenodd"（奇偶规则） |
| **裁剪区域** | 使用路径定义可见区域，路径外内容不可见 |
| **点击测试** | 判断点是否在路径内部或路径笔画上 |

### 关键知识点

- Path2D 构造方法：空构造、SVG 字符串、复制另一个 Path2D
- Path2D.addPath() 组合路径
- fill('evenodd') 实现镂空效果
- clip() 创建裁剪，与 save/restore 配合
- isPointInPath(x, y) 和 isPointInStroke(x, y)

### 边界与限制

- Path2D 的浏览器兼容性
- 裁剪区域只能缩小不能扩大
- 裁剪后无法还原（必须用 restore）
- isPointInPath 对变换的处理

## 4. 写作要求

### 开篇方式
提出一个实际问题：如何实现一个甜甜圈形状（圆环）？需要外圆填充，内圆镂空。这引出填充规则的概念。同时，如何限制绑制内容只在某个形状范围内可见？这引出裁剪的概念。

### 结构组织

```
1. Path2D 对象
   - 为什么需要 Path2D
   - 创建和使用 Path2D
   - SVG 路径语法支持
   - 路径组合：addPath
   
2. 填充规则详解
   - 非零绕回规则（nonzero）
   - 奇偶规则（evenodd）
   - 可视化解释两种规则
   - 实现镂空效果
   
3. 路径裁剪
   - clip() 基本用法
   - 裁剪与状态管理
   - 复杂裁剪形状
   - 裁剪的局限性
   
4. 路径点击测试
   - isPointInPath 原理
   - isPointInStroke 区别
   - 结合变换的处理
   - 性能考虑
   
5. 综合应用
   - 实现圆形头像裁剪
   - 实现聚光灯效果
   - 路径点击检测实践
   
6. 本章小结
```

### 代码示例

1. **Path2D 基本使用与复用**
2. **SVG 路径字符串转 Path2D**
3. **非零绕回 vs 奇偶规则对比**（绘制镂空圆环）
4. **图像裁剪为圆形**
5. **聚光灯遮罩效果**
6. **isPointInPath 点击检测**

### 图表需求

- **填充规则原理图**：展示两种规则的判断过程
- **裁剪效果图**：展示裁剪前后的对比
- **点击测试示意图**：展示点与路径的关系

## 5. 技术细节

### 实现要点

```javascript
// Path2D 基本使用
const path = new Path2D();
path.rect(10, 10, 100, 100);
path.arc(160, 60, 50, 0, Math.PI * 2);
ctx.fill(path);

// SVG 路径语法
const svgPath = new Path2D('M 10 10 L 100 10 L 100 100 Z');
ctx.stroke(svgPath);

// 镂空效果：奇偶规则
const ring = new Path2D();
ring.arc(100, 100, 80, 0, Math.PI * 2);  // 外圆
ring.arc(100, 100, 40, 0, Math.PI * 2);  // 内圆
ctx.fill(ring, 'evenodd');

// 裁剪区域
ctx.save();
ctx.beginPath();
ctx.arc(100, 100, 80, 0, Math.PI * 2);
ctx.clip();
// 之后的绑制只在圆形内可见
ctx.drawImage(image, 0, 0);
ctx.restore();

// 点击测试
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (ctx.isPointInPath(path, x, y)) {
    console.log('点击在路径内');
  }
});
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 裁剪后无法恢复 | 使用 save() 在裁剪前，restore() 恢复 |
| 镂空效果不生效 | 确保使用 'evenodd' 填充规则 |
| isPointInPath 在变换后不准 | 需要逆变换坐标或使用变换后的路径 |

## 6. 风格指导

### 语气语调
- 注重原理解释，特别是填充规则
- 使用可视化辅助理解

### 类比方向
- 填充规则类比"计数过边界"
- 裁剪类比"遮罩/蒙版"
- Path2D 类比"可复用的模板"

## 7. 与其他章节的关系

### 前置依赖
- 第6章：路径系统

### 后续章节铺垫
- 为第21章"点击检测"提供 isPointInPath 基础
- 为第39章"对象选择机制"提供理论基础

## 8. 章节检查清单

- [ ] 目标明确：读者掌握高级路径操作
- [ ] 术语统一：Path2D、填充规则、裁剪等术语定义清晰
- [ ] 最小实现：提供裁剪和点击测试的实用函数
- [ ] 边界处理：说明裁剪不可逆等限制
- [ ] 性能与权衡：提及 Path2D 复用的性能优势
- [ ] 图示与代码：填充规则图与代码对应
- [ ] 总结与练习：提供高级路径操作练习
