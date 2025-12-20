# 章节写作指导：GPUBuffer 缓冲区管理

## 1. 章节信息

- **章节标题**: GPUBuffer 缓冲区管理
- **文件名**: webgpu/gpu-buffer.md
- **所属部分**: 第四部分：WebGPU 渲染器
- **章节序号**: 22
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 WebGPU GPUBuffer 的设计理念
- 掌握缓冲区创建与数据映射
- 了解缓冲区用途标志（Usage Flags）
- 理解与 WebGL 缓冲区的差异

### 技能目标
- 能够创建各类 GPUBuffer
- 能够高效地上传和读取缓冲区数据
- 能够选择正确的缓冲区用途

## 3. 内容要点

### 核心概念（必须全部讲解）
- **GPUBuffer**: WebGPU 缓冲区对象
- **GPUBufferUsage**: 用途标志组合
- **Buffer Mapping**: 缓冲区映射机制
- **writeBuffer**: 队列写入方法

### 关键知识点（必须全部覆盖）
- GPUBuffer 的创建参数
- Usage 标志的组合规则
- mappedAtCreation 的使用
- mapAsync/getMappedRange 异步映射
- writeBuffer vs 映射写入的选择
- Staging Buffer 模式

### 前置知识
- 第14章：WebGL 缓冲区作为对比
- 第21章：GPU Device

## 4. 写作要求

### 开篇方式
以"WebGPU 缓冲区需要显式声明用途"开篇，说明与 WebGL 的关键差异。

### 结构组织
1. **引言**：WebGPU 缓冲区的设计理念
2. **创建缓冲区**：参数与选项
3. **Usage 标志**：用途声明详解
4. **数据写入**：writeBuffer 与映射
5. **异步映射**：读取数据模式
6. **GpuBufferSystem**：PixiJS 封装
7. **小结**：缓冲区使用最佳实践

### 代码示例
- 缓冲区创建代码
- writeBuffer 使用
- 异步映射读取

### 图表需求
- **必须**：GPUBufferUsage 组合表
- **可选**：映射与写入对比图

## 5. 技术细节

### 源码参考
- `packages/webgpu/src/buffer/GpuBufferSystem.ts`
- WebGPU 规范中的 GPUBuffer

### 实现要点
- Usage 的 bit 组合验证
- 映射状态管理
- 与 WebGL buffer 的抽象统一
- 销毁与资源释放

### 常见问题
- Q: 为什么要声明 Usage？
  A: 帮助 GPU 优化内存分配和访问模式
- Q: 映射和 writeBuffer 选哪个？
  A: 小数据用 writeBuffer，大数据用映射

## 6. 风格指导

### 语气语调
- 强调与 WebGL 的差异
- 解释设计决策背后的原因
- 提供性能建议

### 类比方向
- 将 Usage 类比为"标签"—— 声明用途优化存储
- 将映射类比为"共享内存"—— CPU 直接访问 GPU 内存

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
- 第21章：GPU Device
- 第14章：WebGL Buffer 对比

### 后续章节
- 第23-26章：其他 WebGPU 资源
