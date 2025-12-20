# npm 深度使用指南

你真的了解 npm 吗？

作为前端开发者，你每天都在使用 npm：`npm install`、`npm run dev`、`npm publish`。但 npm 的能力远不止这些。

本章我们将深入探索 npm 的高级功能，让你从"会用"到"精通"。

## package.json 深度解析

`package.json` 是每个 Node.js 项目的核心配置文件。让我们逐字段理解它：

### 基础字段

```json
{
  "name": "my-awesome-package",
  "version": "1.0.0",
  "description": "一个优秀的 Node.js 包",
  "keywords": ["nodejs", "example"],
  "author": "Your Name <you@example.com>",
  "license": "MIT"
}
```

**name 规则**：
- 全小写
- 可以使用连字符 `-` 和下划线 `_`
- 不能以点 `.` 或下划线 `_` 开头
- 作用域包格式：`@scope/package-name`

**version 规则**：
- 遵循语义化版本：`major.minor.patch`
- 可以加预发布标签：`1.0.0-beta.1`

### 入口字段

```json
{
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.js"
    }
  }
}
```

| 字段 | 用途 | 说明 |
|------|------|------|
| `main` | CommonJS 入口 | `require('pkg')` 使用 |
| `module` | ESM 入口 | 打包工具识别 |
| `types` | TypeScript 类型 | IDE 和 tsc 使用 |
| `exports` | 条件导出 | 现代推荐方式 |

**exports 的优势**：
- 可以限制包的公开 API
- 支持条件导出（开发/生产、CJS/ESM）
- 防止用户导入内部文件

### 脚本字段

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "build": "tsc",
    "test": "jest",
    "lint": "eslint src/",
    "prepare": "husky install"
  }
}
```

### 依赖字段

```json
{
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "peerDependencies": {
    "react": ">=16.8.0"
  },
  "optionalDependencies": {
    "fsevents": "^2.3.0"
  }
}
```

## 依赖管理详解

### 依赖类型

| 类型 | 安装命令 | 用途 |
|------|----------|------|
| `dependencies` | `npm install pkg` | 运行时依赖 |
| `devDependencies` | `npm install -D pkg` | 开发时依赖 |
| `peerDependencies` | - | 插件的宿主依赖 |
| `optionalDependencies` | `npm install -O pkg` | 可选依赖 |

### 版本范围语法

```json
{
  "dependencies": {
    "exact": "1.2.3",
    "patch": "~1.2.3",
    "minor": "^1.2.3",
    "range": ">=1.0.0 <2.0.0",
    "any": "*",
    "latest": "latest",
    "git": "git+https://github.com/user/repo.git#v1.0.0",
    "local": "file:../my-local-package"
  }
}
```

**最常用的版本范围**：

| 符号 | 含义 | 示例 |
|------|------|------|
| `^` | 允许 minor 和 patch 更新 | `^1.2.3` → `>=1.2.3 <2.0.0` |
| `~` | 只允许 patch 更新 | `~1.2.3` → `>=1.2.3 <1.3.0` |
| 无符号 | 精确版本 | `1.2.3` → 只匹配 `1.2.3` |

**实践建议**：
- 应用项目：使用 `^` 或 `~`，保持更新
- 库项目：考虑更宽松的范围，兼容更多版本

## npm scripts 高级用法

### 生命周期钩子

```json
{
  "scripts": {
    "pretest": "npm run lint",
    "test": "jest",
    "posttest": "npm run coverage",
    
    "prebuild": "rm -rf dist",
    "build": "tsc",
    "postbuild": "npm run copy-assets"
  }
}
```

钩子执行顺序：`pre<script>` → `<script>` → `post<script>`

### 特殊生命周期

```json
{
  "scripts": {
    "prepare": "husky install",
    "prepublishOnly": "npm run build && npm test",
    "postinstall": "patch-package"
  }
}
```

| 钩子 | 触发时机 |
|------|----------|
| `prepare` | `npm install` 后、`npm publish` 前 |
| `prepublishOnly` | 仅 `npm publish` 前 |
| `postinstall` | `npm install` 完成后 |

### 并行执行脚本

```bash
# 安装 npm-run-all
npm install -D npm-run-all

