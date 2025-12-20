# 章节写作指导：TextureSource 纹理源

## 1. 章节信息

- **章节标题**: TextureSource 纹理源
- **文件名**: texture/texture-source.md
- **所属部分**: 第九部分：Texture 纹理系统
- **章节序号**: 49
- **预计阅读时间**: 22分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 TextureSource 的设计目标
- 掌握纹理源的类型与结构
- 了解纹理源与 GPU 资源的对应关系
- 理解纹理源的更新机制

### 技能目标
- 能够创建不同类型的 TextureSource
- 能够管理纹理源的生命周期
- 能够处理动态纹理更新

## 3. 内容要点

### 核心概念（必须全部讲解）
- **TextureSource**: 纹理数据的实际容器
- **ImageSource**: 基于 Image/Canvas 的纹理源
- **BufferSource**: 基于像素数据的纹理源
- **VideoSource**: 视频纹理源

### 关键知识点（必须全部覆盖）
- TextureSource 基类设计
- 不同纹理源类型的特点
- 纹理源的状态管理
- GPU 资源的上传与更新
- 脏标记与更新策略
- 纹理源的引用计数
- autoGarbageCollect 机制

### 前置知识
- 第48章：Texture 核心
- 第15章：WebGL Texture

## 4. 写作要求

### 开篇方式
以"图像数据有多种形式，如何统一管理？"开篇，引出 TextureSource 的抽象设计。

### 结构组织
1. **引言**：纹理源的必要性
2. **基类设计**：TextureSource 结构
3. **类型详解**：Image/Buffer/Video
4. **状态管理**：loaded、valid、destroyed
5. **GPU 同步**：上传与更新
6. **资源管理**：引用计数与 GC
7. **小结**：纹理源设计要点

### 代码示例
- 创建 ImageSource
- 创建 BufferSource
- 动态更新纹理

### 图表需求
- **必须**：TextureSource 类型层次图
- **可选**：纹理源状态转换图

## 5. 技术细节

### 源码参考
- `packages/core/src/textures/sources/TextureSource.ts`
- `packages/core/src/textures/sources/ImageSource.ts`
- `packages/core/src/textures/sources/BufferSource.ts`
- `packages/core/src/textures/sources/VideoSource.ts`

### 实现要点
- 泛型设计与资源类型
- 样式属性（wrapMode、scaleMode）
- 上传策略与 GPU 同步
- 事件派发机制

### 常见问题
- Q: 如何动态更新纹理内容？
  A: 调用 source.update() 标记脏，渲染时会重新上传
- Q: VideoSource 如何处理帧更新？
  A: 自动检测视频帧变化并更新

## 6. 风格指导

### 语气语调
- 抽象概念具体化
- 类型对比清晰
- 提供使用指南

### 类比方向
- 将 TextureSource 类比为"素材库"—— 存储原始素材
- 将类型子类类比为"不同格式"—— 各有特点

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
- 第48章：Texture 核心

### 后续章节
- 第50章：纹理样式
- 第51-53章：纹理系统其他章节
