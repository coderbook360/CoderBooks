# pnpm 与现代包管理

为什么需要另一个包管理器？

npm 已经很好用了，为什么还要学习 pnpm？答案在于：**更快、更省空间、更严格**。

本章我们将了解 pnpm 的设计理念和使用方法，帮你决定是否在项目中采用它。

## pnpm 的核心优势

### 1. 节省磁盘空间

npm 的问题：每个项目都有独立的 `node_modules`，相同的包被复制多次。

```
project-a/node_modules/lodash/  (1.4MB)
project-b/node_modules/lodash/  (1.4MB)
project-c/node_modules/lodash/  (1.4MB)
# 3 个项目 = 4.2MB
```

pnpm 的解决方案：所有包存储在全局 store，项目中使用硬链接。

```
~/.pnpm-store/v3/files/...   (1.4MB - 只存一份)
project-a/node_modules/lodash → 硬链接
project-b/node_modules/lodash → 硬链接
project-c/node_modules/lodash → 硬链接
# 3 个项目 = 1.4MB
```

**节省比例**：大型项目可节省 50%-80% 的磁盘空间。

### 2. 安装速度更快

由于包只需要从 store 链接而非复制，pnpm 的安装速度通常比 npm 快 2-3 倍。

### 3. 更严格的依赖管理

npm 的扁平化结构允许访问未声明的依赖：

```javascript
// package.json 只声明了 express
// 但可以直接使用 express 的依赖
const bodyParser = require('body-parser'); // npm 允许，但这是幽灵依赖！
```

pnpm 的嵌套结构阻止了这种行为：

```javascript
// pnpm 会报错：Module not found
// 必须显式声明依赖
```

这被称为**幽灵依赖**（Phantom Dependencies）问题，pnpm 从根本上解决了它。

## node_modules 结构对比

### npm 的扁平化结构

```
node_modules/
├── express/
├── body-parser/        # express 的依赖被提升
├── accepts/            # body-parser 的依赖也被提升
├── debug/
└── ...                 # 所有依赖在同一层级
```

### pnpm 的嵌套结构

```
node_modules/
├── .pnpm/                              # 真实文件存放处
│   ├── express@4.18.0/
│   │   └── node_modules/
│   │       ├── express/                # 包本身
│   │       ├── body-parser → ../../body-parser@1.20.0/...
│   │       └── debug → ../../debug@4.3.0/...
│   ├── body-parser@1.20.0/
│   │   └── node_modules/
│   │       └── body-parser/
│   └── ...
├── express → .pnpm/express@4.18.0/.../express   # 符号链接
└── ...
```

**关键点**：
- 顶层 `node_modules` 只有直接依赖的符号链接
- 真实文件在 `.pnpm` 目录
- 每个包只能访问自己声明的依赖

## pnpm 基本使用

### 安装 pnpm

```bash
# 使用 npm 安装
npm install -g pnpm

# 使用 Corepack（Node.js 16.9+）
corepack enable
corepack prepare pnpm@latest --activate

# macOS/Linux
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Windows
iwr https://get.pnpm.io/install.ps1 -useb | iex
```

### 常用命令对照

| npm | pnpm | 说明 |
|-----|------|------|
| `npm install` | `pnpm install` | 安装所有依赖 |
| `npm install pkg` | `pnpm add pkg` | 添加依赖 |
| `npm install -D pkg` | `pnpm add -D pkg` | 添加开发依赖 |
| `npm install -g pkg` | `pnpm add -g pkg` | 全局安装 |
| `npm uninstall pkg` | `pnpm remove pkg` | 移除依赖 |
| `npm run dev` | `pnpm dev` | 运行脚本 |
| `npx create-app` | `pnpm dlx create-app` | 执行包命令 |
| `npm update` | `pnpm update` | 更新依赖 |
| `npm audit` | `pnpm audit` | 安全审计 |

### 快捷命令

```bash
# pnpm 支持省略 run
pnpm dev        # 等同于 pnpm run dev
pnpm test       # 等同于 pnpm run test

# 执行 node_modules/.bin 中的命令
pnpm exec jest

# 临时执行（类似 npx）
pnpm dlx create-react-app my-app
```

