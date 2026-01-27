# 实现状态序列化

本章实现服务端状态的序列化和客户端恢复，这是 SSR 状态传递的关键环节。

## 序列化架构

状态序列化需要将复杂的 JavaScript 对象转换为可以嵌入 HTML 的字符串，同时防止 XSS 攻击。

```typescript
// src/server/serialize.ts

/**
 * 序列化状态
 */
export function serializeState(state: unknown): string {
  return JSON.stringify(state, replacer)
}

/**
 * 安全地序列化状态并嵌入 HTML
 */
export function serializeStateForHTML(state: unknown): string {
  const json = serializeState(state)
  return escapeScriptContent(json)
}

/**
 * JSON replacer 函数
 */
function replacer(key: string, value: unknown): unknown {
  // 跳过函数
  if (typeof value === 'function') {
    return undefined
  }
  
  // 跳过 Symbol
  if (typeof value === 'symbol') {
    return undefined
  }
  
  // 处理特殊对象
  if (value instanceof Date) {
    return { __type: 'Date', value: value.toISOString() }
  }
  
  if (value instanceof RegExp) {
    return { __type: 'RegExp', source: value.source, flags: value.flags }
  }
  
  if (value instanceof Map) {
    return { __type: 'Map', entries: Array.from(value.entries()) }
  }
  
  if (value instanceof Set) {
    return { __type: 'Set', values: Array.from(value.values()) }
  }
  
  // 处理 Vue 响应式对象
  if (isRef(value)) {
    return value.value
  }
  
  if (isReactive(value)) {
    return toRaw(value)
  }
  
  return value
}
```

## XSS 防护

嵌入 HTML 的 JSON 需要特殊处理以防止脚本注入。

```typescript
/**
 * 转义脚本内容中的危险字符
 */
function escapeScriptContent(json: string): string {
  return json
    // 防止提前关闭 script 标签
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    // 转义危险的 Unicode 字符
    .replace(/\u2028/g, '\\u2028')  // Line separator
    .replace(/\u2029/g, '\\u2029')  // Paragraph separator
}

/**
 * 更安全的序列化（用于不信任的数据）
 */
export function safeSerialize(state: unknown): string {
  const json = JSON.stringify(state, replacer)
  
  // 转义所有 HTML 特殊字符
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027')
    .replace(/"/g, '\\u0022')
}
```

## 状态注入

```typescript
/**
 * 生成状态注入脚本
 */
export function generateStateScript(
  state: unknown,
  variableName: string = '__SSR_STATE__'
): string {
  const serialized = serializeStateForHTML(state)
  
  return `<script>window.${variableName}=${serialized}</script>`
}

/**
 * 生成模块形式的状态
 */
export function generateStateModule(
  state: unknown,
  exportName: string = 'default'
): string {
  const serialized = serializeState(state)
  
  return `export ${exportName === 'default' ? 'default' : `const ${exportName} =`} ${serialized}`
}

/**
 * 生成 JSON LD 格式（用于结构化数据）
 */
export function generateJSONLD(data: object): string {
  const serialized = safeSerialize(data)
  
  return `<script type="application/ld+json">${serialized}</script>`
}
```

## 客户端反序列化

```typescript
// src/runtime/deserialize.ts

/**
 * 反序列化状态
 */
export function deserializeState<T = unknown>(
  serialized: string
): T {
  return JSON.parse(serialized, reviver)
}

/**
 * JSON reviver 函数
 */
function reviver(key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && '__type' in value) {
    const typed = value as { __type: string; [key: string]: unknown }
    
    switch (typed.__type) {
      case 'Date':
        return new Date(typed.value as string)
      
      case 'RegExp':
        return new RegExp(
          typed.source as string,
          typed.flags as string
        )
      
      case 'Map':
        return new Map(typed.entries as [unknown, unknown][])
      
      case 'Set':
        return new Set(typed.values as unknown[])
    }
  }
  
  return value
}

/**
 * 从 window 获取 SSR 状态
 */
export function getSSRState<T = unknown>(
  key: string = '__SSR_STATE__'
): T | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  
  const raw = (window as any)[key]
  if (!raw) {
    return undefined
  }
  
  // 如果已经是对象，直接返回
  if (typeof raw === 'object') {
    return raw
  }
  
  // 否则解析字符串
  return deserializeState(raw)
}
```

