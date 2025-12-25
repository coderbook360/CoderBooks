---
sidebar_position: 104
title: "版本迁移"
---

# 版本迁移

本章介绍 RxJS 版本迁移策略和最佳实践。

## RxJS 版本演进

### 主要版本变化

| 版本 | 主要变化 |
|------|---------|
| 5.x | 完全重写，引入 lettable operators |
| 6.x | pipe 操作符，新导入路径 |
| 7.x | 更小体积，更好的类型，移除弃用 API |

### 重要变更概览

**RxJS 6 → 7**：
- 移除 `rxjs-compat`
- `toPromise()` 弃用，使用 `firstValueFrom` / `lastValueFrom`
- `throwError` 接受工厂函数
- 类型改进

**RxJS 5 → 6**：
- 新导入路径
- `pipe` 操作符
- 操作符重命名（`do` → `tap`，`catch` → `catchError`）

## 渐进式迁移策略

### 1. 使用兼容层

```javascript
// 安装兼容包
// npm install rxjs-compat

// 保持旧代码运行
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/filter'

// 新代码使用新语法
import { map, filter } from 'rxjs/operators'
```

### 2. 自动迁移工具

```bash
# RxJS 5 → 6
npx rxjs-tslint-rules --fix

# 或使用 rxjs-codemods
npx rxjs-codemods
```

### 3. 手动迁移清单

```javascript
// 旧语法
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/filter'

observable.map(x => x * 2).filter(x => x > 5)

// 新语法
import { Observable } from 'rxjs'
import { map, filter } from 'rxjs/operators'

observable.pipe(
  map(x => x * 2),
  filter(x => x > 5)
)
```

## 导入路径迁移

### 创建函数

```javascript
// 旧（RxJS 5）
import { Observable } from 'rxjs/Observable'
import { of } from 'rxjs/observable/of'
import { from } from 'rxjs/observable/from'

// 新（RxJS 6+）
import { Observable, of, from } from 'rxjs'
```

### 操作符

```javascript
// 旧（RxJS 5）
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/switchMap'

// 新（RxJS 6+）
import { map, filter, switchMap } from 'rxjs/operators'
```

### Subject

```javascript
// 旧（RxJS 5）
import { Subject } from 'rxjs/Subject'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'

// 新（RxJS 6+）
import { Subject, BehaviorSubject } from 'rxjs'
```

## 操作符重命名

### 关键重命名

```javascript
// RxJS 5 → RxJS 6+
do         → tap
catch      → catchError
switch     → switchAll
finally    → finalize
throw      → throwError (函数)
```

### 迁移示例

```javascript
// 旧
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/finally'

observable
  .do(x => console.log(x))
  .catch(err => Observable.of(fallback))
  .finally(() => cleanup())

// 新
import { tap, catchError, finalize } from 'rxjs/operators'
import { of } from 'rxjs'

observable.pipe(
  tap(x => console.log(x)),
  catchError(err => of(fallback)),
  finalize(() => cleanup())
)
```

## RxJS 7 特定迁移

### toPromise 替代

```javascript
// 旧（弃用）
const value = await source$.toPromise()

// 新
import { firstValueFrom, lastValueFrom } from 'rxjs'

// 获取第一个值
const first = await firstValueFrom(source$)

// 获取最后一个值
const last = await lastValueFrom(source$)

// 处理空流
const value = await firstValueFrom(source$, { defaultValue: null })
```

### throwError 工厂函数

```javascript
// 旧（仍可用但不推荐）
throwError(new Error('fail'))

// 新（推荐）
throwError(() => new Error('fail'))

// 为什么？延迟创建错误，堆栈跟踪更准确
```

### 类型改进

```javascript
// RxJS 7 中 Observable<unknown> 更严格

// 可能需要显式类型
const subject = new Subject<string>()  // 不是 Subject<any>

// 操作符类型推断更好
source$.pipe(
  map(x => x.value)  // x 类型自动推断
)
```

## 自定义迁移工具

### 创建迁移脚本

