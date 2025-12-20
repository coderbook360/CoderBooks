# 章节写作指导：GPURenderTarget 渲染目标

## 1. 章节信息

- **章节标题**: GPURenderTarget 渲染目标
- **文件名**: webgpu/gpu-render-target.md
- **所属部分**: 第四部分：WebGPU 渲染器
- **章节序号**: 26
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 WebGPU 渲染目标的实现方式
- 掌握 Render Pass 的 color/depth attachment 配置
- 了解 Canvas 配置与 getCurrentTexture
- 理解 Load/Store 操作语义

### 技能目标
- 能够配置渲染目标
- 能够实现渲染到纹理
- 能够优化渲染目标操作

## 3. 内容要点

### 核心概念（必须全部讲解）
- **GPURenderPassDescriptor**: 渲染通道描述符
- **Color Attachment**: 颜色附件配置
- **Depth/Stencil Attachment**: 深度/模板附件
- **Load/Store Op**: 加载和存储操作
- **Canvas 配置**: configure() 与 getCurrentTexture()

### 关键知识点（必须全部覆盖）
- Render Pass 的开始与结束
- loadOp: 'clear' | 'load' 的区别
- storeOp: 'store' | 'discard' 的区别
- Canvas 表面纹理的获取
- 多重采样（MSAA）配置
- 渲染目标的切换

### 前置知识
- 第18章：WebGL 渲染目标对比
- 第20-21章：WebGPU 基础

## 4. 写作要求

### 开篇方式
以"WebGPU 的 Render Pass 显式声明了'画布操作'"开篇，说明这种声明式设计的优势。

### 结构组织
1. **引言**：WebGPU 渲染目标模型
2. **Render Pass 描述符**：配置详解
3. **颜色附件**：loadOp、storeOp、clearValue
4. **深度/模板附件**：配置与使用
5. **Canvas 渲染**：surface 配置
6. **GpuRenderTargetSystem**：PixiJS 封装
7. **小结**：渲染目标最佳实践

### 代码示例
- Render Pass 创建代码
- Canvas 配置代码
- 渲染到纹理代码

### 图表需求
- **必须**：Render Pass 结构图
- **可选**：Load/Store Op 效果对比

## 5. 技术细节

### 源码参考
- `packages/webgpu/src/renderTarget/GpuRenderTargetSystem.ts`
- `packages/webgpu/src/GpuEncoderSystem.ts`

### 实现要点
- getCurrentTexture 的生命周期
- 与 WebGL FBO 的抽象统一
- 渲染目标栈管理
- MSAA resolve 处理

### 常见问题
- Q: loadOp: 'load' vs 'clear' 性能差异？
  A: 'clear' 通常更快，因为不需要读取现有内容
- Q: 如何读取渲染结果？
  A: 需要 copy 到可映射的 buffer

## 6. 风格指导

### 语气语调
- 对比 WebGL 帮助理解
- 解释声明式设计的优势
- 提供性能优化建议

### 类比方向
- 将 Render Pass 类比为"拍摄场次"—— 一组渲染操作
- 将 loadOp 类比为"是否使用之前的画"—— 继续画还是重画

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
- 第18章：WebGL 渲染目标
- 第20-25章：WebGPU 基础

### 后续章节
- 第27章：WebGL vs WebGPU 对比
- 第82-89章：滤镜系统
