# 动态加载

在大型应用中，我们不希望打包所有语言包。动态加载让用户只下载需要的语言。

## 问题场景

```javascript
// 静态导入所有语言（不推荐）
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/fr'
import 'dayjs/locale/de'
// ... 100+ 语言，全部打包
```

## 动态导入方案

```javascript
// 按需加载
async function loadLocale(name) {
  try {
    await import(`dayjs/locale/${name}`)
    dayjs.locale(name)
    return true
  } catch (e) {
    console.warn(`Locale ${name} not found`)
    return false
  }
}

// 使用
await loadLocale('zh-cn')
dayjs().format('LLLL')  // 中文格式
```

## 封装语言加载器

```typescript
// src/utils/localeLoader.ts
interface LocaleLoader {
  load(name: string): Promise<boolean>
  isLoaded(name: string): boolean
  getLoaded(): string[]
}

const loadedLocales = new Set<string>(['en'])  // 英文内置

export function createLocaleLoader(): LocaleLoader {
  return {
    async load(name: string): Promise<boolean> {
      if (loadedLocales.has(name)) {
        dayjs.locale(name)
        return true
      }
      
      try {
        const module = await import(`dayjs/locale/${name}`)
        dayjs.locale(name, module.default)
        loadedLocales.add(name)
        return true
      } catch (e) {
        console.warn(`Failed to load locale: ${name}`)
        return false
      }
    },
    
    isLoaded(name: string): boolean {
      return loadedLocales.has(name)
    },
    
    getLoaded(): string[] {
      return Array.from(loadedLocales)
    }
  }
}

// 单例导出
export const localeLoader = createLocaleLoader()
```

## React 集成

```tsx
// hooks/useLocale.ts
import { useState, useEffect } from 'react'
import { localeLoader } from '../utils/localeLoader'

export function useLocale(localeName: string) {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    let cancelled = false
    
    async function load() {
      setLoading(true)
      setError(null)
      
      try {
        const success = await localeLoader.load(localeName)
        if (!cancelled) {
          setLoaded(success)
          if (!success) {
            setError(new Error(`Locale ${localeName} not found`))
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e as Error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    load()
    
    return () => {
      cancelled = true
    }
  }, [localeName])
  
  return { loaded, loading, error }
}

// 使用
function DateDisplay({ date, locale }) {
  const { loaded, loading } = useLocale(locale)
  
  if (loading) return <span>Loading...</span>
  if (!loaded) return <span>{dayjs(date).format()}</span>
  
  return <span>{dayjs(date).locale(locale).format('LLLL')}</span>
}
```

## Vue 集成

```typescript
// composables/useLocale.ts
import { ref, watch } from 'vue'
import { localeLoader } from '../utils/localeLoader'

export function useLocale(localeName: Ref<string>) {
  const loaded = ref(false)
  const loading = ref(true)
  const error = ref<Error | null>(null)
  
  watch(localeName, async (name) => {
    loading.value = true
    error.value = null
    
    try {
      loaded.value = await localeLoader.load(name)
      if (!loaded.value) {
        error.value = new Error(`Locale ${name} not found`)
      }
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }, { immediate: true })
  
  return { loaded, loading, error }
}

// 使用
const locale = ref('zh-cn')
const { loaded, loading } = useLocale(locale)
```

## 预加载策略

```typescript
// 根据用户设置预加载
async function preloadUserLocale() {
  const userLang = navigator.language.toLowerCase()
  
  // 映射浏览器语言到 dayjs locale
  const localeMap: Record<string, string> = {
    'zh-cn': 'zh-cn',
    'zh-tw': 'zh-tw',
    'zh': 'zh-cn',
    'en-us': 'en',
    'en-gb': 'en-gb',
    'ja': 'ja',
    'ko': 'ko'
  }
  
  const dayjsLocale = localeMap[userLang] || 'en'
  await localeLoader.load(dayjsLocale)
}

// 应用启动时调用
preloadUserLocale()
```

## 缓存与持久化

```typescript
// 使用 localStorage 记住用户选择
const LOCALE_KEY = 'app_locale'

export function getSavedLocale(): string {
  return localStorage.getItem(LOCALE_KEY) || 'en'
}

export function saveLocale(name: string): void {
  localStorage.setItem(LOCALE_KEY, name)
}

// 启动时加载保存的语言
async function initLocale() {
  const saved = getSavedLocale()
  await localeLoader.load(saved)
}
```

## 语言切换组件

```tsx
// components/LocaleSwitch.tsx
import { useState, useEffect } from 'react'
import { localeLoader } from '../utils/localeLoader'

const AVAILABLE_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'zh-cn', name: '简体中文' },
  { code: 'zh-tw', name: '繁體中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' }
]

interface Props {
  value: string
  onChange: (locale: string) => void
}

export function LocaleSwitch({ value, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  
  async function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const newLocale = e.target.value
    setLoading(true)
    
    const success = await localeLoader.load(newLocale)
    if (success) {
      onChange(newLocale)
      saveLocale(newLocale)
    }
    
    setLoading(false)
  }
  
  return (
    <select value={value} onChange={handleChange} disabled={loading}>
      {AVAILABLE_LOCALES.map(locale => (
        <option key={locale.code} value={locale.code}>
          {locale.name}
        </option>
      ))}
    </select>
  )
}
```

## Webpack/Vite 配置

确保动态导入正确分割：

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 可选：将常用语言打包在一起
          'dayjs-locales-common': [
            'dayjs/locale/zh-cn',
            'dayjs/locale/en',
            'dayjs/locale/ja'
          ]
        }
      }
    }
  }
}
```

## 测试用例

```typescript
describe('Dynamic Locale Loading', () => {
  beforeEach(() => {
    dayjs.locale('en')  // 重置
  })

  it('should load locale dynamically', async () => {
    const loader = createLocaleLoader()
    
    expect(loader.isLoaded('zh-cn')).toBe(false)
    
    const success = await loader.load('zh-cn')
    
    expect(success).toBe(true)
    expect(loader.isLoaded('zh-cn')).toBe(true)
    expect(dayjs().locale()).toBe('zh-cn')
  })

  it('should handle missing locale', async () => {
    const loader = createLocaleLoader()
    
    const success = await loader.load('invalid-locale')
    
    expect(success).toBe(false)
  })

  it('should not reload already loaded locale', async () => {
    const loader = createLocaleLoader()
    
    await loader.load('zh-cn')
    const startTime = performance.now()
    await loader.load('zh-cn')  // 应该立即返回
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(10)
  })

  it('should track loaded locales', async () => {
    const loader = createLocaleLoader()
    
    await loader.load('zh-cn')
    await loader.load('ja')
    
    const loaded = loader.getLoaded()
    expect(loaded).toContain('en')
    expect(loaded).toContain('zh-cn')
    expect(loaded).toContain('ja')
  })
})
```

## 小结

本章实现了语言动态加载：

- **按需加载**：使用动态 import 只加载需要的语言
- **加载状态**：跟踪加载中、已加载、错误状态
- **框架集成**：React/Vue hooks 封装
- **用户体验**：预加载、缓存、语言切换

动态加载是构建国际化应用的关键优化手段。
