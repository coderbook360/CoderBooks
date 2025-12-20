# 章节写作指导：Assets 资源系统架构

## 1. 章节信息

- **章节标题**: Assets 资源系统架构
- **文件名**: assets/overview.md
- **所属部分**: 第十六部分：Assets 资源系统
- **章节序号**: 95
- **预计阅读时间**: 30分钟
- **难度等级**: 中级

## 2. 学习目标

### 知识目标
- 深入理解 Assets 系统的分层架构设计
- 掌握 Resolver → Loader → Parser 的完整加载管线
- 理解资源缓存的多层策略
- 掌握自定义 Loader/Parser 的扩展机制

### 技能目标
- 能够使用 Assets API 高效加载各类资源
- 能够配置 manifest 实现资源预加载
- 能够诊断和解决加载失败问题
- 能够编写自定义资源加载器

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Assets 系统架构
```typescript
// 统一入口
class Assets {
  // 核心组件
  resolver: Resolver;    // URL 解析
  loader: Loader;        // 资源加载
  cache: Cache;          // 资源缓存
  
  // 主要 API
  async load<T>(url: string): Promise<T>;
  async loadBundle(bundleId: string): Promise<Record<string, unknown>>;
  unload(url: string): void;
}
```

#### 3.2 加载管线流程
```
Assets.load('sprite.png')
    ↓
Resolver.resolve('sprite.png')
    → 解析别名、baseUrl、bundle
    → 返回完整 URL
    ↓
Cache.has(url) ?
    → 有缓存: 直接返回
    → 无缓存: 继续加载
    ↓
Loader.load(url)
    → 选择合适的 LoaderParser
    → fetch 获取数据
    ↓
Parser.parse(data)
    → 转换为 PixiJS 对象 (Texture, Spritesheet...)
    ↓
Cache.set(url, result)
    ↓
返回结果
```

#### 3.3 内置解析器
| 解析器 | 支持格式 | 输出类型 |
|--------|----------|----------|
| **TextureParser** | png, jpg, webp, avif | Texture |
| **SpritesheetParser** | json (TexturePacker) | Spritesheet |
| **BitmapFontParser** | fnt, xml | BitmapFont |
| **SvgParser** | svg | Texture |
| **JsonParser** | json | object |
| **TextParser** | txt | string |

### 关键知识点（必须全部覆盖）
1. **架构设计**: Resolver / Loader / Parser / Cache 分工
2. **加载方式**: `load()` vs `loadBundle()` vs `backgroundLoad()`
3. **缓存策略**: URL Key、引用计数、清理时机
4. **错误处理**: 加载失败、解析失败、网络错误
5. **并行加载**: 并发数限制、优先级队列
6. **扩展机制**: 自定义 LoaderParser 的实现
7. **v8 vs v7**: PIXI.Loader 到 Assets 的迁移

### 前置知识
- JavaScript 异步编程 (async/await)
- Texture 纹理基础

## 4. 写作要求

### 开篇方式
以"如何优雅地加载游戏资源？"开篇，说明资源管理的重要性。

### 结构组织
1. **引言**：资源加载的挑战
2. **Assets 概览**：系统架构
3. **基本使用**：load 方法
4. **资源类型**：支持列表
5. **缓存机制**：避免重复加载
6. **错误处理**：异常捕获
7. **小结**：Assets 使用要点

### 代码示例
- 基本加载
- 批量加载
- 错误处理

### 图表需求
- **必须**：Assets 系统架构图
- **可选**：资源加载流程图

## 5. 技术细节

### 源码参考
- `packages/assets/src/Assets.ts`
- `packages/assets/src/AssetExtension.ts`

### 实现要点
- 单例模式设计
- 异步流程管理
- 扩展点设计
- 类型推断

### 常见问题
- Q: 加载同一资源会重复请求吗？
  A: 不会，有缓存机制
- Q: 如何清理资源缓存？
  A: 使用 Assets.unload() 方法

## 6. 风格指导

### 语气语调
- 实用导向
- API 说明清晰
- 示例丰富

### 类比方向
- 将 Assets 类比为"资源管理器"—— 统一管理所有素材
- 将缓存类比为"素材库"—— 加载一次多次使用

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
- 无特定前置

### 后续章节
- 第96章：Loader
- 第97-100章：Assets 系统详解
