# 章节写作指导：变换堆栈与状态保存

## 1. 章节信息

- **章节标题**: 变换堆栈与状态保存
- **文件名**: transforms/transform-stack.md
- **所属部分**: 第四部分：坐标变换与矩阵
- **预计阅读时间**: 25分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解变换状态与 save/restore 的关系
- 掌握变换堆栈的工作原理
- 理解层级变换的概念
- 掌握局部坐标系与全局坐标系的转换

### 技能目标
- 能够正确管理复杂的变换嵌套
- 能够实现层级对象的变换
- 能够设计可维护的变换管理模式
- 能够调试变换状态问题

## 3. 内容要点

### 核心概念

| 概念 | 解释要求 |
|------|---------|
| **变换状态** | 当前变换矩阵是 Canvas 状态的一部分 |
| **变换堆栈** | save/restore 管理的变换历史 |
| **层级变换** | 父子对象的变换继承关系 |
| **局部坐标系** | 相对于父对象的坐标系统 |

### 关键知识点

- save() 保存当前变换矩阵
- restore() 恢复上一次保存的变换
- 嵌套变换的累积效果
- 层级结构中的变换传递
- 场景图中的变换管理

### 边界与限制

- save/restore 必须配对
- 堆栈深度有限制（虽然很大）
- restore 多于 save 会出错

## 4. 写作要求

### 开篇方式
从场景图概念引入：在复杂的图形应用中，对象往往有层级关系，如机器人的手臂由肩、肘、腕组成。父对象移动时，子对象要跟随移动。这就是层级变换的典型场景。

### 结构组织

```
1. 变换与状态管理
   - 变换是状态的一部分
   - save/restore 的双重作用
   - 变换隔离的重要性
   
2. 变换堆栈
   - 堆栈工作原理
   - 嵌套变换示例
   - 堆栈可视化
   
3. 层级变换
   - 父子对象关系
   - 变换继承
   - 场景图基础概念
   
4. 局部与全局坐标系
   - 局部坐标系定义
   - 坐标系转换
   - 实际应用
   
5. 变换管理模式
   - 封装变换操作
   - 可复用的变换模式
   - 调试技巧
   
6. 实践应用
   - 绘制层级机器人
   - 绘制时钟（时分秒针层级）
   - 变换调试工具
   
7. 本章小结
```

### 代码示例

1. **变换隔离基本模式**
2. **嵌套变换示例**
3. **层级对象绘制（机器人手臂）**
4. **时钟绘制（时分秒针）**
5. **变换状态调试工具**

### 图表需求

- **变换堆栈示意图**：展示 save/restore 的堆栈操作
- **层级变换示意图**：展示父子对象的变换关系
- **机器人手臂层级图**：展示肩-肘-腕的变换继承

## 5. 技术细节

### 实现要点

```javascript
// 变换隔离基本模式
function drawWithTransform(ctx, x, y, angle, scale, drawFn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  drawFn(ctx);
  ctx.restore();
}

// 嵌套变换示例
ctx.save();
ctx.translate(100, 100);  // 移动到位置 1
ctx.rotate(Math.PI / 4);  // 旋转 45 度

  ctx.save();
  ctx.translate(50, 0);   // 相对位置 1 再移动
  ctx.rotate(Math.PI / 4); // 再旋转 45 度
  ctx.fillRect(-10, -10, 20, 20);  // 绘制
  ctx.restore();
  
ctx.fillRect(-10, -10, 20, 20);  // 绘制位置 1 的方块
ctx.restore();

// 层级对象：机器人手臂
class Arm {
  constructor() {
    this.shoulderAngle = 0;
    this.elbowAngle = 0;
    this.wristAngle = 0;
    this.upperArmLength = 60;
    this.lowerArmLength = 50;
    this.handLength = 20;
  }
  
  draw(ctx) {
    ctx.save();
    
    // 肩部（上臂）
    ctx.rotate(this.shoulderAngle);
    this.drawSegment(ctx, this.upperArmLength, 'blue');
    ctx.translate(this.upperArmLength, 0);
    
    // 肘部（下臂）
    ctx.rotate(this.elbowAngle);
    this.drawSegment(ctx, this.lowerArmLength, 'green');
    ctx.translate(this.lowerArmLength, 0);
    
    // 腕部（手）
    ctx.rotate(this.wristAngle);
    this.drawSegment(ctx, this.handLength, 'red');
    
    ctx.restore();
  }
  
  drawSegment(ctx, length, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, -5, length, 10);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 时钟绘制
function drawClock(ctx, cx, cy, radius) {
  const now = new Date();
  
  ctx.save();
  ctx.translate(cx, cy);
  
  // 表盘
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  // 时针
  ctx.save();
  const hours = now.getHours() % 12 + now.getMinutes() / 60;
  ctx.rotate(hours * (Math.PI / 6) - Math.PI / 2);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius * 0.5, 0);
  ctx.stroke();
  ctx.restore();
  
  // 分针
  ctx.save();
  const minutes = now.getMinutes() + now.getSeconds() / 60;
  ctx.rotate(minutes * (Math.PI / 30) - Math.PI / 2);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius * 0.7, 0);
  ctx.stroke();
  ctx.restore();
  
  // 秒针
  ctx.save();
  ctx.rotate(now.getSeconds() * (Math.PI / 30) - Math.PI / 2);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(radius * 0.8, 0);
  ctx.stroke();
  ctx.restore();
  
  ctx.restore();
}
```

### 常见问题

| 问题 | 解决方案 |
|------|---------|
| 变换影响了其他对象 | 确保 save/restore 配对 |
| 层级变换位置不对 | 检查变换顺序和参数 |
| 子对象不随父对象移动 | 确保在父变换内部绑制子对象 |
| 调试复杂变换困难 | 使用 getTransform 打印当前矩阵 |

## 6. 风格指导

### 语气语调
- 用具体的可视化例子说明抽象概念
- 强调层级结构的实用性

### 类比方向
- 变换堆栈类比"撤销历史"
- 层级变换类比"相对位置"
- 局部坐标系类比"我的左边 vs 地图的北边"

## 7. 与其他章节的关系

### 前置依赖
- 第3章：绘制上下文与状态管理
- 第15章：变换基础

### 后续章节铺垫
- 为第35章"对象集合与容器"中的分组功能提供变换基础

## 8. 章节检查清单

- [ ] 目标明确：读者能管理复杂的变换嵌套
- [ ] 术语统一：变换堆栈、层级变换等术语定义清晰
- [ ] 最小实现：提供层级绘制的代码模式
- [ ] 边界处理：说明 save/restore 配对问题
- [ ] 性能与权衡：无特殊性能考虑
- [ ] 图示与代码：层级变换图与代码对应
- [ ] 总结与练习：提供层级绘制练习
