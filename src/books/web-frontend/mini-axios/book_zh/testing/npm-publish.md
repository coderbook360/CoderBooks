# npm 发布流程

将 Mini-Axios 发布为 npm 包，让其他开发者可以使用。

## 本节目标

通过本节学习，你将掌握：

1. **完善 package.json 配置**：入口、类型、导出条件
2. **配置构建工具**：使用 tsup 生成多格式产物
3. **准备发布文件**：README、LICENSE、CHANGELOG
4. **执行发布流程**：测试、构建、发布
5. **设置 CI/CD 自动化**：GitHub Actions 自动发布

## 发布前准备

### 1. 完善 package.json

```json
{
  "name": "mini-axios",
  "version": "1.0.0",
  "description": "A minimal Axios implementation for learning purposes",
  
  // ========== 入口配置 ==========
  "main": "./dist/index.js",      // CommonJS 入口（Node.js require）
  "module": "./dist/index.mjs",   // ESM 入口（现代打包工具）
  "types": "./dist/index.d.ts",   // TypeScript 类型声明
  
  // ========== 条件导出（推荐） ==========
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",   // 类型（必须第一个）
      "import": "./dist/index.mjs",   // ESM
      "require": "./dist/index.js"    // CJS
    }
  },
  
  // ========== 发布文件 ==========
  "files": [
    "dist"    // 只发布 dist 目录
  ],
  
  // ========== 脚本 ==========
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "prepublishOnly": "npm run test && npm run build",  // 发布前自动执行
    "release": "npm run prepublishOnly && npm publish"
  },
  
  // ========== 元信息 ==========
  "keywords": [
    "axios",
    "http",
    "client",
    "request",
    "xhr",
    "fetch"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/mini-axios.git"
  },
  "bugs": {
    "url": "https://github.com/username/mini-axios/issues"
  },
  "homepage": "https://github.com/username/mini-axios#readme",
  
  // ========== 环境要求 ==========
  "engines": {
    "node": ">=16.0.0"
  },
  
  "peerDependencies": {},
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

**关键字段说明**：

| 字段 | 作用 | 注意事项 |
|------|------|---------|
| `main` | CJS 入口 | Node.js require() 使用 |
| `module` | ESM 入口 | 打包工具优先使用 |
| `types` | 类型声明 | TypeScript 项目必需 |
| `exports` | 条件导出 | Node.js 12.7+ 支持 |
| `files` | 发布内容 | 只包含必要文件 |
| `prepublishOnly` | 发布前钩子 | 自动测试和构建 |

### 2. 构建配置

使用 tsup 简化构建配置：

```typescript
// tsup.config.ts

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],      // 入口文件
  format: ['cjs', 'esm'],       // 输出 CJS 和 ESM 两种格式
  dts: true,                    // 生成 .d.ts 类型声明
  splitting: false,             // 不拆分代码
  sourcemap: true,              // 生成 sourcemap（调试用）
  clean: true,                  // 构建前清理 dist
  minify: true,                 // 压缩代码
  treeshake: true,              // Tree-shaking 移除未使用代码
  target: 'es2018',             // 目标环境
  outDir: 'dist',               // 输出目录
});
```

**输出结果**：

```
dist/
├── index.js       # CommonJS 格式
├── index.mjs      # ESM 格式
├── index.d.ts     # TypeScript 类型声明
└── index.js.map   # Sourcemap
```
```

### 3. 创建 README.md

```markdown
# Mini-Axios

A minimal Axios implementation for learning purposes.

## Installation

```bash
npm install mini-axios
```

## Usage

```typescript
import axios from 'mini-axios';

// GET 请求
const response = await axios.get('/api/users');

// POST 请求
await axios.post('/api/users', {
  name: 'Alice',
  email: 'alice@example.com',
});

// 创建实例
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});
```

## Features

- ✅ Promise-based API
- ✅ Request/Response interceptors
- ✅ Transform request/response data
- ✅ Cancel requests (CancelToken & AbortController)
- ✅ Automatic JSON handling
- ✅ TypeScript support
- ✅ Browser and Node.js support

## API

### axios(config)
### axios.get(url[, config])
### axios.post(url[, data[, config]])
### axios.put(url[, data[, config]])
### axios.delete(url[, config])
### axios.create(config)
### axios.interceptors.request.use(onFulfilled, onRejected)
### axios.interceptors.response.use(onFulfilled, onRejected)

## License

MIT
```

### 4. 创建 LICENSE

```
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 5. 创建 .npmignore

```
# 源代码
src/

# 测试
test/
*.test.ts
vitest.config.ts
coverage/

# 开发配置
.vscode/
.idea/
.git/
.gitignore

# 临时文件
*.log
.DS_Store
node_modules/

# 构建配置
tsconfig.json
tsup.config.ts
```

## 发布步骤

### 1. 注册 npm 账号

```bash
npm adduser
```

### 2. 登录

```bash
npm login
```

### 3. 检查包名是否可用

```bash
npm search mini-axios
```

如果包名已被占用，考虑使用 scoped 包名：

```json
{
  "name": "@your-username/mini-axios"
}
```

### 4. 构建并测试

```bash
npm run build
npm test
```

### 5. 检查发布内容

```bash
# 查看将要发布的文件
npm pack --dry-run

