# 章节写作指导：Point 与 ObservablePoint

## 1. 章节信息

- **章节标题**: Point 与 ObservablePoint
- **文件名**: maths/point.md
- **所属部分**: 第十九部分：Maths 数学库
- **章节序号**: 111
- **预计阅读时间**: 20分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Point 类的设计
- 掌握 ObservablePoint 的作用
- 了解点与向量的运算
- 理解观察者模式的应用

### 技能目标
- 能够使用 Point 进行坐标操作
- 能够理解变化通知机制
- 能够实现向量运算

## 3. 内容要点

### 核心概念（必须全部讲解）
- **Point**: 二维点/向量
- **ObservablePoint**: 可观察的点
- **IPointData**: 点接口
- **变化回调**: 数据变化通知

### 关键知识点（必须全部覆盖）
- Point 类的属性和方法
- ObservablePoint 的设计
- 观察者模式的实现
- 常用运算方法
- copyFrom/copyTo
- equals 比较
- clone 克隆
- 在 Transform 中的应用

### 前置知识
- 基础数学知识

## 4. 写作要求

### 开篇方式
以"如何表示画布上的位置？"开篇，引出 Point 类。

### 结构组织
1. **引言**：坐标的需求
2. **Point 类**：基本使用
3. **ObservablePoint**：变化监听
4. **常用方法**：API 详解
5. **向量运算**：扩展应用
6. **实际应用**：使用场景
7. **小结**：Point 使用要点

### 代码示例
- Point 创建与使用
- ObservablePoint 回调
- 向量运算

### 图表需求
- **可选**：坐标系示意图

## 5. 技术细节

### 源码参考
- `packages/maths/src/point/Point.ts`
- `packages/maths/src/point/ObservablePoint.ts`

### 实现要点
- setter 拦截
- 回调调用
- 性能优化
- 类型定义

### 常见问题
- Q: Point 和 ObservablePoint 什么时候用？
  A: 需要监听变化用 ObservablePoint，否则用 Point
- Q: 为什么 position 改变后 Transform 会更新？
  A: 因为使用了 ObservablePoint

## 6. 风格指导

### 语气语调
- 基础概念视角
- 简单清晰
- 示例丰富

### 类比方向
- 将 Point 类比为"坐标"—— 表示位置
- 将 ObservablePoint 类比为"有传感器的坐标"—— 变化时会通知

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
- 无特定前置

### 后续章节
- 第112章：Matrix
- 第8章：Transform（相关）