## 状态收集

```typescript
// src/server/state-collector.ts

/**
 * SSR 状态收集器
 */
export class StateCollector {
  private data: Map<string, unknown> = new Map()
  private components: Map<string, unknown> = new Map()
  private pinia: Map<string, unknown> = new Map()
  
  /**
   * 收集普通数据
   */
  set(key: string, value: unknown): void {
    this.data.set(key, value)
  }
  
  /**
   * 收集组件状态
   */
  setComponentState(componentId: string, state: unknown): void {
    this.components.set(componentId, state)
  }
  
  /**
   * 收集 Pinia store 状态
   */
  setStoreState(storeId: string, state: unknown): void {
    this.pinia.set(storeId, state)
  }
  
  /**
   * 导出所有状态
   */
  export(): SSRStatePayload {
    return {
      data: Object.fromEntries(this.data),
      components: Object.fromEntries(this.components),
      pinia: Object.fromEntries(this.pinia)
    }
  }
  
  /**
   * 生成注入脚本
   */
  generateScript(): string {
    const payload = this.export()
    
    // 分开注入以支持按需获取
    let script = ''
    
    if (this.data.size > 0) {
      script += generateStateScript(payload.data, '__SSR_DATA__')
    }
    
    if (this.pinia.size > 0) {
      script += generateStateScript(payload.pinia, '__PINIA__')
    }
    
    return script
  }
}

interface SSRStatePayload {
  data: Record<string, unknown>
  components: Record<string, unknown>
  pinia: Record<string, unknown>
}
```

## Pinia 集成

```typescript
/**
 * Pinia SSR 序列化
 */
export function serializePiniaState(
  pinia: any
): Record<string, unknown> {
  const state: Record<string, unknown> = {}
  
  pinia._s.forEach((store: any, id: string) => {
    // 获取 store 状态
    const storeState = store.$state
    
    // 深拷贝并清理响应式
    state[id] = JSON.parse(JSON.stringify(storeState))
  })
  
  return state
}

/**
 * 生成 Pinia 状态注入
 */
export function generatePiniaScript(pinia: any): string {
  const state = serializePiniaState(pinia)
  return generateStateScript(state, '__PINIA__')
}

/**
 * 客户端恢复 Pinia 状态
 */
export function hydratePiniaState(pinia: any): void {
  const state = getSSRState<Record<string, unknown>>('__PINIA__')
  
  if (!state) return
  
  for (const [id, storeState] of Object.entries(state)) {
    const store = pinia._s.get(id)
    if (store) {
      store.$patch(storeState)
    }
  }
}
```

## 循环引用处理