# package.json
{
  "scripts": {
    "build:js": "esbuild src/*.js",
    "build:css": "postcss src/*.css",
    "build": "npm-run-all --parallel build:*"
  }
}
```

### 跨平台环境变量

```bash
# 安装 cross-env
npm install -D cross-env

# package.json
{
  "scripts": {
    "build:dev": "cross-env NODE_ENV=development webpack",
    "build:prod": "cross-env NODE_ENV=production webpack"
  }
}
```

## 常用命令进阶

### 依赖检查

```bash
# 查看顶层依赖
npm ls --depth=0

# 查看过期的依赖
npm outdated

# 检查安全漏洞
npm audit

# 自动修复漏洞
npm audit fix

# 强制修复（可能有破坏性更新）
npm audit fix --force
```

### 依赖管理

```bash
# 更新依赖
npm update

# 清理未使用的依赖
npm prune

# 去重依赖
npm dedupe

# 查看依赖为什么被安装
npm explain <package>
```

### 包管理

```bash
# 打包为 tarball（不发布）
npm pack

# 本地链接开发
cd my-library
npm link

cd my-app
npm link my-library

# 查看包信息
npm view express

# 查看包的所有版本
npm view express versions
```

### 配置管理

```bash
# 查看所有配置
npm config list -l

# 设置配置
npm config set save-exact true

# 获取配置
npm config get registry

# 删除配置
npm config delete <key>
```

## 发布 npm 包

### 发布流程

```bash
# 1. 注册 npm 账号
npm adduser

# 2. 登录
npm login

# 3. 检查包名是否可用
npm search <package-name>

# 4. 发布
npm publish

# 5. 发布作用域包
npm publish --access public
```

### 版本管理

```bash
# 更新补丁版本：1.0.0 → 1.0.1
npm version patch

# 更新次版本：1.0.1 → 1.1.0
npm version minor

# 更新主版本：1.1.0 → 2.0.0
npm version major

# 预发布版本
npm version prerelease --preid=beta
# 1.0.0 → 1.0.1-beta.0
```

### 发布配置

```json
{
  "name": "@myorg/my-package",
  "version": "1.0.0",
  "files": [
    "dist",
    "README.md"
  ],
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**files 字段**：指定发布时包含的文件，其他文件不会被发布。

## .npmrc 配置

`.npmrc` 文件可以放在项目根目录或用户主目录：

```ini
# 镜像源
registry=https://registry.npmmirror.com/

# 作用域包使用私有源
@mycompany:registry=https://npm.mycompany.com/

# 精确保存版本
save-exact=true

# 严格检查 engines
engine-strict=true

# 安装时不生成 package-lock.json
package-lock=false

# 使用 legacy-peer-deps（解决 peerDependencies 冲突）
legacy-peer-deps=true
```

**配置优先级**：
1. 项目目录 `.npmrc`
2. 用户目录 `~/.npmrc`
3. 全局配置 `/etc/npmrc`
4. npm 内置默认值

## package-lock.json

`package-lock.json` 锁定了依赖的精确版本，确保团队成员安装相同的依赖。

### 核心原则

```bash
# 安装依赖时使用 ci 命令（CI/CD 环境）
npm ci  # 完全按照 lock 文件安装，更快更可靠

# 开发时使用 install
npm install  # 可能更新 lock 文件
```

### 常见问题

**lock 文件冲突**：
```bash
# 删除 lock 文件和 node_modules，重新安装
rm -rf node_modules package-lock.json
npm install
```

**版本不一致**：
```bash
# 确保 npm 版本一致
npm -v

# 团队统一 npm 版本
# .nvmrc 或 package.json engines
```

## 本章小结

- `package.json` 是项目的核心配置，需要理解每个重要字段
- 使用 `exports` 字段定义现代的包入口
- 理解 `^` 和 `~` 版本范围的区别
- npm scripts 支持生命周期钩子和并行执行
- 使用 `npm audit` 检查安全漏洞
- `.npmrc` 可以配置镜像源和各种选项
- 使用 `npm ci` 在 CI/CD 环境安装依赖

下一章，我们将学习 pnpm 这个现代包管理器。
