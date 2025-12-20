# 章节写作指导：GPUShader 着色器与 WGSL

## 1. 章节信息

- **章节标题**: GPUShader 着色器与 WGSL
- **文件名**: webgpu/gpu-shader.md
- **所属部分**: 第四部分：WebGPU 渲染器
- **章节序号**: 24
- **预计阅读时间**: 25分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 WGSL（WebGPU Shading Language）基础
- 掌握 GPUShaderModule 的创建
- 了解 WGSL 与 GLSL 的主要差异
- 理解着色器的编译与验证

### 技能目标
- 能够阅读和理解 WGSL 代码
- 能够创建着色器模块
- 能够调试着色器编译错误

## 3. 内容要点

### 核心概念（必须全部讲解）
- **WGSL**: WebGPU 专用着色语言
- **GPUShaderModule**: 着色器模块对象
- **Entry Point**: 入口点定义
- **Binding 布局**: 资源绑定声明

### 关键知识点（必须全部覆盖）
- WGSL 语法基础（类型、函数、结构）
- @vertex 和 @fragment 入口点
- @group 和 @binding 资源声明
- 与 GLSL 的语法对比
- 编译错误处理
- 着色器验证层

### 前置知识
- 第17章：WebGL 着色器
- 第31章会深入 GLSL→WGSL 转换
- 着色器编程基础

## 4. 写作要求

### 开篇方式
以"WGSL 是专为 WebGPU 设计的着色语言"开篇，说明为何不沿用 GLSL。

### 结构组织
1. **引言**：WGSL 的诞生背景
2. **WGSL 基础语法**：类型、函数、结构
3. **入口点与属性**：@vertex、@fragment
4. **资源绑定**：@group、@binding
5. **GPUShaderModule**：创建与使用
6. **GLSL vs WGSL**：主要差异对比
7. **小结**：WGSL 学习建议

### 代码示例
- 完整的顶点着色器 WGSL
- 完整的片段着色器 WGSL
- 着色器模块创建代码
- GLSL 与 WGSL 对照示例

### 图表需求
- **必须**：GLSL vs WGSL 语法对比表
- **可选**：着色器模块创建流程图

## 5. 技术细节

### 源码参考
- `packages/webgpu/src/shader/GpuShaderSystem.ts`
- `packages/webgpu/src/shader/utils/`
- PixiJS 内置 WGSL 着色器

### 实现要点
- WGSL 源码的字符串管理
- 编译错误的解析与报告
- 入口点的配置
- 与 GLSL 着色器的抽象统一

### 常见问题
- Q: 能直接用 GLSL 吗？
  A: WebGPU 原生只支持 WGSL，但 PixiJS 有转换机制
- Q: WGSL 编译错误如何调试？
  A: 查看浏览器控制台的错误信息，行号对应 WGSL 源码

## 6. 风格指导

### 语气语调
- 语言教程风格，循序渐进
- 大量代码示例
- 与 GLSL 对比帮助过渡

### 类比方向
- 将 WGSL 类比为"新方言"—— 与 GLSL 类似但有差异
- 将 @binding 类比为"端口号"—— 资源连接点

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
- 第17章：WebGL 着色器

### 后续章节
- 第28-32章：Shader 系统详解
- 第31章：GLSL→WGSL 转换