```javascript
// scripts/migrate-rxjs.js
import { Project } from 'ts-morph'

const project = new Project({
  tsConfigFilePath: './tsconfig.json'
})

const sourceFiles = project.getSourceFiles()

const operatorRenames = {
  'do': 'tap',
  'catch': 'catchError',
  'switch': 'switchAll',
  'finally': 'finalize'
}

sourceFiles.forEach(file => {
  let modified = false
  
  // 查找旧导入
  file.getImportDeclarations().forEach(imp => {
    const moduleSpecifier = imp.getModuleSpecifierValue()
    
    // 迁移操作符导入
    if (moduleSpecifier.startsWith('rxjs/add/operator/')) {
      const operator = moduleSpecifier.split('/').pop()
      const newName = operatorRenames[operator] || operator
      
      // 添加新导入
      file.addImportDeclaration({
        namedImports: [newName],
        moduleSpecifier: 'rxjs/operators'
      })
      
      // 移除旧导入
      imp.remove()
      modified = true
    }
  })
  
  if (modified) {
    file.saveSync()
    console.log(`Updated: ${file.getFilePath()}`)
  }
})
```

### 验证迁移

```javascript
// scripts/verify-migration.js
import { Project } from 'ts-morph'

const project = new Project({
  tsConfigFilePath: './tsconfig.json'
})

const issues = []

project.getSourceFiles().forEach(file => {
  const path = file.getFilePath()
  
  // 检查旧式导入
  file.getImportDeclarations().forEach(imp => {
    const spec = imp.getModuleSpecifierValue()
    
    if (spec.includes('rxjs/add/')) {
      issues.push({
        file: path,
        issue: `Old import style: ${spec}`
      })
    }
    
    if (spec.includes('rxjs/Observable')) {
      issues.push({
        file: path,
        issue: `Old Observable import: ${spec}`
      })
    }
  })
  
  // 检查 toPromise 使用
  if (file.getText().includes('.toPromise()')) {
    issues.push({
      file: path,
      issue: 'Deprecated toPromise() usage'
    })
  }
})

if (issues.length > 0) {
  console.log('Migration issues found:')
  issues.forEach(i => console.log(`  ${i.file}: ${i.issue}`))
  process.exit(1)
} else {
  console.log('✅ Migration verified')
}
```

## 测试迁移

### 迁移测试用例

```javascript
// 确保行为一致

describe('migration', () => {
  it('should work with new pipe syntax', () => {
    const result = []
    
    of(1, 2, 3).pipe(
      map(x => x * 2),
      filter(x => x > 2)
    ).subscribe(x => result.push(x))
    
    expect(result).toEqual([4, 6])
  })
  
  it('should use firstValueFrom instead of toPromise', async () => {
    const value = await firstValueFrom(of(1, 2, 3))
    expect(value).toBe(1)
  })
  
  it('should use tap instead of do', () => {
    const sideEffect = jest.fn()
    
    of(1).pipe(
      tap(sideEffect)
    ).subscribe()
    
    expect(sideEffect).toHaveBeenCalledWith(1)
  })
})
```

## 迁移清单

### 代码迁移

- [ ] 更新 rxjs 包版本
- [ ] 移除 rxjs-compat（如果有）
- [ ] 更新导入路径
- [ ] 使用 pipe() 语法
- [ ] 重命名操作符
- [ ] 替换 toPromise()
- [ ] 更新 throwError 使用

### 配置迁移

- [ ] 更新 package.json 依赖
- [ ] 更新 TypeScript 配置（如需要）
- [ ] 更新 webpack/rollup 配置
- [ ] 更新 lint 规则

### 验证

- [ ] 运行所有测试
- [ ] 检查类型错误
- [ ] 验证运行时行为
- [ ] 检查包大小变化

## 常见问题

### 类型不兼容

```typescript
// 问题：类型推断变化
const subject: Subject<any> = new Subject()  // RxJS 6
const subject = new Subject<unknown>()  // RxJS 7 更严格

// 解决：显式指定类型
const subject = new Subject<MyType>()
```

### 操作符找不到

```javascript
// 问题：操作符导入路径错误
import { map } from 'rxjs'  // ❌

// 解决：从 operators 导入
import { map } from 'rxjs/operators'  // ✅

// 或使用新的简化路径（RxJS 7.2+）
import { map } from 'rxjs'  // ✅ 在新版本中可用
```

### 行为变化

```javascript
// 问题：某些操作符行为可能变化

// share() 行为变化
// RxJS 6: share() 重置后重新订阅
// RxJS 7: share({ resetOnError: true }) 显式配置

// 解决：使用显式配置
source$.pipe(
  share({
    resetOnError: true,
    resetOnComplete: true,
    resetOnRefCountZero: true
  })
)
```

## 本章小结

- 使用兼容层进行渐进式迁移
- 自动化工具减少手动工作
- 注意操作符重命名
- toPromise 替换为 firstValueFrom/lastValueFrom
- 测试验证迁移正确性
- 建立迁移清单确保完整

下一章进入附录部分。