# 生成 tarball 预览
npm pack
```

### 6. 发布

```bash
# 发布公开包
npm publish

# 发布 scoped 公开包
npm publish --access public

# 发布 beta 版本
npm publish --tag beta
```

## 版本管理

### 语义化版本

- `MAJOR.MINOR.PATCH`（如 1.2.3）
- **MAJOR**：破坏性变更
- **MINOR**：新功能（向后兼容）
- **PATCH**：Bug 修复（向后兼容）

### 更新版本

```bash
# 更新 patch 版本 (1.0.0 -> 1.0.1)
npm version patch

# 更新 minor 版本 (1.0.0 -> 1.1.0)
npm version minor

# 更新 major 版本 (1.0.0 -> 2.0.0)
npm version major

# 预发布版本
npm version prerelease --preid=beta  # 1.0.0 -> 1.0.1-beta.0
```

### 发布标签

```bash
# 默认 latest 标签
npm publish

# beta 标签
npm publish --tag beta

# next 标签
npm publish --tag next

# 安装指定标签
npm install mini-axios@beta
```

## CI/CD 自动发布

### GitHub Actions

```yaml
# .github/workflows/publish.yml

name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 配置 NPM Token

1. 在 npm 网站生成 Access Token
2. 添加到 GitHub 仓库 Secrets
3. 命名为 `NPM_TOKEN`

## 发布后维护

### 撤销发布

```bash
# 24 小时内可撤销
npm unpublish mini-axios@1.0.0

# 强制撤销整个包
npm unpublish mini-axios --force
```

### 废弃版本

```bash
# 标记版本为废弃
npm deprecate mini-axios@1.0.0 "此版本有安全问题，请升级到 1.0.1"
```

### 查看包信息

```bash
npm info mini-axios
npm view mini-axios versions
```

## 发布检查清单

发布前确认以下所有项目：

- [ ] 版本号已更新（遵循语义化版本）
- [ ] CHANGELOG 已更新
- [ ] 所有测试通过
- [ ] 构建成功（dist 目录生成）
- [ ] README 内容准确
- [ ] 类型声明正确导出
- [ ] LICENSE 文件存在
- [ ] .npmignore 配置正确

## 常见问题解答

### Q: 语义化版本怎么用？

```
主版本.次版本.修订版本
1.2.3

- 主版本（1）：不兼容的 API 变更
- 次版本（2）：新增功能，向后兼容
- 修订版本（3）：Bug 修复，向后兼容
```

### Q: 如何发布测试版本？

```bash
# 发布 beta 版本
npm version 1.1.0-beta.1
npm publish --tag beta

# 用户安装 beta 版本
npm install mini-axios@beta
```

### Q: 发布后发现问题怎么办？

```bash
# 24 小时内可撤销
npm unpublish mini-axios@1.0.0

# 标记版本为废弃（推荐）
npm deprecate mini-axios@1.0.0 "存在安全问题，请升级到 1.0.1"
```

## 目录结构总览

发布完成后的完整项目结构：

```
mini-axios/
├── src/                     # 源代码
│   ├── index.ts
│   ├── core/
│   ├── adapters/
│   ├── helpers/
│   ├── cancel/
│   └── types/
├── dist/                    # 构建输出（发布内容）
│   ├── index.js             # CJS
│   ├── index.mjs            # ESM
│   └── index.d.ts           # 类型声明
├── test/                    # 测试代码
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md                # 项目说明
├── LICENSE                  # 开源协议
├── CHANGELOG.md             # 版本历史
└── .npmignore               # npm 忽略文件
```

## 小结

本节我们学习了完整的 npm 发布流程：

```
npm 发布流程
├── 1. 准备阶段
│   ├── 完善 package.json
│   ├── 配置构建工具（tsup）
│   ├── 编写 README.md
│   ├── 添加 LICENSE
│   └── 配置 .npmignore
├── 2. 测试阶段
│   ├── 运行单元测试
│   ├── 运行集成测试
│   └── 检查覆盖率
├── 3. 构建阶段
│   ├── 生成 CJS/ESM 产物
│   └── 生成类型声明
├── 4. 发布阶段
│   ├── 更新版本号
│   ├── npm publish
│   └── 创建 Git Tag
└── 5. 维护阶段
    ├── 版本管理
    ├── CI/CD 自动化
    └── 问题修复与更新
```

**核心要点**：

| 要点 | 说明 |
|------|------|
| 语义化版本 | major.minor.patch 规范 |
| 类型声明 | types 字段和 exports 配置 |
| 文档完整 | README、LICENSE、CHANGELOG |
| CI/CD | 自动化测试和发布 |

**发布命令速查**：

```bash
npm version patch    # 1.0.0 → 1.0.1（修复）
npm version minor    # 1.0.0 → 1.1.0（新功能）
npm version major    # 1.0.0 → 2.0.0（破坏性变更）
npm publish          # 发布到 npm
npm publish --tag beta  # 发布 beta 版
```

至此，Mini-Axios 的开发、测试、发布流程完成。
