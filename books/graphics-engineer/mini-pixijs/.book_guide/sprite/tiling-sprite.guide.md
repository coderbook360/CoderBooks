# 章节写作指导：TilingSprite 平铺精灵

## 1. 章节信息

- **章节标题**: TilingSprite 平铺精灵
- **文件名**: sprite/tiling-sprite.md
- **所属部分**: 第十部分：Sprite 精灵系统
- **章节序号**: 56
- **预计阅读时间**: 18分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 理解 TilingSprite 的用途与特点
- 掌握平铺纹理的实现原理
- 了解 TilingSprite 的属性与配置
- 理解与普通 Sprite 的区别

### 技能目标
- 能够创建和使用 TilingSprite
- 能够实现滚动背景效果
- 能够优化 TilingSprite 性能

## 3. 内容要点

### 核心概念（必须全部讲解）
- **TilingSprite**: 平铺纹理的精灵
- **tilePosition**: 平铺偏移
- **tileScale**: 平铺缩放
- **clampMargin**: 边缘钳制

### 关键知识点（必须全部覆盖）
- TilingSprite 的创建方式
- 平铺区域（width/height）
- tilePosition 与滚动效果
- tileScale 与平铺密度
- tileTransform 完整变换
- 渲染实现原理
- 常见应用场景（滚动背景、无缝纹理）

### 前置知识
- 第54章：Sprite 基础
- 第50章：纹理样式（WrapMode）

## 4. 写作要求

### 开篇方式
以"如何实现无限滚动的背景？"开篇，用游戏开发的实际需求引入。

### 结构组织
1. **引言**：平铺纹理的需求
2. **TilingSprite 概念**：与 Sprite 的区别
3. **核心属性**：tilePosition/tileScale
4. **滚动效果**：动态更新 tilePosition
5. **渲染原理**：shader 实现
6. **应用场景**：常见用法
7. **小结**：TilingSprite 使用要点

### 代码示例
- 创建 TilingSprite
- 实现滚动背景
- 配置平铺密度

### 图表需求
- **必须**：tilePosition 效果示意图
- **可选**：滚动背景实现流程

## 5. 技术细节

### 源码参考
- `packages/scene/src/sprite-tiling/TilingSprite.ts`
- `packages/scene/src/sprite-tiling/TilingSpriteShader.ts`

### 实现要点
- 专用 Shader 的设计
- UV 偏移与缩放计算
- 与纹理 WrapMode 的配合
- 边界计算

### 常见问题
- Q: 纹理不重复而是被拉伸怎么办？
  A: 确保纹理的 WrapMode 设置为 REPEAT
- Q: 如何实现对角滚动？
  A: 同时更新 tilePosition.x 和 tilePosition.y

## 6. 风格指导

### 语气语调
- 应用导向
- 示例驱动
- 效果直观

### 类比方向
- 将 TilingSprite 类比为"壁纸"—— 可以无限平铺
- 将 tilePosition 类比为"壁纸偏移"—— 控制从哪里开始显示

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
- 第54章：Sprite 基础
- 第50章：纹理样式

### 后续章节
- 第57章：NineSliceSprite
- 第58-59章：其他精灵变体
