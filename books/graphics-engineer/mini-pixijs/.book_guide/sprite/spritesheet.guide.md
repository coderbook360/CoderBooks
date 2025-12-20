# 章节写作指导：Spritesheet 精灵图集

## 1. 章节信息

- **章节标题**: Spritesheet 精灵图集
- **文件名**: sprite/spritesheet.md
- **所属部分**: 第十部分：Sprite 精灵系统
- **章节序号**: 59
- **预计阅读时间**: 22分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 Spritesheet 的概念与优势
- 掌握 Spritesheet 的数据格式
- 了解精灵图集的解析流程
- 理解纹理帧与动画帧的关系

### 技能目标
- 能够加载和使用 Spritesheet
- 能够理解精灵图集的数据结构
- 能够从 Spritesheet 中提取帧

## 3. 内容要点

### 核心概念（必须全部讲解）
- **Spritesheet**: 精灵图集，包含多个帧的大图
- **Frame**: 帧数据，描述每个精灵的位置尺寸
- **Animation**: 动画序列定义
- **Texture Atlas**: 纹理图集

### 关键知识点（必须全部覆盖）
- Spritesheet 的性能优势（减少 Draw Call）
- JSON 数据格式规范
- 帧的解析与 Texture 创建
- 动画定义与获取
- 与 Assets 系统的集成
- trim/rotate 等高级属性

### 前置知识
- 第48-53章：纹理系统
- 第95-96章：资源系统

## 4. 写作要求

### 开篇方式
以"一个游戏角色有 100 个动画帧，如何高效管理？"的需求开篇。

### 结构组织
1. **引言**：为什么需要精灵图集
2. **格式解析**：JSON 数据结构
3. **加载流程**：解析与创建
4. **使用方式**：获取帧与动画
5. **工具生态**：TexturePacker 等
6. **小结**：要点回顾

### 代码示例
- 加载 Spritesheet
- 获取单帧 Texture
- 获取动画帧序列

### 图表需求
- **必须**：Spritesheet 结构图
- **必须**：JSON 数据格式图
- **可选**：解析流程图

## 5. 技术细节

### 源码参考
- `packages/spritesheet/src/Spritesheet.ts`
- `packages/spritesheet/src/SpritesheetLoader.ts`

### 实现要点
- 帧数据的解析
- Texture 的批量创建
- 缓存与复用机制

### 常见问题
- Q: Spritesheet 支持哪些工具导出？
  A: TexturePacker、Shoebox、Free Texture Packer 等
- Q: 如何处理高分辨率资源？
  A: 使用 resolution 属性

## 6. 风格指导

### 语气语调
- 实用导向
- 格式清晰
- 工具推荐

### 类比方向
- 将 Spritesheet 类比为"贴纸册"

## 7. 章节检查清单

- [ ] 解释了精灵图集的优势
- [ ] 详细介绍了 JSON 格式
- [ ] 展示了完整的使用流程
- [ ] 提供了实用工具推荐
