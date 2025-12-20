# 章节写作指导：Stencil 模板遮罩

## 1. 章节信息

- **章节标题**: Stencil 模板遮罩
- **文件名**: mask/stencil.md
- **所属部分**: 第八部分：Culling 与 Mask
- **章节序号**: 46
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Stencil Buffer 的工作原理
- 掌握 Stencil 遮罩的实现机制
- 了解 Stencil 操作与测试
- 理解嵌套 Stencil 遮罩的处理

### 技能目标
- 能够使用 Stencil 遮罩
- 能够理解 Stencil 的渲染流程
- 能够调试 Stencil 相关问题

## 3. 内容要点

### 核心概念（必须全部讲解）
- **Stencil Buffer**: 模板缓冲区
- **Stencil Test**: 模板测试
- **Stencil Operation**: 模板操作（pass、fail）
- **Reference Value**: 引用值

### 关键知识点（必须全部覆盖）
- Stencil Buffer 的原理
- WebGL Stencil 状态配置
- Stencil 遮罩的渲染流程
- 嵌套遮罩的引用值递增
- Stencil 遮罩的限制
- 与其他遮罩类型的对比
- 性能特点

### 前置知识
- 第45章：遮罩系统概览
- 第13章：WebGL 状态机

## 4. 写作要求

### 开篇方式
以"Stencil Buffer 是 GPU 的'印章'"开篇，用类比说明 Stencil 的工作方式。

### 结构组织
1. **引言**：Stencil Buffer 概念
2. **工作原理**：测试与操作
3. **遮罩实现**：push 与 pop 流程
4. **嵌套处理**：引用值管理
5. **WebGL 配置**：Stencil 状态
6. **限制与性能**：使用注意事项
7. **小结**：Stencil 遮罩要点

### 代码示例
- Stencil 状态配置
- 遮罩 push/pop 逻辑
- WebGL API 调用

### 图表需求
- **必须**：Stencil 遮罩渲染流程图
- **必须**：嵌套遮罩引用值示意
- **可选**：Stencil 操作效果图

## 5. 技术细节

### 源码参考
- `packages/core/src/mask/StencilSystem.ts`
- `packages/webgl/src/state/GlStencilSystem.ts`

### 实现要点
- stencilFunc 和 stencilOp 的配置
- 引用值的递增与递减
- 遮罩栈的管理
- clear stencil 的时机

### 常见问题
- Q: Stencil 遮罩最多能嵌套几层？
  A: 受 Stencil Buffer 位深限制，通常 8 位即 255 层
- Q: 为什么 Stencil 遮罩边缘是硬的？
  A: Stencil 是按像素通过/不通过判断，没有过渡

## 6. 风格指导

### 语气语调
- 深入 GPU 原理
- 结合 WebGL API 说明
- 提供调试技巧

### 类比方向
- 将 Stencil 类比为"印章"—— 盖过的地方才显示
- 将引用值类比为"楼层"—— 嵌套层级

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
- 第45章：遮罩系统

### 后续章节
- 第47章：Alpha 与 Color 遮罩
