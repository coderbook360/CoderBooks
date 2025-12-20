# 私有仓库与企业级 npm 管理

企业为什么不直接用 npmjs.com？

对于个人开发者，公开的 npm 仓库完全够用。但在企业环境中，有很多场景需要私有 npm 仓库：内部包不能公开、需要更快的安装速度、要控制依赖来源等。

本章我们将学习如何搭建和使用私有 npm 仓库，以及企业级 npm 管理的最佳实践。

## 为什么需要私有仓库

### 核心需求

**1. 代码保密**
- 公司内部的工具库、业务组件不能公开
- 包含敏感信息或商业逻辑的代码

**2. 网络性能**
- 减少对外网的依赖
- 通过缓存加速安装速度
- 支持内网环境开发

**3. 安全控制**
- 审核依赖来源
- 阻止恶意包
- 满足合规要求

**4. 版本控制**
- 冻结特定版本
- 防止上游包意外变更
- 确保构建可重复

## 私有仓库方案对比

| 方案 | 类型 | 优点 | 缺点 | 适用场景 |
|------|------|------|------|----------|
| Verdaccio | 开源 | 轻量、易部署 | 功能相对简单 | 中小团队 |
| Nexus | 企业级 | 多仓库类型支持 | 学习成本高 | 大型企业 |
| Artifactory | 企业级 | 功能完整 | 付费 | 大型企业 |
| GitHub Packages | 云服务 | 与 GitHub 集成 | 绑定 GitHub | GitHub 用户 |
| npm Enterprise | 官方方案 | 与 npm 完美兼容 | 价格较高 | npm 深度用户 |

对于大多数团队，**Verdaccio** 是最佳起步选择：开源、轻量、5 分钟就能跑起来。

## Verdaccio 快速搭建

### 本地安装

```bash
# 安装
npm install -g verdaccio

# 启动
verdaccio

# 访问 http://localhost:4873
```

启动后，你会看到一个简洁的 Web 界面。

### Docker 部署

```bash
# 快速启动
docker run -d --name verdaccio -p 4873:4873 verdaccio/verdaccio

# 带持久化存储
docker run -d \
  --name verdaccio \
  -p 4873:4873 \
  -v verdaccio-storage:/verdaccio/storage \
  -v verdaccio-conf:/verdaccio/conf \
  verdaccio/verdaccio
```

### Docker Compose 生产部署

```yaml
# docker-compose.yml
version: '3.8'

services:
  verdaccio:
    image: verdaccio/verdaccio:5
    container_name: verdaccio
    ports:
      - "4873:4873"
    volumes:
      - ./storage:/verdaccio/storage
      - ./conf:/verdaccio/conf
      - ./plugins:/verdaccio/plugins
    environment:
      - VERDACCIO_PORT=4873
    restart: unless-stopped
```

### 配置文件详解

Verdaccio 的配置文件是 `config.yaml`：

```yaml
# 存储路径
storage: ./storage

# 认证配置
auth:
  htpasswd:
    file: ./htpasswd
    max_users: 100  # -1 表示禁止注册

# 上游仓库（代理 npmjs.org）
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    timeout: 30s
    maxage: 10m
    cache: true

# 包访问规则
packages:
  # 私有作用域包
  '@mycompany/*':
    access: $authenticated    # 需要登录
    publish: $authenticated   # 需要登录
    unpublish: $authenticated
    
  # 公开包
  '**':
    access: $all              # 所有人可访问
    publish: $authenticated   # 需要登录才能发布
    proxy: npmjs              # 代理到 npmjs

# Web 界面配置
web:
  title: My Company NPM Registry
  logo: https://example.com/logo.png
  
# 服务器配置
server:
  keepAliveTimeout: 60

# 日志配置
logs:
  - { type: stdout, format: pretty, level: info }
```

## 使用私有仓库

### 配置 npm 使用私有仓库

**方式 1：全局配置**

```bash
npm config set registry http://localhost:4873/
```

**方式 2：项目级配置（推荐）**

```ini
# 项目根目录 .npmrc
registry=http://localhost:4873/
```

**方式 3：作用域配置（推荐）**

```ini
# .npmrc
# 私有包使用私有仓库
@mycompany:registry=http://localhost:4873/

# 其他包使用镜像
registry=https://registry.npmmirror.com/
```

### 用户认证

