# 章节写作指导：Texture 核心设计

## 1. 章节信息

- **章节标题**: Texture 核心设计
- **文件名**: texture/texture-core.md
- **所属部分**: 第九部分：Texture 纹理系统
- **章节序号**: 48
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 深入理解 Texture 与 TextureSource 分离设计的原因
- 掌握 frame、orig、trim 三个矩形的精确含义与计算
- 了解纹理坐标(UV)的生成机制
- 理解纹理更新与事件通知系统

### 技能目标
- 能够从 TextureSource 创建自定义 Texture
- 能够诊断纹理相关的渲染问题（如白边、错位）
- 能够正确使用 trim 实现精灵图集的裁剪优化

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Texture 类核心属性
```typescript
class Texture {
  source: TextureSource;      // 实际图像数据
  frame: Rectangle;           // 在 source 中的采样区域
  orig: Rectangle;            // 原始图像尺寸（打包前）
  trim: Rectangle | null;     // 裁剪区域（去掉透明边缘后）
  
  // 计算属性
  get width(): number { return this.orig.width; }
  get height(): number { return this.orig.height; }
  
  // UV 坐标（归一化到 0-1）
  uvs: TextureUvs;
}
```

#### 3.2 三个矩形的精确定义
| 矩形 | 定义 | 典型场景 |
|-----|------|---------|
| **frame** | source 图像中实际采样的像素区域 | 精灵图集中子图的位置 |
| **orig** | 打包前原始图像的尺寸 | 用于保持显示对象的逻辑尺寸 |
| **trim** | 裁剪后非透明区域的偏移和尺寸 | TexturePacker 的 trim 优化 |

**关键公式**:
```
实际渲染宽度 = orig.width
采样区域宽度 = frame.width
裁剪偏移 = trim ? (trim.x, trim.y) : (0, 0)
```

#### 3.3 UV 坐标计算
```typescript
// TextureUvs 计算逻辑
uvs.x0 = frame.x / source.width;
uvs.y0 = frame.y / source.height;
uvs.x1 = (frame.x + frame.width) / source.width;
uvs.y1 = (frame.y + frame.height) / source.height;
// 注意：如果有 rotate，UV 需要额外变换
```

### 关键知识点（必须全部覆盖）
1. **Texture vs TextureSource 分离**: 多个 Texture 可共享同一 TextureSource（精灵图集的核心）
2. **动态纹理更新**: `update()` 方法触发 UV 重算和事件派发
3. **纹理旋转 (rotate)**: 支持 90°/180°/270° 旋转，用于优化打包
4. **默认纹理 (EMPTY/WHITE)**: 全局单例，避免空纹理错误
5. **事件系统**: 'update'、'destroy' 事件通知使用者

### 前置知识
- 第16章：GlTexture 纹理管理
- 第23章：GPUTexture 管理

## 4. 写作要求

### 开篇方式
以问题场景开篇："当你使用精灵图集时，一张大图包含了100个小图。PixiJS 如何知道每个小图在哪里、多大、怎么采样？答案就在 Texture 的设计中。"

### 结构组织（带权重）
1. **引言** (5%): 纹理在渲染管线中的位置
2. **Texture 类详解** (20%): 所有属性的含义和关系
3. **frame/orig/trim 三矩形** (25%): 详细图解和计算示例
4. **UV 坐标系统** (20%): 归一化坐标与旋转处理
5. **纹理更新与事件** (15%): 动态纹理的实现
6. **内置纹理** (5%): EMPTY、WHITE 的作用
7. **常见问题排查** (10%): 白边、错位等问题的诊断

### 代码示例要求
1. **必须展示**: 从 TextureSource 创建 Texture 的完整代码
2. **必须展示**: 精灵图集的 frame 配置示例
3. **必须展示**: trim 裁剪的工作原理
4. **推荐展示**: 动态纹理更新的代码

### 图表需求
- **必须**: Texture 与 TextureSource 关系图（多对一）
- **必须**: frame/orig/trim 三矩形的可视化图解
- **必须**: UV 坐标系示意图（包含旋转情况）
- **可选**: 精灵图集完整示例图

## 5. 技术细节

### 源码精确引用
| 概念 | 文件路径 | 关键位置 |
|-----|---------|---------|
| Texture 类 | `packages/core/src/textures/Texture.ts` | 完整类定义 |
| TextureUvs | `packages/core/src/textures/TextureUvs.ts` | UV 计算 |
| 纹理更新 | `packages/core/src/textures/Texture.ts` | `update()` 方法 |
| 默认纹理 | `packages/core/src/textures/Texture.ts` | `EMPTY`, `WHITE` 静态属性 |

### 实现要点深度解析

#### 5.1 为什么分离 Texture 和 TextureSource？
```
设计动机：
1. 资源复用 - 100个 Sprite 使用同一图集，只需1个 TextureSource
2. 内存效率 - GPU 只上传一次纹理数据
3. 灵活定义 - 每个 Texture 可以定义不同的 frame
```

#### 5.2 rotate 属性的编码
```typescript
// rotate 值的含义（GroupD8 编码）
rotate = 0  // 无旋转
rotate = 2  // 顺时针90°
rotate = 4  // 180°
rotate = 6  // 逆时针90°
// 奇数值表示翻转 + 旋转
```

#### 5.3 trim 如何节省内存
```
原图: 100x100 (透明边缘50px)
trim后: 实际像素区域 50x50
节省: (10000 - 2500) / 10000 = 75% 像素
```

### 常见问题与深度解答

- **Q: Sprite 显示白边是什么原因？**
  A: 通常是 UV 采样到了相邻图块。解决：1) 在图集中增加 padding；2) 使用 CLAMP 采样模式

- **Q: 为什么修改 frame 后 Sprite 没变化？**
  A: 需要调用 `texture.update()` 触发 UV 重算和渲染更新

- **Q: Texture.destroy() 会销毁 TextureSource 吗？**
  A: 默认不会。设置 `destroySource: true` 才会销毁

## 6. 风格指导

### 语气语调
- 概念+实现并重，每个概念都有源码对应
- 使用具体数值和图示说明抽象概念
- 问题驱动，从"为什么"引出"怎么做"

### 类比方向
- TextureSource 类比为"相册"—— 存放完整照片
- Texture 类比为"相框"—— 决定显示相册中的哪部分
- frame 类比为"取景框"—— 在大图中选取区域

### 深度要求
- frame/orig/trim 必须有详细的数值计算示例
- UV 计算必须有公式和代码对照
- 至少展示 2 种常见问题的排查方法

## 7. 章节检查清单

- [ ] 目标明确：读者能否区分 Texture 和 TextureSource
- [ ] 术语统一：frame/orig/trim 是否定义清晰
- [ ] 最小实现：是否展示了创建 Texture 的最简代码
- [ ] 边界处理：trim 为 null 时的处理是否说明
- [ ] 性能与权衡：是否说明纹理复用的性能收益
- [ ] 替代方案：是否提及 RenderTexture 作为动态纹理方案
- [ ] 图示与代码：三矩形图解是否与代码计算对应
- [ ] 总结与练习：是否提供白边问题的排查练习

## 8. 与其他章节的关系

### 前置章节
- 第16章：GlTexture（GPU 纹理的底层实现）
- 第23章：GPUTexture（WebGPU 纹理）

### 后续章节
- 第49章：TextureSource（纹理源详解）
- 第50章：TextureStyle（采样配置）
- 第51章：RenderTexture（渲染到纹理）

### 交叉引用
- 第54章：Sprite 中的纹理使用
- 第59章：Spritesheet 图集加载
