# 实战：类型安全的配置系统

应用配置是容易出错的地方：拼写错误、类型错误、缺失配置。

类型安全的配置系统可以在编译时发现这些问题。

## 问题：不安全的配置

```typescript
// ❌ 松散配置，容易出错
const config = {
  apiUrl: process.env.API_URL,
  timeout: process.env.TIMEOUT,  // string 还是 number？
  debug: process.env.DEBUG       // "true" 还是 true？
};

// 使用时可能崩溃
fetch(config.apiUrl, { timeout: config.timeout });  // apiUrl 可能是 undefined
```

## 步骤 1：定义配置 Schema

```typescript
import { z } from 'zod';

// 使用 Zod 定义配置结构
const ConfigSchema = z.object({
  // 服务器配置
  server: z.object({
    port: z.number().min(1).max(65535).default(3000),
    host: z.string().default('localhost')
  }),
  
  // 数据库配置
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().min(1).max(100).default(10),
    ssl: z.boolean().default(false)
  }),
  
  // API 配置
  api: z.object({
    baseUrl: z.string().url(),
    timeout: z.number().min(0).default(5000),
    retries: z.number().min(0).max(10).default(3)
  }),
  
  // 功能开关
  features: z.object({
    darkMode: z.boolean().default(false),
    betaFeatures: z.array(z.string()).default([])
  }),
  
  // 环境
  env: z.enum(['development', 'staging', 'production'])
});

// 从 Schema 推断类型
type Config = z.infer<typeof ConfigSchema>;
```

## 步骤 2：环境变量解析

```typescript
// 从环境变量构建配置对象
function parseEnvConfig(): Config {
  const env = process.env;
  
  const rawConfig = {
    server: {
      port: env.PORT ? parseInt(env.PORT, 10) : undefined,
      host: env.HOST
    },
    database: {
      url: env.DATABASE_URL,
      poolSize: env.DB_POOL_SIZE ? parseInt(env.DB_POOL_SIZE, 10) : undefined,
      ssl: env.DB_SSL === 'true'
    },
    api: {
      baseUrl: env.API_BASE_URL,
      timeout: env.API_TIMEOUT ? parseInt(env.API_TIMEOUT, 10) : undefined,
      retries: env.API_RETRIES ? parseInt(env.API_RETRIES, 10) : undefined
    },
    features: {
      darkMode: env.FEATURE_DARK_MODE === 'true',
      betaFeatures: env.BETA_FEATURES?.split(',').filter(Boolean) ?? []
    },
    env: env.NODE_ENV as 'development' | 'staging' | 'production'
  };
  
  // 验证并返回
  return ConfigSchema.parse(rawConfig);
}
```

## 步骤 3：类型安全的配置访问

```typescript
// 配置单例
let configInstance: Config | null = null;

export function getConfig(): Config {
  if (!configInstance) {
    configInstance = parseEnvConfig();
  }
  return configInstance;
}

// 使用 - 完全类型安全
const config = getConfig();
config.server.port;           // number
config.database.url;          // string
config.features.betaFeatures; // string[]
```

## 步骤 4：分环境配置

```typescript
// 开发环境默认值
const devDefaults: Partial<Config> = {
  server: { port: 3000, host: 'localhost' },
  database: { url: 'postgresql://localhost/dev', poolSize: 5, ssl: false },
  features: { darkMode: true, betaFeatures: ['*'] }
};

// 生产环境必填项
const ProductionConfigSchema = ConfigSchema.extend({
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().min(10),  // 生产环境最少 10
    ssl: z.literal(true)           // 生产必须 SSL
  })
});

function loadConfig(): Config {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return ProductionConfigSchema.parse(parseEnvConfig());
  }
  
  // 开发环境合并默认值
  const config = parseEnvConfig();
  return { ...devDefaults, ...config };
}
```

## 步骤 5：配置验证与错误处理

```typescript
function validateConfig(): { success: true; config: Config } | { success: false; errors: string[] } {
  try {
    const config = loadConfig();
    return { success: true, config };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => 
        `${e.path.join('.')}: ${e.message}`
      );
      return { success: false, errors };
    }
    throw error;
  }
}

// 应用启动时验证
function bootstrap() {
  const result = validateConfig();
  
  if (!result.success) {
    console.error('Configuration errors:');
    result.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  
  console.log('Configuration validated successfully');
  startApp(result.config);
}
```

## 步骤 6：类型安全的功能开关

```typescript
// 定义功能开关
const FeatureFlagsSchema = z.object({
  newDashboard: z.boolean().default(false),
  experimentalApi: z.boolean().default(false),
  darkMode: z.boolean().default(false),
  maxUploadSize: z.number().default(10 * 1024 * 1024)
});

type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

// 类型安全的功能检查
function isFeatureEnabled<K extends keyof FeatureFlags>(
  feature: K
): FeatureFlags[K] {
  const config = getConfig();
  return config.features[feature] as FeatureFlags[K];
}

// 使用
if (isFeatureEnabled('newDashboard')) {
  renderNewDashboard();
}

const maxSize = isFeatureEnabled('maxUploadSize');  // number
```

## 步骤 7：敏感配置处理

```typescript
// 敏感信息单独处理
const SecretsSchema = z.object({
  jwtSecret: z.string().min(32),
  apiKey: z.string(),
  dbPassword: z.string()
});

type Secrets = z.infer<typeof SecretsSchema>;

// 不要打印敏感信息
function getSecrets(): Secrets {
  return SecretsSchema.parse({
    jwtSecret: process.env.JWT_SECRET,
    apiKey: process.env.API_KEY,
    dbPassword: process.env.DB_PASSWORD
  });
}

// 安全的日志输出
function logConfig(config: Config) {
  const safeConfig = {
    ...config,
    database: {
      ...config.database,
      url: config.database.url.replace(/:\/\/.*@/, '://***@')
    }
  };
  console.log('Config:', JSON.stringify(safeConfig, null, 2));
}
```

## 完整示例

```typescript
// config/schema.ts
import { z } from 'zod';

export const ConfigSchema = z.object({
  server: z.object({
    port: z.number().default(3000),
    host: z.string().default('localhost')
  }),
  database: z.object({
    url: z.string().url(),
    poolSize: z.number().default(10)
  }),
  env: z.enum(['development', 'staging', 'production'])
});

export type Config = z.infer<typeof ConfigSchema>;

// config/index.ts
import { ConfigSchema, Config } from './schema';

let config: Config | null = null;

export function getConfig(): Config {
  if (!config) {
    config = ConfigSchema.parse({
      server: {
        port: parseInt(process.env.PORT || '3000', 10),
        host: process.env.HOST
      },
      database: {
        url: process.env.DATABASE_URL,
        poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10)
      },
      env: process.env.NODE_ENV
    });
  }
  return config;
}

// 使用
import { getConfig } from './config';

const config = getConfig();
console.log(`Server running on ${config.server.host}:${config.server.port}`);
```

## 总结

**类型安全配置系统要点**：

- **Zod Schema 定义**：类型 + 验证一体
- **环境变量解析**：字符串转具体类型
- **分环境配置**：开发/生产不同规则
- **启动时验证**：失败则退出
- **敏感信息隔离**：不打印密码

**好处**：
- 编译时发现配置错误
- 运行时验证配置有效性
- 自动补全配置项
- 重构时自动更新

**记住**：配置错误是常见的线上事故原因，类型安全是第一道防线。
