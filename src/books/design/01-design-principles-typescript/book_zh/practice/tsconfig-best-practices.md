# TypeScript 编译配置最佳实践

`tsconfig.json` 是 TypeScript 项目的核心配置文件。

正确配置可以提高类型安全性和开发体验。

## 推荐的严格配置

```json
{
  "compilerOptions": {
    // 严格模式（强烈推荐）
    "strict": true,
    
    // 额外的严格检查
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    
    // 模块系统
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // 目标和输出
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "declaration": true,
    
    // 路径和解析
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@components/*": ["./components/*"],
      "@utils/*": ["./utils/*"]
    },
    
    // 其他
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## strict 模式详解

`"strict": true` 等同于开启以下所有选项：

```json
{
  "compilerOptions": {
    "strictNullChecks": true,       // null/undefined 检查
    "strictFunctionTypes": true,    // 函数参数逆变检查
    "strictBindCallApply": true,    // bind/call/apply 类型检查
    "strictPropertyInitialization": true,  // 类属性初始化检查
    "noImplicitAny": true,          // 禁止隐式 any
    "noImplicitThis": true,         // 禁止隐式 this
    "alwaysStrict": true,           // 输出 "use strict"
    "useUnknownInCatchVariables": true  // catch 变量为 unknown
  }
}
```

### strictNullChecks

```typescript
// 开启前：危险
function getLength(str: string) {
  return str.length;  // str 可能是 null，但不报错
}

// 开启后：安全
function getLength(str: string | null) {
  if (str === null) return 0;
  return str.length;  // 此处 str 一定是 string
}
```

### noImplicitAny

```typescript
// 开启前：隐式 any
function process(data) {  // data: any
  return data.value;
}

// 开启后：必须显式类型
function process(data: { value: string }) {
  return data.value;
}
```

## 额外的严格选项

### noUncheckedIndexedAccess

```typescript
const arr = [1, 2, 3];

// 关闭：arr[10] 类型是 number
// 开启：arr[10] 类型是 number | undefined

// 开启后更安全
const value = arr[10];
if (value !== undefined) {
  console.log(value.toFixed(2));  // 安全
}
```

### noImplicitReturns

```typescript
// 开启前：不报错
function getValue(condition: boolean) {
  if (condition) {
    return 'yes';
  }
  // 隐式返回 undefined
}

// 开启后：报错，必须显式返回
function getValue(condition: boolean): string | undefined {
  if (condition) {
    return 'yes';
  }
  return undefined;  // 必须显式
}
```

### noFallthroughCasesInSwitch

```typescript
// 开启前：不报错（容易出错）
switch (value) {
  case 1:
    doSomething();
  case 2:  // 会 fallthrough
    doOther();
}

// 开启后：必须 break 或显式 fallthrough
switch (value) {
  case 1:
    doSomething();
    break;
  case 2:
    doOther();
    break;
}
```

## 模块配置

### moduleResolution

```json
{
  "compilerOptions": {
    // Node.js 项目
    "moduleResolution": "node",
    
    // 现代打包工具（Vite、esbuild）
    "moduleResolution": "bundler",
    
    // Node.js 16+ ESM
    "moduleResolution": "node16"
  }
}
```

### 路径别名

```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"],
      "@api/*": ["./api/*"],
      "@hooks/*": ["./hooks/*"],
      "@types/*": ["./types/*"]
    }
  }
}
```

使用：

```typescript
// 不用 ../../../
import { User } from '@types/user';
import { useAuth } from '@hooks/useAuth';
import { fetchUser } from '@api/user';
```

## 不同项目类型的配置

### React 项目

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

### Node.js 项目

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 库项目

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "emitDeclarationOnly": true
  },
  "include": ["src"]
}
```

## 项目引用（Monorepo）

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "composite": true
  }
}

// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": []
}

// packages/app/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [
    { "path": "../core" }
  ]
}
```

## 常见问题

### 问题 1：第三方库类型报错

```json
{
  "compilerOptions": {
    "skipLibCheck": true  // 跳过 node_modules 类型检查
  }
}
```

### 问题 2：JSON 导入

```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

### 问题 3：ESM 与 CJS 互操作

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

## 总结

**核心推荐**：
- 始终开启 `strict: true`
- 开启 `noUncheckedIndexedAccess`
- 使用 `bundler` 或 `node16` moduleResolution

**按项目类型配置**：
- React：添加 `jsx: "react-jsx"`
- Node.js：使用 `NodeNext` 模块
- 库：添加 `declaration` 和 `declarationMap`

**路径别名**：
- 使用 `baseUrl` + `paths` 简化导入
- 配合打包工具配置（Vite alias、webpack resolve）

**记住**：严格配置初期可能有阵痛，但长期收益远大于成本。