## 配置 pnpm

### .npmrc 配置

pnpm 使用与 npm 相同的 `.npmrc` 文件：

```ini
# 镜像源
registry=https://registry.npmmirror.com/

# 允许访问未声明的依赖（兼容模式）
shamefully-hoist=true

# 自动安装 peerDependencies
auto-install-peers=true

# 不严格检查 peerDependencies
strict-peer-dependencies=false

# 并行安装的最大任务数
network-concurrency=16
```

### 兼容性配置

如果遇到某些包不兼容 pnpm 的严格模式：

```ini
# .npmrc
# 方式 1：全部提升（不推荐，但兼容性最好）
shamefully-hoist=true

# 方式 2：只提升特定包
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
```

## Monorepo 支持

pnpm 对 Monorepo 有出色的原生支持。

### 配置工作区

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - 'tools/*'
```

### 目录结构

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── packages/
│   ├── shared-utils/
│   │   └── package.json
│   └── ui-components/
│       └── package.json
└── apps/
    ├── web/
    │   └── package.json
    └── mobile/
        └── package.json
```

### 工作区命令

```bash
# 在所有包中运行命令
pnpm -r run build           # 递归执行 build
pnpm -r run test            # 递归执行 test

# 在特定包中运行命令
pnpm --filter @myorg/web run dev
pnpm --filter @myorg/web... run build  # 包括依赖
pnpm --filter ...@myorg/web run build  # 包括被依赖的包

# 添加依赖到特定包
pnpm --filter @myorg/web add lodash

# 包之间的依赖
pnpm --filter @myorg/web add @myorg/shared-utils
```

### 工作区协议

```json
// apps/web/package.json
{
  "dependencies": {
    "@myorg/shared-utils": "workspace:*",
    "@myorg/ui-components": "workspace:^1.0.0"
  }
}
```

`workspace:*` 表示使用工作区中的包，发布时会被替换为实际版本。

## 从 npm 迁移到 pnpm

### 迁移步骤

```bash
# 1. 安装 pnpm
npm install -g pnpm

# 2. 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 3. 使用 pnpm 安装
pnpm install

# 4. 更新 npm scripts
# 将 npm run 改为 pnpm
# 将 npx 改为 pnpm dlx 或 pnpm exec
```

### 常见问题

**问题 1：模块找不到**

```bash
# 可能是幽灵依赖问题
# 检查是否使用了未声明的依赖
pnpm add <missing-package>
```

**问题 2：某些工具不兼容**

```ini
# .npmrc
shamefully-hoist=true
```

**问题 3：CI/CD 配置**

```yaml
# GitHub Actions
- uses: pnpm/action-setup@v2
  with:
    version: 8
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'
- run: pnpm install
```

## 何时使用 pnpm

### 推荐使用 pnpm

- ✅ Monorepo 项目
- ✅ 开发机器磁盘空间有限
- ✅ 追求更快的安装速度
- ✅ 想要严格的依赖管理
- ✅ 新项目

### 谨慎考虑

- ⚠️ 团队成员对 pnpm 不熟悉
- ⚠️ 依赖大量旧包可能不兼容
- ⚠️ CI/CD 环境需要额外配置

### 继续使用 npm

- 项目已稳定运行
- 团队没有迁移动力
- 某些特定工具只支持 npm

## store 管理

```bash
# 查看 store 路径
pnpm store path

# 清理未使用的包
pnpm store prune

# 查看 store 状态
pnpm store status
```

## 本章小结

- pnpm 通过硬链接和内容寻址存储节省磁盘空间
- pnpm 的严格 node_modules 结构防止幽灵依赖
- 命令与 npm 类似，学习成本低
- 对 Monorepo 有出色的原生支持
- 使用 `pnpm-workspace.yaml` 配置工作区
- 迁移时注意幽灵依赖和兼容性问题

下一章，我们将学习如何搭建私有 npm 仓库。
