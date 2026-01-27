# 生产部署

SSR 应用的生产部署涉及构建优化、服务器配置、监控告警等多个环节。本章介绍完整的部署策略。

## 构建配置

```typescript
// build.config.ts
import { defineConfig } from 'vite'
import path from 'path'

// 客户端构建配置
export const clientConfig = defineConfig({
  build: {
    outDir: 'dist/client',
    manifest: true,
    rollupOptions: {
      input: 'src/entry-client.ts',
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
          utils: ['lodash-es', 'date-fns']
        }
      }
    },
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})

// 服务端构建配置
export const serverConfig = defineConfig({
  build: {
    outDir: 'dist/server',
    ssr: true,
    rollupOptions: {
      input: 'src/entry-server.ts',
      output: {
        format: 'esm'
      }
    }
  },
  ssr: {
    // 不打包 Node 模块
    noExternal: ['vue', 'vue-router'],
    external: ['express', 'compression']
  }
})

// 构建脚本
// build.ts
async function build() {
  // 1. 构建客户端
  console.log('Building client...')
  await viteBuild(clientConfig)
  
  // 2. 构建服务端
  console.log('Building server...')
  await viteBuild(serverConfig)
  
  // 3. 生成 manifest
  generateSSRManifest()
  
  console.log('Build complete!')
}
```

## 服务器配置

```typescript
// server/index.ts
import express from 'express'
import compression from 'compression'
import { createServer as createViteServer } from 'vite'
import fs from 'fs'
import path from 'path'

const isProduction = process.env.NODE_ENV === 'production'

async function createServer() {
  const app = express()
  
  // Gzip 压缩
  app.use(compression())
  
  let vite: any
  
  if (isProduction) {
    // 生产环境：静态文件服务
    app.use(
      '/assets',
      express.static(path.resolve('dist/client/assets'), {
        maxAge: '1y', // 长期缓存（带 hash）
        immutable: true
      })
    )
    
    app.use(
      express.static(path.resolve('dist/client'), {
        maxAge: '1h', // 短期缓存
        index: false
      })
    )
  } else {
    // 开发环境：Vite 中间件
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    })
    app.use(vite.middlewares)
  }
  
  // SSR 路由
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl
    
    try {
      let render: Function
      let template: string
      
      if (isProduction) {
        // 生产：使用构建产物
        template = fs.readFileSync(
          path.resolve('dist/client/index.html'),
          'utf-8'
        )
        render = (await import('./dist/server/entry-server.js')).render
      } else {
        // 开发：使用 Vite 转换
        template = fs.readFileSync(
          path.resolve('index.html'),
          'utf-8'
        )
        template = await vite.transformIndexHtml(url, template)
        render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
      }
      
      const { html, state } = await render(url)
      
      const finalHtml = template
        .replace('<!--ssr-outlet-->', html)
        .replace('<!--ssr-state-->', 
          `<script>window.__INITIAL_STATE__=${JSON.stringify(state)}</script>`
        )
      
      res.status(200)
        .set({ 'Content-Type': 'text/html' })
        .end(finalHtml)
        
    } catch (e: any) {
      vite?.ssrFixStacktrace(e)
      console.error(e)
      next(e)
    }
  })
  
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
  })
}

createServer()
```

## Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 构建
COPY . .
RUN npm run build

# 生产镜像
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 只复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 只安装生产依赖
RUN npm ci --only=production

# 非 root 用户运行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser
USER appuser

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app

volumes:
  redis_data:
```

## Nginx 配置

```nginx
# nginx.conf
upstream app_servers {
    least_conn;
    server app:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name example.com;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;
    
    # 静态资源
    location /assets/ {
        alias /app/dist/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://api_server/;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
    
    # SSR 页面
    location / {
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 缓存 SSR 响应
        proxy_cache ssr_cache;
        proxy_cache_valid 200 1m;
        proxy_cache_use_stale error timeout updating;
        add_header X-Cache-Status $upstream_cache_status;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://app_servers/health;
        access_log off;
    }
}

# 缓存配置
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=ssr_cache:10m max_size=100m inactive=60m use_temp_path=off;
```

## 监控配置

```typescript
// server/monitoring.ts
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client'

const register = new Registry()
collectDefaultMetrics({ register })

// 自定义指标
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register]
})

const ssrRenderDuration = new Histogram({
  name: 'ssr_render_duration_seconds',
  help: 'SSR render duration in seconds',
  labelNames: ['path'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
})

const hydrationErrors = new Counter({
  name: 'hydration_errors_total',
  help: 'Total hydration errors',
  registers: [register]
})

// 中间件
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now()
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000
      
      httpRequestsTotal.inc({
        method: req.method,
        path: req.path,
        status: res.statusCode
      })
      
      if (req.path !== '/metrics' && req.path !== '/health') {
        ssrRenderDuration.observe({ path: req.path }, duration)
      }
    })
    
    next()
  }
}

