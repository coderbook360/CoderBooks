# CLI 工具发布到 npm

开发完成后，将工具发布到 npm 让其他人使用。

## 准备工作

### 注册 npm 账号

```bash
npm adduser
# 输入用户名、密码、邮箱
```

### 登录

```bash
npm login
```

### 查看当前登录

```bash
npm whoami
```

## 配置 package.json

### bin 字段

指定可执行文件：

```json
{
  "name": "my-cli-tool",
  "bin": {
    "mytool": "./bin/cli.js"
  }
}
```

多个命令：

```json
{
  "bin": {
    "mytool": "./bin/cli.js",
    "mytool-init": "./bin/init.js"
  }
}
```

### Shebang

入口文件第一行必须有：

```javascript
#!/usr/bin/env node

// 你的代码
```

### files 字段

指定发布包含的文件：

```json
{
  "files": [
    "bin",
    "src",
    "templates"
  ]
}
```

### 完整配置

```json
{
  "name": "create-myapp",
  "version": "1.0.0",
  "description": "项目脚手架工具",
  "keywords": ["cli", "scaffold", "generator"],
  "author": "Your Name <your@email.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/create-myapp"
  },
  "homepage": "https://github.com/username/create-myapp#readme",
  "bugs": {
    "url": "https://github.com/username/create-myapp/issues"
  },
  "bin": {
    "create-myapp": "./bin/cli.js"
  },
  "files": [
    "bin",
    "src"
  ],
  "engines": {
    "node": ">=16.0.0"
  },
  "dependencies": {
    "commander": "^11.0.0",
    "inquirer": "^8.2.6",
    "chalk": "^4.1.2"
  }
}
```

## 发布前检查

### 查看将发布的文件

```bash
npm pack --dry-run
```

### 本地测试

```bash
# 全局安装本地包
npm link

# 测试命令
create-myapp --version
create-myapp create test-project

# 解除链接
npm unlink -g create-myapp
```

## 发布

### 首次发布

```bash
npm publish
```

### 带 scope 的包

```bash
# 公开发布
npm publish --access public
```

### 发布结果

```
npm notice 
npm notice 📦  create-myapp@1.0.0
npm notice === Tarball Contents ===
npm notice 1.2kB bin/cli.js
npm notice 3.5kB src/commands/create.js
npm notice ...
npm notice === Tarball Details ===
npm notice name:          create-myapp
npm notice version:       1.0.0
npm notice package size:  5.2 kB
npm notice total files:   10
npm notice 
+ create-myapp@1.0.0
```

## 版本管理

### 语义化版本

```
主版本.次版本.修订版本
1.0.0

主版本：不兼容的 API 变更
次版本：向后兼容的功能新增
修订版本：向后兼容的问题修复
```

### 更新版本

```bash
# 修订版本 1.0.0 -> 1.0.1
npm version patch

# 次版本 1.0.0 -> 1.1.0
npm version minor

# 主版本 1.0.0 -> 2.0.0
npm version major
```

### 预发布版本

```bash
npm version prerelease --preid=beta
# 1.0.0 -> 1.0.1-beta.0

npm version prerelease --preid=beta
# 1.0.1-beta.0 -> 1.0.1-beta.1
```

### 发布更新

```bash
npm version patch
npm publish
```

## 发布 beta 版本

```bash
npm version prerelease --preid=beta
npm publish --tag beta
```

安装 beta：

```bash
npm install create-myapp@beta
```

## 撤销发布

### 72 小时内

```bash
npm unpublish create-myapp@1.0.0
```

### 废弃版本

```bash
npm deprecate create-myapp@1.0.0 "此版本有严重 bug，请使用 1.0.1"
```

## 发布检查清单

1. **版本号**：更新版本
2. **README**：包含使用说明
3. **CHANGELOG**：记录变更
4. **测试**：确保功能正常
5. **依赖**：检查是否有安全问题
6. **文件**：确认 files 字段正确
7. **bin**：确认 shebang 存在

## 自动化发布

**package.json**

```json
{
  "scripts": {
    "prepublishOnly": "npm test",
    "preversion": "npm test",
    "version": "git add -A .",
    "postversion": "git push && git push --tags"
  }
}
```

## 使用 np

```bash
npm install -g np
np
```

np 会自动：
- 运行测试
- 更新版本
- 发布到 npm
- 创建 Git tag
- 推送到远程

## 发布后

用户安装：

```bash
# 全局安装
npm install -g create-myapp

# 使用 npx（无需安装）
npx create-myapp create my-project
```

## 本章小结

- `bin` 字段指定可执行文件
- 入口文件需要 shebang
- `npm pack --dry-run` 预览发布内容
- `npm link` 本地测试
- 使用语义化版本管理
- `npm publish` 发布到仓库

至此，你已经掌握了完整的 CLI 工具开发和发布流程。接下来我们将学习调试与问题排查。
