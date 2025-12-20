# 章节写作指导：Container 容器实现

## 1. 章节信息

- **章节标题**: Container 容器实现
- **文件名**: scene/container.md
- **所属部分**: 第六部分：场景图核心
- **章节序号**: 34
- **预计阅读时间**: 35分钟
- **难度等级**: 高级

## 2. 学习目标

### 知识目标
- 深入理解 Container 在 PixiJS 场景图中的核心地位
- 掌握 Container 类的完整属性体系与实现机制
- 理解脏标记系统如何驱动高效更新
- 掌握 Container 的生命周期管理与资源清理

### 技能目标
- 能够追踪 Container 属性变更从设置到渲染的完整链路
- 能够扩展 Container 创建自定义显示对象
- 能够诊断 Container 相关的常见问题（内存泄漏、状态不同步）

## 3. 内容要点

### 核心概念（必须全部讲解）

#### 3.1 Container 核心属性
```typescript
class Container extends EventEmitter {
  // 父子关系
  parent: Container | null;
  children: Container[];
  
  // 变换属性
  position: ObservablePoint;  // (x, y)
  scale: ObservablePoint;     // (scaleX, scaleY)
  pivot: ObservablePoint;     // (pivotX, pivotY)
  skew: ObservablePoint;      // (skewX, skewY)
  rotation: number;           // 弧度
  angle: number;              // 度数 (计算属性)
  
  // 显示属性
  alpha: number;              // 本地透明度 0-1
  worldAlpha: number;         // 全局透明度 (继承计算)
  visible: boolean;           // 可见性
  renderable: boolean;        // 是否参与渲染
  
  // 矩阵
  localTransform: Matrix;
  worldTransform: Matrix;
  
  // 标志位
  _flags: number;
}
```

#### 3.2 标志位系统 (Flags)
```typescript
enum ContainerFlags {
  NONE             = 0,
  TRANSFORM_DIRTY  = 1 << 0,  // 变换需重算
  ALPHA_DIRTY      = 1 << 1,  // 透明度需重算
  VISIBLE_DIRTY    = 1 << 2,  // 可见性已变
  BOUNDS_DIRTY     = 1 << 3,  // 边界需重算
  SORTABLE         = 1 << 4,  // 子节点需排序
  RENDERABLE       = 1 << 5,  // 可渲染对象
}

// 脏标记操作
_flags |= ContainerFlags.TRANSFORM_DIRTY;  // 设置
_flags &= ~ContainerFlags.TRANSFORM_DIRTY; // 清除
(_flags & ContainerFlags.TRANSFORM_DIRTY) !== 0; // 检查
```

#### 3.3 属性变更链路
```
position.x = 100
    ↓
ObservablePoint.cb() 回调
    ↓
onUpdate() → _flags |= TRANSFORM_DIRTY
    ↓
渲染时检查 _flags
    ↓
重算 worldTransform
    ↓
清除 TRANSFORM_DIRTY
```

### 关键知识点（必须全部覆盖）
1. **继承层次**: Container → EventEmitter
2. **属性 getter/setter**: 使用 `definedProps` 优化访问
3. **ObservablePoint**: 属性变更自动回调
4. **全局与本地**: localTransform vs worldTransform
5. **异步更新**: 脏标记延迟计算的原理
6. **销毁机制**: `destroy(options)` 的选项详解
7. **循环引用处理**: parent/child 的关系清理

### 前置知识
- 第33章：场景图概念
- 第3章：核心类型（Point, Matrix）

## 4. 写作要求

### 开篇方式
以"Container 是 PixiJS 中最重要的类之一"开篇，说明其作为场景图核心的地位。

### 结构组织
1. **引言**：Container 的角色定位
2. **类设计**：继承层次与接口
3. **属性系统**：核心属性详解
4. **标志位**：状态管理机制
5. **生命周期**：创建、更新、销毁
6. **扩展 Container**：自定义容器
7. **小结**：Container 设计模式

### 代码示例
- Container 核心属性定义
- 属性 setter 的实现
- 脏标记更新逻辑

### 图表需求
- **必须**：Container 类图
- **必须**：标志位结构图
- **可选**：生命周期状态图

## 5. 技术细节

### 源码参考
- `packages/scene/src/container/Container.ts`
- `packages/scene/src/container/container-mixins/`
- `packages/scene/src/container/utils/definedProps.ts`

### 实现要点
- 使用 Object.defineProperty 优化属性访问
- 位运算进行标志位管理
- 父子引用的循环引用处理
- 销毁时的引用清理

### 常见问题
- Q: Container 和 Sprite 有什么区别？
  A: Container 可以包含子对象，Sprite 是可渲染的叶子节点
- Q: 如何知道容器的属性是否改变？
  A: 通过脏标记检查

## 6. 风格指导

### 语气语调
- 源码分析风格
- 深入实现细节
- 解释设计决策

### 类比方向
- 将 Container 类比为"文件夹"—— 可以包含其他内容
- 将标志位类比为"状态开关"—— 记录各种状态

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
- 第33章：场景图概念

### 后续章节
- 第35章：子节点管理
- 第36-37章：View 与 Renderable