// 暴露指标端点
export function metricsHandler(req: any, res: any) {
  res.set('Content-Type', register.contentType)
  register.metrics().then(data => res.end(data))
}

// 错误上报
export function reportHydrationError(error: Error, context: any) {
  hydrationErrors.inc()
  
  // 发送到日志服务
  console.error('[Hydration Error]', {
    error: error.message,
    stack: error.stack,
    context
  })
}
```

## 健康检查

```typescript
// server/health.ts
interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  checks: Record<string, {
    status: 'up' | 'down'
    latency?: number
  }>
}

export async function healthCheck(): Promise<HealthStatus> {
  const checks: HealthStatus['checks'] = {}
  
  // 数据库检查
  try {
    const start = Date.now()
    await db.ping()
    checks.database = { status: 'up', latency: Date.now() - start }
  } catch {
    checks.database = { status: 'down' }
  }
  
  // Redis 检查
  try {
    const start = Date.now()
    await redis.ping()
    checks.redis = { status: 'up', latency: Date.now() - start }
  } catch {
    checks.redis = { status: 'down' }
  }
  
  // 内存检查
  const memUsage = process.memoryUsage()
  const memPercent = memUsage.heapUsed / memUsage.heapTotal
  checks.memory = { 
    status: memPercent < 0.9 ? 'up' : 'down' 
  }
  
  const allUp = Object.values(checks).every(c => c.status === 'up')
  
  return {
    status: allUp ? 'healthy' : 'unhealthy',
    checks
  }
}

// 路由
app.get('/health', async (req, res) => {
  const health = await healthCheck()
  res.status(health.status === 'healthy' ? 200 : 503)
    .json(health)
})

// Kubernetes 探针
app.get('/ready', async (req, res) => {
  const health = await healthCheck()
  res.status(health.status === 'healthy' ? 200 : 503).end()
})

app.get('/live', (req, res) => {
  res.status(200).end('OK')
})
```

## 环境变量

```typescript
// config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().default('3000'),
  
  // 数据库
  DATABASE_URL: z.string(),
  
  // Redis
  REDIS_URL: z.string().optional(),
  
  // 外部服务
  API_BASE_URL: z.string(),
  
  // 安全
  SESSION_SECRET: z.string().min(32),
  
  // 功能开关
  ENABLE_SSR_CACHE: z.string().transform(v => v === 'true').default('false'),
  SSR_CACHE_TTL: z.string().transform(Number).default('60')
})

export const env = envSchema.parse(process.env)

// 验证必要环境变量
export function validateEnv() {
  try {
    envSchema.parse(process.env)
  } catch (error) {
    console.error('Invalid environment variables:', error)
    process.exit(1)
  }
}
```

```bash
# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:pass@db:5432/app
REDIS_URL=redis://redis:6379
API_BASE_URL=https://api.example.com
SESSION_SECRET=your-32-character-secret-here
ENABLE_SSR_CACHE=true
SSR_CACHE_TTL=300
```

## 日志配置

```typescript
// server/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers
    }),
    res: (res) => ({
      statusCode: res.statusCode
    }),
    err: pino.stdSerializers.err
  }
})

// 请求日志中间件
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now()
    
    res.on('finish', () => {
      logger.info({
        req,
        res,
        responseTime: Date.now() - start
      }, 'request completed')
    })
    
    next()
  }
}
```

## 部署清单

```markdown
## 部署前检查

### 构建
- [ ] 构建成功无错误
- [ ] 静态资源带 hash
- [ ] Source map 已生成（可选）

### 安全
- [ ] 环境变量已配置
- [ ] 敏感信息已加密
- [ ] HTTPS 已配置
- [ ] 安全头已设置

### 性能
- [ ] Gzip/Brotli 已启用
- [ ] 缓存策略已配置
- [ ] CDN 已配置

### 监控
- [ ] 日志收集已配置
- [ ] 指标收集已配置
- [ ] 告警规则已设置
- [ ] 健康检查已配置

### 容灾
- [ ] 多实例部署
- [ ] 数据库备份
- [ ] 回滚方案就绪
```

## 小结

SSR 生产部署的关键要点：

1. **构建优化**：代码分割、压缩、长期缓存
2. **服务器配置**：Express/Nginx、负载均衡
3. **容器化**：Docker、Kubernetes、自动扩缩
4. **监控告警**：Prometheus、日志收集、健康检查
5. **安全配置**：环境变量、HTTPS、安全头

完善的部署策略确保 SSR 应用稳定高效运行。
