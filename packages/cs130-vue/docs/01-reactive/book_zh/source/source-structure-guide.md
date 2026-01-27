# 源码结构与阅读指南

从这一章开始，我们进入 Vue3 响应式系统的源码世界。在深入具体实现之前，先来熟悉一下源码的整体结构，了解各个文件的职责，这样在阅读时就不会迷失方向。

## 源码仓库结构

Vue3 的源码托管在 GitHub 的 vuejs/core 仓库。整个项目采用 monorepo 结构，使用 pnpm 管理多个包。响应式系统的代码位于 `packages/reactivity` 目录下。

打开这个目录，你会看到这样的结构：

```
packages/reactivity/
├── src/
│   ├── index.ts           # 导出入口
│   ├── reactive.ts        # reactive/readonly 相关
│   ├── ref.ts             # ref 相关
│   ├── effect.ts          # effect/track/trigger
│   ├── computed.ts        # computed 相关
│   ├── watch.ts           # watch/watchEffect
│   ├── effectScope.ts     # effectScope 相关
│   ├── baseHandlers.ts    # 普通对象的 Proxy 拦截器
│   ├── collectionHandlers.ts  # 集合的 Proxy 拦截器
│   ├── dep.ts             # 依赖相关的数据结构
│   ├── reactiveEffect.ts  # ReactiveEffect 类
│   └── constants.ts       # 常量定义
├── __tests__/             # 测试文件
└── package.json
```

每个文件都有明确的职责划分。这种模块化设计使得代码易于理解和维护。让我们逐一了解这些核心文件。

## reactive.ts：响应式对象

这个文件是响应式系统的入口之一，包含了创建响应式对象的核心逻辑。

文件开头定义了几个用于缓存的 WeakMap，用来存储原始对象和代理对象之间的映射关系：

```javascript
const reactiveMap = new WeakMap()
const shallowReactiveMap = new WeakMap()
const readonlyMap = new WeakMap()
const shallowReadonlyMap = new WeakMap()
```

使用 WeakMap 的好处是不会阻止垃圾回收。如果原始对象不再被引用，它和对应的代理对象都可以被回收。

文件中最核心的函数是 `createReactiveObject`。无论是 reactive、readonly 还是 shallowReactive，最终都调用这个函数，只是传入的参数不同。这是一个典型的工厂模式应用。

文件还导出了一系列工具函数：isReactive、isReadonly、isShallow、isProxy、toRaw、markRaw 等。这些函数用于检查对象的响应式状态或进行转换。

## effect.ts：副作用与依赖追踪

这是响应式系统中最复杂的文件之一，包含了依赖追踪的核心机制。

文件定义了全局变量 `activeEffect`，用于追踪当前正在执行的 effect。当 effect 的回调函数执行时，activeEffect 指向这个 effect；当回调执行完毕，activeEffect 恢复为之前的值。

`track` 函数负责依赖收集。当响应式属性被读取时，这个函数被调用，它将当前的 activeEffect 添加到属性的依赖集合中。

`trigger` 函数负责触发更新。当响应式属性被修改时，这个函数被调用，它找出所有依赖这个属性的 effect 并执行它们（或将它们加入调度队列）。

文件还定义了 `targetMap` 数据结构，这是一个三层嵌套的映射：WeakMap（对象 → Map）→ Map（属性 → Set）→ Set（effect 集合）。

## ref.ts：Ref 包装器

这个文件处理 ref 相关的所有逻辑。

核心是 `RefImpl` 类，它用一个内部的 `_value` 属性存储值，通过 getter 和 setter 实现响应式。getter 调用 track 收集依赖，setter 在值变化时调用 trigger 触发更新。

文件还包含了 `toRef`、`toRefs`、`unref`、`proxyRefs` 等工具函数。`proxyRefs` 特别有趣，它用于实现模板中 ref 的自动解包——不需要写 `.value` 就能访问 ref 的值。

`customRef` 也定义在这个文件中。它接受一个工厂函数，让用户自定义 track 和 trigger 的时机，可以用来实现防抖 ref 等高级用法。

## computed.ts：计算属性

这个文件相对简单，主要包含 `ComputedRefImpl` 类。

computed 的实现基于 effect，但有一个特殊的调度器。当依赖变化时，调度器不会立即重新计算，只是标记 `_dirty = true`。只有当 computed 的 value 被读取时，才检查 dirty 标记，决定是否重新执行 getter。

这种惰性求值策略避免了不必要的计算。如果一个 computed 定义了但没有被使用，它的 getter 永远不会执行。

## watch.ts：观察器

这个文件实现了 watch 和 watchEffect。

核心是 `doWatch` 函数，watch 和 watchEffect 都是它的包装。doWatch 处理各种配置选项：immediate（立即执行）、deep（深度监听）、flush（执行时机）、once（只执行一次）等。

