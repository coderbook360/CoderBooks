# 章节写作指导：Anchor 与 Pivot

## 1. 章节信息

- **章节标题**: Anchor 与 Pivot
- **文件名**: sprite/anchor-pivot.md
- **所属部分**: 第十部分：Sprite 精灵系统
- **章节序号**: 55
- **预计阅读时间**: 18分钟
- **难度等级**: 初级

## 2. 学习目标

### 知识目标
- 理解 Anchor 和 Pivot 的概念与区别
- 掌握 Anchor 对 Sprite 位置和旋转的影响
- 了解 Pivot 在 Container 中的作用
- 理解两者在变换计算中的位置

### 技能目标
- 能够正确设置 Anchor 实现居中定位
- 能够使用 Pivot 控制旋转中心
- 能够区分何时使用 Anchor 何时使用 Pivot

## 3. 内容要点

### 核心概念（必须全部讲解）
- **Anchor**: 锚点，Sprite 特有的定位属性
- **Pivot**: 轴心点，Container 的变换中心
- **坐标系**: 两者在不同坐标系中的作用

### 关键知识点（必须全部覆盖）
- Anchor 的取值范围（0-1 相对坐标）
- Anchor 如何影响 Sprite 位置
- Anchor 与旋转、缩放的关系
- Pivot 的绝对坐标性质
- Pivot 与 position 的关系
- Anchor vs Pivot 的选择场景

### 前置知识
- 第54章：Sprite 核心实现
- 第38章：Transform 变换系统

## 4. 写作要求

### 开篇方式
以"如何让精灵以中心点旋转而不是左上角？"的实际问题开篇。

### 结构组织
1. **引言**：旋转中心的问题
2. **Anchor 详解**：概念与用法
3. **Pivot 详解**：概念与用法
4. **对比分析**：两者的区别
5. **实践应用**：常见场景选择
6. **小结**：要点回顾

### 代码示例
- 设置 Anchor 居中
- 使用 Pivot 控制旋转
- 对比示例

### 图表需求
- **必须**：Anchor 效果对比图
- **必须**：Pivot 效果对比图
- **可选**：两者差异示意图

## 5. 技术细节

### 源码参考
- `packages/scene/src/sprite/Sprite.ts`
- `packages/scene/src/container/Container.ts`

### 实现要点
- ObservablePoint 的使用
- 变换矩阵中的应用
- 边界计算的影响

### 常见问题
- Q: Anchor 和 Pivot 有什么区别？
  A: Anchor 是相对坐标(0-1)，Pivot 是绝对坐标(像素)
- Q: 为什么我设置了 Anchor 位置变了？
  A: Anchor 会影响定位原点，需要相应调整 position

## 6. 风格指导

### 语气语调
- 对比清晰
- 示例丰富
- 注重实用

### 类比方向
- 将 Anchor 类比为"图钉的位置"
- 将 Pivot 类比为"旋转轴心"

## 7. 章节检查清单

- [ ] 清晰解释了 Anchor 的概念
- [ ] 清晰解释了 Pivot 的概念
- [ ] 明确对比了两者区别
- [ ] 提供了实用的选择建议
- [ ] 代码示例可运行