```bash
# 添加用户（注册）
npm adduser --registry http://localhost:4873/

# 登录
npm login --registry http://localhost:4873/

# 验证登录状态
npm whoami --registry http://localhost:4873/
```

### 发布包到私有仓库

```bash
# 确保 package.json 中有正确的作用域
{
  "name": "@mycompany/my-package",
  "version": "1.0.0"
}

# 发布
npm publish --registry http://localhost:4873/
```

或者在 `package.json` 中配置：

```json
{
  "name": "@mycompany/my-package",
  "publishConfig": {
    "registry": "http://localhost:4873/"
  }
}
```

## 多源配置

实际项目中，通常需要同时使用私有仓库和公共仓库。

### 使用 nrm 管理多个源

```bash
# 安装 nrm
npm install -g nrm

# 添加私有源
nrm add company http://localhost:4873/

# 查看所有源
nrm ls

# 切换源
nrm use company
nrm use npm

# 测试源速度
nrm test
```

### 推荐的 .npmrc 配置

```ini
# 默认使用国内镜像
registry=https://registry.npmmirror.com/

# 私有包使用私有仓库
@mycompany:registry=http://npm.mycompany.com/
//npm.mycompany.com/:_authToken=${NPM_TOKEN}

# 可选：某些特定包使用官方源
#@types:registry=https://registry.npmjs.org/
```

### 安装时的行为

```bash
# 安装公开包：从 npmmirror 获取
npm install lodash

# 安装私有包：从私有仓库获取
npm install @mycompany/utils
```

## 企业安全管理

### 依赖审计

```bash
# 检查安全漏洞
npm audit

# 自动修复
npm audit fix

# 查看详细报告
npm audit --json
```

### 许可证合规

检查依赖的许可证是否符合公司政策：

```bash
# 使用 license-checker
npx license-checker --summary

# 检查特定许可证
npx license-checker --onlyAllow "MIT;ISC;Apache-2.0"
```

### 依赖锁定策略

```bash
# 确保使用 lock 文件
npm ci  # CI 环境使用 ci 而非 install

# 配置 .npmrc
save-exact=true  # 保存精确版本
package-lock=true  # 确保生成 lock 文件
```

### 访问控制

在 Verdaccio 中配置细粒度权限：

```yaml
# config.yaml
packages:
  '@mycompany/internal-*':
    access: team-internal
    publish: team-internal
    
  '@mycompany/public-*':
    access: $all
    publish: team-dev
```

## CI/CD 集成

### GitHub Actions

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'http://npm.mycompany.com/'
          
      - run: npm ci
      
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### GitLab CI

```yaml
publish:
  stage: deploy
  script:
    - echo "//npm.mycompany.com/:_authToken=${NPM_TOKEN}" > ~/.npmrc
    - npm publish --registry http://npm.mycompany.com/
  only:
    - tags
```

## 最佳实践

### 1. 版本命名规范

```json
{
  "name": "@mycompany/package-name",
  "version": "1.0.0"
}
```

- 使用公司作用域：`@mycompany/`
- 遵循语义化版本
- 预发布版本：`1.0.0-beta.1`

### 2. 包分类管理

```yaml
# config.yaml
packages:
  # 核心基础设施
  '@mycompany/infra-*':
    access: $authenticated
    publish: team-platform
    
  # 业务组件
  '@mycompany/biz-*':
    access: $authenticated
    publish: team-dev
    
  # 工具库
  '@mycompany/utils-*':
    access: $authenticated
    publish: $authenticated
```

### 3. 文档和 README

每个私有包都应该有清晰的 README：

```markdown
# @mycompany/utils

公司内部工具库。

## 安装

\`\`\`bash
npm install @mycompany/utils
\`\`\`

## 使用

\`\`\`javascript
import { formatDate } from '@mycompany/utils';
\`\`\`

## 更新日志

见 CHANGELOG.md
```

## 本章小结

- 私有仓库用于内部包管理、缓存加速、安全控制
- Verdaccio 是轻量级开源方案，5 分钟即可搭建
- 使用作用域 `@company/` 区分私有包和公开包
- 通过 `.npmrc` 配置多源访问
- 在 CI/CD 中集成私有仓库发布流程
- 定期进行依赖审计和许可证检查

至此，第一部分"认知升级"完成。下一部分我们将系统学习异步编程。
