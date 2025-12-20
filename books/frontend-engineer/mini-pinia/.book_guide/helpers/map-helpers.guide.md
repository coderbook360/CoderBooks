# 章节写作指导：mapHelpers 实现

## 1. 章节信息
- **章节标题**: mapHelpers 实现
- **文件名**: helpers/map-helpers.md
- **所属部分**: 第九部分：辅助函数
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 mapStores/mapState/mapActions 的设计
- 掌握与 Options API 的集成方式
- 了解与 Vuex mapHelpers 的区别

### 技能目标
- 能够从零实现 map helpers
- 能够在 Options API 中使用

## 3. 内容要点
### 核心概念
- **mapStores**：映射整个 Store
- **mapState**：映射 state 和 getters
- **mapActions**：映射 actions
- **mapWritableState**：映射可写的 state

### 关键知识点
- 返回对象的结构
- this.$pinia 的使用
- 与 Composition API 的关系

## 4. 写作要求
### 开篇方式
"虽然 Composition API 是 Pinia 的主要使用方式，但 Pinia 也提供了 map helpers 来支持 Options API。这些函数的实现展示了如何在两种 API 风格之间架起桥梁。"

### 结构组织
```
1. 为什么需要 mapHelpers
2. mapStores 实现
3. mapState 实现
4. mapActions 实现
5. mapWritableState 实现
6. 使用示例
```

### 代码示例
```typescript
// mapStores 实现
export function mapStores<Stores extends UseStoreDefinition[]>(
  ...stores: Stores
): _MapStoresReturn<Stores> {
  return stores.reduce((reduced, useStore) => {
    // 属性名：storeId + 'Store'
    // 例如 useCounterStore -> counterStore
    reduced[useStore.$id + 'Store'] = function (this: ComponentPublicInstance) {
      return useStore(this.$pinia)
    }
    return reduced
  }, {} as _MapStoresReturn<Stores>)
}

// mapState 实现
export function mapState<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: Array<keyof S | keyof G> | Record<string, keyof S | keyof G | ((store: Store<Id, S, G, A>) => any)>
): _MapStateReturn<S, G> {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        reduced[key] = function (this: ComponentPublicInstance) {
          return useStore(this.$pinia)[key]
        }
        return reduced
      }, {} as _MapStateReturn<S, G>)
    : Object.keys(keysOrMapper).reduce((reduced, key) => {
        reduced[key] = function (this: ComponentPublicInstance) {
          const store = useStore(this.$pinia)
          const value = keysOrMapper[key]
          return typeof value === 'function'
            ? value.call(this, store)
            : store[value]
        }
        return reduced
      }, {} as _MapStateReturn<S, G>)
}
```

## 5. 技术细节
### this.$pinia 的来源
```typescript
// createPinia 中
const pinia = {
  install(app: App) {
    // 全局属性
    app.config.globalProperties.$pinia = pinia
  }
}

// 在 Options API 组件中
export default {
  computed: {
    ...mapState(useCounterStore, ['count'])
  },
  methods: {
    someMethod() {
      // this.$pinia 可用
    }
  }
}
```

### mapStores 的使用
```typescript
// 定义
const useCounterStore = defineStore('counter', { ... })
const useUserStore = defineStore('user', { ... })

// 使用
export default {
  computed: {
    ...mapStores(useCounterStore, useUserStore)
  },
  methods: {
    doSomething() {
      // 通过 xxxStore 访问
      this.counterStore.count
      this.userStore.name
    }
  }
}
```

### mapWritableState 实现
```typescript
export function mapWritableState<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A
>(
  useStore: StoreDefinition<Id, S, G, A>,
  keysOrMapper: Array<keyof S> | Record<string, keyof S>
): _MapWritableStateReturn<S> {
  return Array.isArray(keysOrMapper)
    ? keysOrMapper.reduce((reduced, key) => {
        reduced[key] = {
          get(this: ComponentPublicInstance) {
            return useStore(this.$pinia)[key]
          },
          set(this: ComponentPublicInstance, value) {
            return useStore(this.$pinia)[key] = value
          }
        }
        return reduced
      }, {} as _MapWritableStateReturn<S>)
    : // ... 对象形式
}

// 使用
export default {
  computed: {
    ...mapWritableState(useCounterStore, ['count'])
  },
  methods: {
    increment() {
      this.count++  // 可以直接修改
    }
  }
}
```

### 与 Vuex 的区别
```typescript
// Vuex 需要通过 mutations 修改
mapMutations(['INCREMENT'])

// Pinia 可以直接修改
mapWritableState(useStore, ['count'])
// 或直接在 methods 中
this.counterStore.count++
```

## 6. 风格指导
- **语气**：API 参考与实现
- **对比**：与 Vuex 对比

## 7. 章节检查清单
- [ ] 各 helper 实现完整
- [ ] 使用示例清晰
- [ ] $pinia 来源说明
- [ ] 与 Vuex 对比
