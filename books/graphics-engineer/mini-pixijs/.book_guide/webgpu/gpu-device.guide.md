# 章节写作指导：GPUDevice 与适配器

## 1. 章节信息

- **章节标题**: GPUDevice 与适配器
- **文件名**: webgpu/gpu-device.md
- **所属部分**: 第四部分：WebGPU 渲染器
- **章节序号**: 21
- **预计阅读时间**: 20分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 GPUAdapter 与 GPUDevice 的关系
- 掌握设备请求与功能协商流程
- 了解设备限制（Limits）与特性（Features）
- 理解设备丢失（Device Lost）处理

### 技能目标
- 能够请求适当配置的 GPU 设备
- 能够查询设备能力与限制
- 能够处理设备丢失情况

## 3. 内容要点

### 核心概念（必须全部讲解）
- **GPUAdapter**: 物理 GPU 的抽象
- **GPUDevice**: 逻辑设备，所有 GPU 操作的入口
- **GPUDeviceLimits**: 设备限制（最大纹理尺寸等）
- **GPUFeatureName**: 可选特性

### 关键知识点（必须全部覆盖）
- navigator.gpu.requestAdapter() 流程
- adapter.requestDevice() 参数
- 功能协商：requiredFeatures 与 requiredLimits
- 设备丢失事件与恢复
- 多设备场景
- PowerPreference 选项

### 前置知识
- 第20章：WebGPU 渲染器概览
- 现代 GPU 架构基础

## 4. 写作要求

### 开篇方式
以"GPUDevice 是 WebGPU 世界的入口"开篇，说明设备在整个 API 中的核心地位。

### 结构组织
1. **引言**：设备在 WebGPU 中的地位
2. **Adapter 请求**：发现可用 GPU
3. **Device 请求**：创建逻辑设备
4. **功能与限制**：Features 与 Limits
5. **设备丢失**：处理与恢复
6. **GpuDeviceSystem**：PixiJS 的封装
7. **小结**：设备管理最佳实践

### 代码示例
- adapter 请求代码
- device 请求配置
- 限制查询代码
- 设备丢失处理

### 图表需求
- **必须**：Adapter → Device 关系图
- **可选**：设备能力查询流程图

## 5. 技术细节

### 源码参考
- `packages/webgpu/src/GpuDeviceSystem.ts`
- WebGPU 规范中的 GPUAdapter/GPUDevice

### 实现要点
- 异步设备获取的等待策略
- 功能降级处理
- 设备引用的管理
- 设备销毁时的资源清理

### 常见问题
- Q: 如何选择高性能 GPU 或低功耗 GPU？
  A: 使用 powerPreference: 'high-performance' 或 'low-power'
- Q: 设备丢失后能恢复吗？
  A: 需要重新请求设备并重建所有资源

## 6. 风格指导

### 语气语调
- WebGPU 规范视角
- 与 WebGL 上下文对比
- 强调异步处理的重要性

### 类比方向
- 将 Adapter 类比为"GPU 型号"—— 物理硬件
- 将 Device 类比为"会话"—— 与 GPU 的连接

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
- 第20章：WebGPU 渲染器概览

### 后续章节
- 第22-26章：其他 WebGPU 资源管理
