# 章节写作指导：RenderTexture 渲染纹理

## 1. 章节信息

- **章节标题**: RenderTexture 渲染纹理
- **文件名**: texture/render-texture.md
- **所属部分**: 第九部分：Texture 纹理系统
- **章节序号**: 51
- **预计阅读时间**: 22分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 理解 RenderTexture 的概念与用途
- 掌握渲染到纹理的原理
- 了解 RenderTexture 的创建与使用
- 理解渲染纹理的资源管理

### 技能目标
- 能够创建和使用 RenderTexture
- 能够实现离屏渲染效果
- 能够优化 RenderTexture 的使用

## 3. 内容要点

### 核心概念（必须全部讲解）
- **RenderTexture**: 可作为渲染目标的纹理
- **Framebuffer**: 帧缓冲区
- **离屏渲染**: 渲染到纹理而非屏幕
- **纹理重用**: RenderTexture 池

### 关键知识点（必须全部覆盖）
- RenderTexture 的创建方式
- 渲染到 RenderTexture
- 从 RenderTexture 读取像素
- RenderTexture 与滤镜的关系
- 尺寸与分辨率设置
- RenderTexture 池化策略
- 常见使用场景

### 前置知识
- 第48-50章：纹理基础
- 第18章：渲染目标

## 4. 写作要求

### 开篇方式
以"如何把场景渲染成一张图片？"开篇，引出离屏渲染的核心需求。

### 结构组织
1. **引言**：渲染到纹理的需求
2. **RenderTexture 概念**：与普通纹理的区别
3. **创建与使用**：API 详解
4. **渲染操作**：renderer.render(target, rt)
5. **读取像素**：extract 功能
6. **池化管理**：资源优化
7. **小结**：RenderTexture 使用要点

### 代码示例
- 创建 RenderTexture
- 渲染场景到 RenderTexture
- 提取像素数据

### 图表需求
- **必须**：RenderTexture 渲染流程图
- **可选**：RenderTexture 池示意

## 5. 技术细节

### 源码参考
- `packages/core/src/textures/RenderTexture.ts`
- `packages/core/src/textures/RenderTexturePool.ts`
- `packages/core/src/render/RenderableGc.ts`

### 实现要点
- Framebuffer 的创建与绑定
- 颜色附件与深度模板附件
- 纹理尺寸与 POT 限制
- 池化的键值设计

### 常见问题
- Q: RenderTexture 需要手动销毁吗？
  A: 是的，需要调用 destroy() 释放 GPU 资源
- Q: 如何避免频繁创建 RenderTexture？
  A: 使用 RenderTexturePool 获取

## 6. 风格指导

### 语气语调
- 应用导向
- 提供完整示例
- 强调资源管理

### 类比方向
- 将 RenderTexture 类比为"画板"—— 可以在上面作画
- 将池化类比为"画板租借"—— 用完归还

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
- 第48-50章：纹理基础
- 第18章：渲染目标

### 后续章节
- 第52章：SpriteSheet
- 第82-89章：滤镜系统
