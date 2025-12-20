# Node.js 版本管理与 LTS 策略

项目应该使用哪个 Node.js 版本？

这看似简单的问题，背后涉及版本选择策略、团队协作规范、项目长期维护等多个方面。

本章我们将学习 Node.js 的版本策略，以及如何优雅地管理多个 Node.js 版本。

## 理解 Node.js 版本号

Node.js 遵循**语义化版本**（Semantic Versioning）规范：

```
v20.10.0
 │  │  │
 │  │  └── 补丁版本（Patch）：bug 修复，向后兼容
 │  └───── 次版本（Minor）：新功能，向后兼容
 └──────── 主版本（Major）：可能有破坏性变更
```

**关键规则**：
- 偶数主版本（18, 20, 22）会进入 LTS
- 奇数主版本（19, 21, 23）是 Current 版本，不会成为 LTS

## LTS 策略详解

LTS（Long Term Support，长期支持）是 Node.js 的版本维护策略：

```
                      Current        Active LTS      Maintenance     End of Life
                     (6 个月)        (18 个月)        (12 个月)
                    ┌─────────┐    ┌───────────┐    ┌───────────┐
v20 ────────────────┤         ├────┤           ├────┤           ├────→ 停止维护
                    └─────────┘    └───────────┘    └───────────┘
                     新功能开发      生产环境推荐      仅安全更新
```

### 版本生命周期

以 Node.js 20 为例：

| 阶段 | 时间 | 特点 |
|------|------|------|
| Current | 2023年4月-10月 | 最新功能，可能不稳定 |
| Active LTS | 2023年10月-2025年4月 | 稳定，推荐生产使用 |
| Maintenance | 2025年4月-2026年4月 | 仅关键 bug 和安全修复 |
| End of Life | 2026年4月后 | 不再维护 |

### 如何选择版本

**生产环境**：选择 Active LTS 版本
```bash
# 查看当前 LTS 版本
# 访问 https://nodejs.org/en/about/releases/
# 或查看 https://github.com/nodejs/Release
```

**开发尝鲜**：可以用 Current 版本体验新特性

**遗留项目**：至少保持在 Maintenance 阶段，避免安全风险

## 版本管理工具

在实际开发中，你可能需要同时维护多个项目，每个项目使用不同的 Node.js 版本。版本管理工具让这变得简单。

### nvm（Unix/macOS）

nvm 是最流行的 Node.js 版本管理工具：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装指定版本
nvm install 20
nvm install 18
nvm install node  # 安装最新版

# 切换版本
nvm use 20
nvm use 18

# 设置默认版本
nvm alias default 20

# 查看已安装版本
nvm ls

# 查看可安装版本
nvm ls-remote
```

### nvm-windows（Windows）

Windows 用户使用专门的 nvm-windows：

```powershell
# 下载安装包：https://github.com/coreybutler/nvm-windows/releases

# 安装版本
nvm install 20.10.0
nvm install 18.19.0

# 切换版本（需要管理员权限）
nvm use 20.10.0

# 查看已安装版本
nvm list
```

### fnm（推荐，跨平台）

fnm 是更快的 Node.js 版本管理器，用 Rust 编写：

```bash
# 安装 fnm
# macOS/Linux
curl -fsSL https://fnm.vercel.app/install | bash

# Windows (Scoop)
scoop install fnm

# 基本用法
fnm install 20
fnm use 20
fnm default 20

# 自动切换（根据 .node-version 文件）
fnm install
fnm use
```

**fnm 的优势**：
- 比 nvm 快 10 倍以上
- 跨平台统一体验
- 支持 `.node-version` 和 `.nvmrc`

## 项目版本锁定

团队协作时，确保每个人使用相同的 Node.js 版本很重要。

### .nvmrc 文件

```bash
# 项目根目录创建 .nvmrc
echo "20" > .nvmrc

# 团队成员进入项目后
nvm use  # 自动读取 .nvmrc 并切换版本
```

### .node-version 文件

```bash
# 更通用的格式，被多个工具支持
echo "20.10.0" > .node-version
```

### package.json 的 engines 字段

```json
{
  "name": "my-project",
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

配合 `npm config set engine-strict true`，安装依赖时会检查版本。

### 完整的版本锁定方案

```bash
# 项目结构
my-project/
├── .nvmrc           # 供 nvm 使用
├── .node-version    # 供 fnm 等使用
└── package.json     # engines 字段约束
```

```
# .nvmrc
20
```

```
# .node-version
20.10.0
```

```json
// package.json
{
  "engines": {
    "node": "^20.10.0"
  }
}
```

## 版本升级指南

升级 Node.js 版本需要谨慎，特别是主版本升级。

### 升级检查清单

1. **查看 Breaking Changes**
   ```bash
   # 访问 Node.js 发布说明
   # https://github.com/nodejs/node/blob/main/CHANGELOG.md
   ```

2. **检查依赖兼容性**
   ```bash
   npm outdated
   npx npm-check-updates
   ```

3. **运行测试套件**
   ```bash
   npm test
   ```

4. **更新 CI/CD 配置**
   ```yaml
   # .github/workflows/ci.yml
   strategy:
     matrix:
       node-version: [18.x, 20.x]
   ```

### 常见升级问题

**1. 原生模块需要重新编译**
```bash
npm rebuild
# 或删除 node_modules 重新安装
rm -rf node_modules
npm install
```

**2. 某些 API 被废弃**
```javascript
// 例如 v17+ 移除了 dns.lookup 的某些选项
// 检查代码中是否使用了废弃 API
```

**3. ES Modules 行为变化**
```javascript
// 新版本对 ESM 支持更完善，但也可能有细微差异
// 注意检查模块加载相关的代码
```

## 实践建议

### 个人开发

```bash
# 安装 fnm
curl -fsSL https://fnm.vercel.app/install | bash

# 安装最新 LTS
fnm install --lts

# 设为默认
fnm default <version>
```

### 团队协作

```bash
# 项目根目录
echo "20" > .nvmrc
echo "20.10.0" > .node-version

# package.json
{
  "engines": {
    "node": "^20.0.0"
  }
}

# 项目 README 中说明
## 环境要求
- Node.js 20.x（使用 `nvm use` 或 `fnm use` 自动切换）
```

### CI/CD 配置

```yaml
# GitHub Actions 示例
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

## 本章小结

- Node.js 偶数版本进入 LTS，生产环境应使用 Active LTS
- 使用 nvm、fnm 等工具管理多个 Node.js 版本
- 通过 `.nvmrc`、`.node-version`、`engines` 锁定项目版本
- 版本升级前检查 Breaking Changes 和依赖兼容性
- 推荐使用 fnm：更快、跨平台、支持自动切换

下一章，我们将深入学习 npm 的高级用法。
