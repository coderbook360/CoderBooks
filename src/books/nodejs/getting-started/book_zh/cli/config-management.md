# 配置文件读取与管理

CLI 工具通常需要从配置文件读取选项。

## JSON 配置

最简单的方式：

```javascript
const fs = require('fs');
const path = require('path');

function loadConfig(configPath) {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {};  // 文件不存在返回空对象
    }
    throw new Error(`配置文件解析错误: ${err.message}`);
  }
}

const config = loadConfig('./config.json');
console.log(config);
```

## 查找配置文件

向上级目录查找：

```javascript
const fs = require('fs');
const path = require('path');

function findConfig(filename, startDir = process.cwd()) {
  let dir = startDir;
  
  while (true) {
    const configPath = path.join(dir, filename);
    
    if (fs.existsSync(configPath)) {
      return configPath;
    }
    
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;  // 到达根目录
    }
    dir = parent;
  }
}

const configPath = findConfig('myapp.config.json');
if (configPath) {
  console.log('找到配置:', configPath);
}
```

## 多配置文件查找

```javascript
function findConfigMultiple(filenames, startDir = process.cwd()) {
  let dir = startDir;
  
  while (true) {
    for (const filename of filenames) {
      const configPath = path.join(dir, filename);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }
    
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// 支持多种配置文件名
const configPath = findConfigMultiple([
  'myapp.config.js',
  'myapp.config.json',
  '.myapprc',
  '.myapprc.json'
]);
```

## 使用 cosmiconfig

自动查找和加载配置：

```bash
npm install cosmiconfig
```

```javascript
const { cosmiconfig } = require('cosmiconfig');

async function loadConfig() {
  const explorer = cosmiconfig('myapp');
  
  // 自动查找以下配置：
  // - package.json 中的 myapp 字段
  // - .myapprc
  // - .myapprc.json
  // - .myapprc.yaml
  // - .myapprc.yml
  // - .myapprc.js
  // - myapp.config.js
  
  const result = await explorer.search();
  
  if (result) {
    console.log('配置来源:', result.filepath);
    return result.config;
  }
  
  return {};
}

loadConfig().then(console.log);
```

## 默认配置合并

```javascript
const defaultConfig = {
  port: 3000,
  host: 'localhost',
  output: './dist',
  minify: false,
  sourcemap: true
};

function mergeConfig(userConfig) {
  return { ...defaultConfig, ...userConfig };
}

// 使用
const userConfig = loadConfig('./config.json');
const config = mergeConfig(userConfig);
```

## 深度合并

```javascript
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

const defaultConfig = {
  server: {
    port: 3000,
    host: 'localhost'
  },
  build: {
    minify: false,
    sourcemap: true
  }
};

const userConfig = {
  server: {
    port: 8080
  }
};

const config = deepMerge(defaultConfig, userConfig);
// {
//   server: { port: 8080, host: 'localhost' },
//   build: { minify: false, sourcemap: true }
// }
```

## 环境变量覆盖

```javascript
function loadConfigWithEnv(configPath) {
  const fileConfig = loadConfig(configPath);
  
  // 环境变量优先级最高
  return {
    ...fileConfig,
    port: process.env.PORT || fileConfig.port,
    host: process.env.HOST || fileConfig.host,
    debug: process.env.DEBUG === 'true' || fileConfig.debug
  };
}
```

## 配置验证

```javascript
function validateConfig(config) {
  const errors = [];
  
  if (typeof config.port !== 'number' && typeof config.port !== 'undefined') {
    errors.push('port 必须是数字');
  }
  
  if (config.port && (config.port < 1 || config.port > 65535)) {
    errors.push('port 必须在 1-65535 范围内');
  }
  
  if (config.output && typeof config.output !== 'string') {
    errors.push('output 必须是字符串');
  }
  
  if (errors.length > 0) {
    throw new Error(`配置错误:\n  ${errors.join('\n  ')}`);
  }
  
  return config;
}
```

## 完整配置管理器

```javascript
const fs = require('fs');
const path = require('path');
const { cosmiconfig } = require('cosmiconfig');

class ConfigManager {
  constructor(name, defaultConfig = {}) {
    this.name = name;
    this.defaultConfig = defaultConfig;
    this.config = null;
    this.configPath = null;
  }
  
  async load(searchFrom = process.cwd()) {
    const explorer = cosmiconfig(this.name);
    const result = await explorer.search(searchFrom);
    
    if (result) {
      this.configPath = result.filepath;
      this.config = this.merge(result.config);
    } else {
      this.config = { ...this.defaultConfig };
    }
    
    // 环境变量覆盖
    this.applyEnv();
    
    return this.config;
  }
  
  merge(userConfig) {
    return this.deepMerge(this.defaultConfig, userConfig);
  }
  
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
  
  applyEnv() {
    const prefix = this.name.toUpperCase() + '_';
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.slice(prefix.length).toLowerCase();
        this.config[configKey] = this.parseEnvValue(value);
      }
    }
  }
  
  parseEnvValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(value)) return Number(value);
    return value;
  }
  
  get(key) {
    return key.split('.').reduce((obj, k) => obj?.[k], this.config);
  }
  
  set(key, value) {
    const keys = key.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, this.config);
    target[last] = value;
  }
}

// 使用
const configManager = new ConfigManager('myapp', {
  port: 3000,
  debug: false,
  output: './dist'
});

async function main() {
  await configManager.load();
  
  console.log('配置来源:', configManager.configPath || '默认配置');
  console.log('端口:', configManager.get('port'));
  console.log('完整配置:', configManager.config);
}

main();
```

## 配置文件示例

**.myapprc.json**
```json
{
  "port": 8080,
  "debug": true,
  "output": "./build"
}
```

**package.json**
```json
{
  "name": "my-project",
  "myapp": {
    "port": 8080
  }
}
```

## 本章小结

- JSON 是最简单的配置格式
- 向上级目录查找配置文件
- cosmiconfig 自动处理多种格式
- 默认配置 + 用户配置 + 环境变量的合并策略
- 配置验证防止运行时错误

下一章我们将综合运用，开发完整的 CLI 工具。
