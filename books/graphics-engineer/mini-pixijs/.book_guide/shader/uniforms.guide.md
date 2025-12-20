# 章节写作指导：Uniform 与 UniformGroup

## 1. 章节信息

- **章节标题**: Uniform 与 UniformGroup
- **文件名**: shader/uniforms.md
- **所属部分**: 第五部分：Shader 系统
- **章节序号**: 30
- **预计阅读时间**: 22分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 Uniform 在着色器中的作用
- 掌握 UniformGroup 的设计与实现
- 了解 Uniform 的自动同步机制
- 理解 UBO 与普通 Uniform 的统一抽象

### 技能目标
- 能够创建和使用 UniformGroup
- 能够理解 Uniform 数据的上传流程
- 能够优化 Uniform 更新性能

## 3. 内容要点

### 核心概念（必须全部讲解）
- **Uniform**: 着色器全局变量
- **UniformGroup**: Uniform 分组管理
- **UniformBuffer**: 对应 UBO/Uniform Block
- **自动同步**: JavaScript 对象到 GPU 的同步

### 关键知识点（必须全部覆盖）
- Uniform 类型与数据布局
- UniformGroup 的创建与配置
- 脏检查与增量更新
- WebGL uniform vs UBO
- WebGPU Uniform Buffer
- 纹理 Uniform 的特殊处理
- 动态 Uniform 与静态 Uniform

### 前置知识
- 第19章：WebGL UBO
- 第22章：WebGPU Buffer
- 第28-29章：Shader 基础

## 4. 写作要求

### 开篇方式
以"Uniform 是连接 JavaScript 和着色器的桥梁"开篇，说明 Uniform 的重要性。

### 结构组织
1. **引言**：Uniform 的作用与挑战
2. **UniformGroup 设计**：分组管理的动机
3. **数据类型与布局**：各类型的处理
4. **同步机制**：脏检查与上传
5. **WebGL 实现**：uniform/UBO 路径
6. **WebGPU 实现**：Uniform Buffer 路径
7. **小结**：Uniform 管理最佳实践

### 代码示例
- UniformGroup 创建与使用
- 自定义 Uniform 结构
- 动态更新 Uniform

### 图表需求
- **必须**：Uniform 同步流程图
- **必须**：UniformGroup 结构图
- **可选**：内存布局示意图

## 5. 技术细节

### 源码参考
- `packages/core/src/rendering/renderers/shared/shader/UniformGroup.ts`
- `packages/core/src/rendering/renderers/shared/shader/UniformBuffer.ts`
- `packages/webgl/src/shader/utils/generateUniformSync.ts`

### 实现要点
- UniformGroup 的数据结构
- 自动生成同步函数
- std140 布局的处理
- 脏标记的传播机制

### 常见问题
- Q: 为什么需要 UniformGroup 而不是单独的 Uniform？
  A: 分组可以利用 UBO 一次上传多个值，提高效率
- Q: Uniform 更新太慢怎么办？
  A: 减少更新频率，使用静态 UniformGroup

## 6. 风格指导

### 语气语调
- 深入实现，解释设计决策
- 用性能数据说明优化效果
- 提供实际应用建议

### 类比方向
- 将 UniformGroup 类比为"数据包"—— 打包发送效率更高
- 将脏检查类比为"版本号"—— 检测是否需要更新

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
- 第19章：WebGL UBO
- 第28-29章：Shader 基础

### 后续章节
- 第31章：GLSL→WGSL 转换
- 第89章：自定义滤镜
