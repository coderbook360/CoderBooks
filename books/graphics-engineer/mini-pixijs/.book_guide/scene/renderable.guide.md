# 章节写作指导：Renderable 可渲染对象

## 1. 章节信息

- **章节标题**: Renderable 可渲染对象
- **文件名**: scene/renderable.md
- **所属部分**: 第六部分：场景图核心
- **章节序号**: 37
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Renderable 接口的设计
- 掌握可渲染对象的核心属性
- 了解渲染指令生成机制
- 理解 RenderPipe 与 Renderable 的关系

### 技能目标
- 能够理解任何可渲染对象的共同特性
- 能够创建自定义可渲染对象
- 能够优化渲染对象的性能

## 3. 内容要点

### 核心概念（必须全部讲解）
- **Renderable 接口**: 可渲染对象的契约
- **renderPipeId**: 指定使用的 RenderPipe
- **batched/batchable**: 批处理支持
- **渲染指令生成**: Renderable → Instruction

### 关键知识点（必须全部覆盖）
- Renderable 接口的必需属性
- renderPipeId 的作用与选择
- 批处理标志的影响
- 渲染优先级与顺序
- worldTransform 的获取
- 边界信息的提供
- 可见性判断

### 前置知识
- 第33-36章：场景图基础
- 第10章：渲染指令

## 4. 写作要求

### 开篇方式
以"Renderable 定义了'什么可以被渲染'"开篇，说明接口的核心作用。

### 结构组织
1. **引言**：Renderable 的定位
2. **接口定义**：核心属性与方法
3. **RenderPipe 关联**：如何选择渲染管线
4. **批处理支持**：batchable 标志
5. **渲染数据**：Transform、Bounds 等
6. **创建自定义 Renderable**：实现步骤
7. **小结**：Renderable 接口设计

### 代码示例
- Renderable 接口定义
- 典型 Renderable 实现
- 自定义 Renderable 示例

### 图表需求
- **必须**：Renderable 接口结构图
- **必须**：Renderable → RenderPipe → Instruction 流程图

## 5. 技术细节

### 源码参考
- `packages/scene/src/Renderable.ts`
- `packages/core/src/rendering/renderers/shared/RenderPipe.ts`
- 各具体 Renderable 实现

### 实现要点
- renderPipeId 的注册机制
- 批处理对象的特殊处理
- 世界变换的计算时机
- 边界的懒计算

### 常见问题
- Q: 如何让自定义对象可以被渲染？
  A: 实现 Renderable 接口并注册对应的 RenderPipe
- Q: 所有 Container 都是 Renderable 吗？
  A: Container 实现了 Renderable 接口，但可能没有可视内容

## 6. 风格指导

### 语气语调
- 接口设计视角
- 强调契约与实现
- 提供扩展指南

### 类比方向
- 将 Renderable 类比为"契约"—— 约定渲染所需的信息
- 将 RenderPipe 类比为"处理器"—— 根据类型处理

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
- 第33-36章：场景图基础
- 第10章：渲染指令

### 后续章节
- 具体渲染对象章节（Sprite、Graphics、Mesh、Text）