```typescript
/**
 * 处理循环引用的序列化
 */
export function serializeWithCycles(obj: unknown): string {
  const seen = new WeakMap<object, string>()
  let pathIndex = 0
  
  function serialize(value: unknown, path: string): unknown {
    // 基本类型直接返回
    if (value === null || typeof value !== 'object') {
      return value
    }
    
    // 检查循环引用
    if (seen.has(value)) {
      return { __ref: seen.get(value) }
    }
    
    // 记录路径
    seen.set(value, path)
    
    // 数组
    if (Array.isArray(value)) {
      return value.map((item, index) => 
        serialize(item, `${path}[${index}]`)
      )
    }
    
    // 对象
    const result: Record<string, unknown> = {}
    for (const key in value) {
      result[key] = serialize(
        (value as Record<string, unknown>)[key],
        `${path}.${key}`
      )
    }
    
    return result
  }
  
  return JSON.stringify(serialize(obj, '$'))
}

/**
 * 恢复循环引用
 */
export function deserializeWithCycles<T>(json: string): T {
  const obj = JSON.parse(json)
  
  function getByPath(root: unknown, path: string): unknown {
    const parts = path.match(/[^.[\]]+/g) || []
    let current = root
    
    for (const part of parts.slice(1)) { // 跳过 $
      current = (current as any)[part]
    }
    
    return current
  }
  
  function restore(value: unknown, root: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value
    }
    
    // 恢复引用
    if ('__ref' in value) {
      return getByPath(root, (value as any).__ref)
    }
    
    // 递归处理
    if (Array.isArray(value)) {
      return value.map(item => restore(item, root))
    }
    
    const result: Record<string, unknown> = {}
    for (const key in value) {
      result[key] = restore((value as Record<string, unknown>)[key], root)
    }
    
    return result
  }
  
  return restore(obj, obj) as T
}
```

## 大数据优化

```typescript
/**
 * 分块序列化大对象
 */
export function serializeLargeState(
  state: unknown,
  chunkSize: number = 64 * 1024
): string[] {
  const json = serializeState(state)
  
  if (json.length <= chunkSize) {
    return [json]
  }
  
  const chunks: string[] = []
  let offset = 0
  
  while (offset < json.length) {
    chunks.push(json.slice(offset, offset + chunkSize))
    offset += chunkSize
  }
  
  return chunks
}

/**
 * 生成分块加载脚本
 */
export function generateChunkedStateScript(
  chunks: string[],
  variableName: string = '__SSR_STATE__'
): string {
  if (chunks.length === 1) {
    return generateStateScript(JSON.parse(chunks[0]), variableName)
  }
  
  const script = `
<script>
(function(){
  var chunks = ${JSON.stringify(chunks)};
  var json = chunks.join('');
  window.${variableName} = JSON.parse(json);
})();
</script>`
  
  return script.trim()
}

/**
 * 延迟加载状态
 */
export function generateLazyStateScript(
  state: unknown,
  variableName: string = '__SSR_STATE__'
): string {
  const serialized = serializeStateForHTML(state)
  
  return `
<script type="application/json" id="${variableName}">${serialized}</script>
<script>
window.${variableName} = null;
window.getSSRState = function() {
  if (!window.${variableName}) {
    var el = document.getElementById('${variableName}');
    window.${variableName} = JSON.parse(el.textContent);
  }
  return window.${variableName};
};
</script>`
}
```

## 使用示例

```typescript
// 服务端
const context = createSSRContext()
const collector = new StateCollector()

// 渲染应用
const html = await renderToString(vnode, context)

// 收集 Pinia 状态
if (pinia) {
  collector.setStoreState('user', pinia._s.get('user').$state)
  collector.setStoreState('cart', pinia._s.get('cart').$state)
}

// 收集其他数据
collector.set('config', appConfig)

// 生成完整 HTML
const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>SSR App</title>
</head>
<body>
  <div id="app">${html}</div>
  ${collector.generateScript()}
  <script type="module" src="/app.js"></script>
</body>
</html>
`

// 客户端
import { createApp } from 'vue'
import { createPinia } from 'pinia'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// 恢复 Pinia 状态
hydratePiniaState(pinia)

// 挂载应用
app.mount('#app')
```

## 小结

本章实现了状态序列化系统：

1. **基础序列化**：JSON.stringify 和 replacer
2. **XSS 防护**：转义危险字符
3. **特殊类型**：Date、RegExp、Map、Set
4. **反序列化**：客户端状态恢复
5. **状态收集**：统一管理 SSR 状态
6. **Pinia 集成**：store 状态序列化
7. **循环引用**：处理复杂对象图
8. **大数据优化**：分块和延迟加载

正确的状态序列化确保了服务端和客户端的数据一致性。