对于深度监听，doWatch 使用 `traverse` 函数递归遍历对象的所有属性，触发它们的 getter，从而将所有属性都纳入依赖追踪。

watch 还支持 `onCleanup` 回调，用于在下次执行前清理上一次的副作用（比如取消未完成的请求）。

## baseHandlers.ts：基础拦截器

这个文件定义了普通对象和数组的 Proxy 拦截器。

有四套拦截器：mutableHandlers（reactive）、readonlyHandlers（readonly）、shallowReactiveHandlers（shallowReactive）、shallowReadonlyHandlers（shallowReadonly）。它们的结构类似，区别在于是否深层代理、是否允许修改。

get 拦截器是最复杂的。它需要处理很多特殊情况：判断访问的是否是内部标记（如 `__v_isReactive`）、是否需要深层代理（访问嵌套对象时）、是否需要触发依赖收集。

set 拦截器相对简单一些，主要是设置新值并调用 trigger。但它也需要判断是新增属性还是修改已有属性，因为这两种情况触发的更新类型不同。

## collectionHandlers.ts：集合拦截器

这个文件处理 Map、Set、WeakMap、WeakSet 的响应式代理。

集合类型的方法（如 get、set、has、delete、forEach）都通过内部槽位（internal slots）工作，Proxy 的标准 get/set 拦截器无法拦截它们。因此需要用不同的策略：拦截方法本身的调用。

文件为每个集合方法（get、set、add、delete、has、clear、forEach 等）定义了包装函数。这些包装函数在调用原始方法的前后插入 track 和 trigger 调用。

## effectScope.ts：作用域管理

这个文件实现了 effectScope 机制。

`EffectScope` 类维护一个 effects 数组，收集在其作用域内创建的所有 effect。当调用 `scope.stop()` 时，所有收集的 effect 都会被停止。

`onScopeDispose` 函数允许注册清理回调，当 scope 停止时执行。这在需要进行额外清理（如取消订阅）时很有用。

## 阅读源码的方法

有了对文件结构的了解，阅读源码时可以采用以下策略。

第一种是"自顶向下"：从 API 入口开始，比如想了解 reactive 是怎么工作的，就从 reactive.ts 的 reactive 函数开始，一路追踪到 createReactiveObject、baseHandlers、track、trigger。这种方式符合使用 API 的思维路径。

第二种是"自底向上"：从核心数据结构开始，比如先理解 targetMap 和依赖存储的结构，再理解 track 和 trigger 如何操作它们，最后理解各种 API 如何触发 track 和 trigger。这种方式更接近系统的运行原理。

第三种是"问题驱动"：带着具体问题去看代码。比如"computed 为什么是惰性的"——直接去看 ComputedRefImpl，找到 dirty 标记和相关逻辑。这种方式效率最高，但需要先对系统有整体了解。

建议先用"自顶向下"方式过一遍主要流程，建立整体印象；然后用"问题驱动"方式深入感兴趣的细节。

## 阅读技巧

Vue3 的源码使用 TypeScript 编写，类型注解可以帮助理解函数的输入输出。但有时类型定义比较复杂，不要被它们吓到——关键是理解运行时的行为。

源码中有很多 `__DEV__` 条件判断，这些是开发模式下的警告和检查，生产环境会被移除。阅读时可以先忽略这些分支，专注于核心逻辑。

很多函数使用了函数重载（多个函数签名），实际实现只有一个。阅读时注意区分签名和实现。

源码中的注释相对较少，但变量和函数的命名通常很清晰。`activeEffect` 就是当前活跃的 effect，`shouldTrack` 表示是否应该进行追踪，`pauseTracking` 暂停追踪——这些名字本身就是最好的文档。

## 调试源码

如果想在本地调试源码，可以 clone vuejs/core 仓库，安装依赖后运行 `pnpm dev`。这会启动一个开发服务器，你可以在浏览器中打开示例页面，用开发者工具打断点调试。

也可以直接在 node_modules/@vue/reactivity/dist 中打断点，但阅读编译后的代码不如阅读 TypeScript 源码清晰。

另一个有用的技巧是在源码中临时加入 console.log，然后重新构建。这可以帮助理解代码的执行顺序和数据流。

## 小结

Vue3 响应式系统的源码结构清晰，模块职责明确。reactive.ts 处理响应式对象创建，effect.ts 处理依赖追踪，ref.ts 处理 ref 包装，computed.ts 和 watch.ts 分别处理计算属性和观察器，baseHandlers.ts 和 collectionHandlers.ts 定义 Proxy 拦截器，effectScope.ts 处理作用域管理。

带着这个地图，我们就可以开始源码之旅了。从下一章开始，我们将逐个文件、逐个函数地深入分析实现细节。

