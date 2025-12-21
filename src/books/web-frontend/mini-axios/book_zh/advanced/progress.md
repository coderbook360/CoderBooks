# 上传下载进度监控

文件上传下载时显示进度是提升用户体验的关键。Axios 通过 `onUploadProgress` 和 `onDownloadProgress` 回调支持进度监控，底层依赖 XMLHttpRequest 的 `progress` 事件。

## 本节目标

通过本节学习，你将掌握：

1. **理解进度事件**：XHR 的 progress 事件机制及其属性
2. **基础进度监控**：实现上传和下载进度回调
3. **增强进度信息**：计算速率、预计时间等扩展信息
4. **实际应用**：React 进度组件、多文件上传进度

## 基础使用

Axios 提供了简洁的进度监控 API：

```typescript
// ========== 上传进度监控 ==========
// 适用场景：文件上传、大型数据提交
axios.post('/upload', formData, {
  onUploadProgress: (progressEvent) => {
    // progressEvent.loaded: 已上传的字节数
    // progressEvent.total: 总字节数（需要服务器支持）
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`Upload: ${percentCompleted}%`);
  },
});

// ========== 下载进度监控 ==========
// 适用场景：大文件下载、资源加载
axios.get('/download/large-file', {
  onDownloadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`Download: ${percentCompleted}%`);
  },
  // 注意：下载文件时通常需要设置 responseType
  responseType: 'blob',
});
```

### 进度事件数据结构

```
ProgressEvent {
  loaded: number    // 已传输的字节数
  total: number     // 总字节数（可能为 0，取决于服务器）
  lengthComputable: boolean  // total 是否可用
}
```

## 在适配器中实现

进度监控的关键是在 XHR 适配器中正确绑定 `progress` 事件：

```typescript
// src/adapters/xhr.ts

export function xhrAdapter<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // ========== 下载进度 ==========
    // xhr.onprogress 监听下载过程
    if (config.onDownloadProgress) {
      xhr.onprogress = function (event) {
        // event 是原生 ProgressEvent，包含 loaded 和 total
        config.onDownloadProgress!(event);
      };
    }

    // ========== 上传进度 ==========
    // xhr.upload.onprogress 监听上传过程
    // 注意：upload 对象可能不存在（某些旧浏览器）
    if (config.onUploadProgress && xhr.upload) {
      xhr.upload.onprogress = function (event) {
        config.onUploadProgress!(event);
      };
    }

    // ... 其他逻辑（open, send 等）
  });
}
```

### 类型定义

为进度事件定义更完善的类型：

```typescript
// src/types/index.ts

/**
 * 增强的进度事件类型
 * 在原生 ProgressEvent 基础上添加计算属性
 */
export interface AxiosProgressEvent {
  /** 已传输的字节数 */
  loaded: number;
  /** 总字节数（可能为 0） */
  total: number;
  /** 进度比例（0-1） */
  progress?: number;
  /** 本次传输的字节数 */
  bytes?: number;
  /** 传输速率（字节/秒） */
  rate?: number;
  /** 预计剩余时间（秒） */
  estimated?: number;
  /** 是否是上传事件 */
  upload?: boolean;
  /** 是否是下载事件 */
  download?: boolean;
  /** 原生 ProgressEvent 对象 */
  event?: ProgressEvent;
}

export interface AxiosRequestConfig {
  // ... 其他配置
  
  /** 上传进度回调 */
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  /** 下载进度回调 */
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
}
```

## 增强进度事件

原生的 `ProgressEvent` 只提供 `loaded` 和 `total`，但用户通常还想知道速率、预计时间等信息。我们可以创建一个增强处理器：

```typescript
// src/helpers/progressEventEnhancer.ts

/**
 * 增强的进度事件接口
 * 包含原生事件不提供的计算属性
 */
interface EnhancedProgressEvent {
  /** 已传输字节数 */
  loaded: number;
  /** 总字节数 */
  total: number;
  /** 进度比例（0-1） */
  progress: number;
  /** 传输速率（字节/秒） */
  rate: number;
  /** 预计剩余时间（秒） */
  estimated: number;
  /** 已用时间（秒） */
  elapsed: number;
}

/**
 * 创建增强的进度处理器
 * 
 * 工作原理：
 * - 记录每次事件的时间和已传输量
 * - 计算两次事件之间的速率
 * - 基于速率估算剩余时间
 * 
 * @param onProgress - 用户的进度回调
 * @param startTime - 传输开始时间
 * @returns 可以绑定到 XHR 的事件处理函数
 */
export function createProgressHandler(
  onProgress: (event: EnhancedProgressEvent) => void,
  startTime: number = Date.now()
) {
  // 上一次事件的状态
  let lastLoaded = 0;
  let lastTime = startTime;

  return function handleProgress(event: ProgressEvent) {
    const now = Date.now();
    const loaded = event.loaded;
    const total = event.total || 0;

    // ========== 计算速率 ==========
    // 速率 = 本次传输量 / 时间差
    const timeDelta = (now - lastTime) / 1000;  // 转换为秒
    const loadedDelta = loaded - lastLoaded;
    const rate = timeDelta > 0 ? loadedDelta / timeDelta : 0;

    // ========== 计算进度比例 ==========
    const progress = total > 0 ? loaded / total : 0;

    // ========== 预计剩余时间 ==========
    // 剩余时间 = 剩余量 / 当前速率
    const remaining = total - loaded;
    const estimated = rate > 0 ? remaining / rate : 0;

    // ========== 已用时间 ==========
    const elapsed = (now - startTime) / 1000;

    // 更新状态以便下次计算
    lastLoaded = loaded;
    lastTime = now;

    // 调用用户回调
    onProgress({
      loaded,
      total,
      progress,
      rate,
      estimated,
      elapsed,
    });
  };
}
```

### 使用增强处理器

```typescript
axios.post('/upload', formData, {
  onUploadProgress: createProgressHandler((event) => {
    console.log(`进度: ${(event.progress * 100).toFixed(1)}%`);
    console.log(`速度: ${formatBytes(event.rate)}/s`);
    console.log(`剩余时间: ${event.estimated.toFixed(1)}秒`);
  }),
});

/**
 * 格式化字节数为人类可读格式
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### 进度信息流程图

```
ProgressEvent (原生)              EnhancedProgressEvent (增强后)
┌──────────────────┐              ┌──────────────────────────┐
│ loaded: 5242880  │              │ loaded: 5242880          │
│ total: 10485760  │  ────────►   │ total: 10485760          │
└──────────────────┘              │ progress: 0.5 (50%)      │
                                  │ rate: 1048576 (1MB/s)    │
                                  │ estimated: 5 (5秒)        │
                                  │ elapsed: 5 (已用5秒)      │
                                  └──────────────────────────┘
```

## React 进度组件

在 React 中实现一个完整的上传组件，包含进度条、速度显示和剩余时间：

```typescript
// components/UploadProgress.tsx

import { useState, useCallback } from 'react';
import axios, { AxiosProgressEvent } from 'axios';

/**
 * 上传状态类型
 */
interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;    // 0-1 的进度
  rate: number;        // 字节/秒
  estimated: number;   // 预计剩余秒数
  error?: Error;
}

/**
 * 上传 Hook
 * 封装上传逻辑和状态管理
 */
export function useUpload() {
  const [state, setState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    rate: 0,
    estimated: 0,
  });

  const upload = useCallback(async (file: File, url: string) => {
    // 准备 FormData
    const formData = new FormData();
    formData.append('file', file);

    // 用于计算速率的状态
    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    // 设置为上传中状态
    setState({
      status: 'uploading',
      progress: 0,
      rate: 0,
      estimated: 0,
    });

    try {
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          const now = Date.now();
          const loaded = event.loaded;
          const total = event.total || file.size;

          // 计算速率
          const timeDelta = (now - lastTime) / 1000;
          const loadedDelta = loaded - lastLoaded;
          const rate = timeDelta > 0 ? loadedDelta / timeDelta : 0;
          
          // 计算进度和预计时间
          const progress = total > 0 ? loaded / total : 0;
          const remaining = total - loaded;
          const estimated = rate > 0 ? remaining / rate : 0;

          // 更新状态
          lastLoaded = loaded;
          lastTime = now;

          setState({
            status: 'uploading',
            progress,
            rate,
            estimated,
          });
        },
      });

      // 上传成功
      setState(prev => ({ ...prev, status: 'success' }));
      return response.data;
    } catch (error) {
      // 上传失败
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        error: error as Error 
      }));
      throw error;
    }
  }, []);

  return { ...state, upload };
}

// ========== 使用 Hook 的组件 ==========
function UploadButton() {
  const { status, progress, rate, estimated, upload } = useUpload();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await upload(file, '/api/upload');
        alert('上传成功！');
      } catch (error) {
        alert('上传失败');
      }
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={handleFileSelect} 
        disabled={status === 'uploading'} 
      />
      
      {/* 上传进度显示 */}
      {status === 'uploading' && (
        <div className="progress-container">
          {/* 进度条 */}
          <div 
            className="progress-bar" 
            style={{ width: `${progress * 100}%` }}
          />
          {/* 详细信息 */}
          <div className="progress-info">
            <span>{(progress * 100).toFixed(1)}%</span>
            <span>{formatBytes(rate)}/s</span>
            <span>剩余 {estimated.toFixed(0)}秒</span>
          </div>
        </div>
      )}
      
      {/* 状态提示 */}
      {status === 'success' && <span className="success">✅ 上传完成</span>}
      {status === 'error' && <span className="error">❌ 上传失败</span>}
    </div>
  );
}
```

## 多文件上传进度

当需要同时上传多个文件时，需要追踪每个文件的独立进度，以及整体进度：

```typescript
/**
 * 单个文件的进度状态
 */
interface FileProgress {
  file: File;
  loaded: number;
  total: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

/**
 * 多文件上传（带并发控制）
 * 
 * @param files - 要上传的文件数组
 * @param url - 上传接口地址
 * @param onProgress - 进度更新回调
 */
async function uploadMultipleFiles(
  files: File[],
  url: string,
  onProgress: (progress: FileProgress[]) => void
) {
  // 初始化每个文件的进度状态
  const progress: FileProgress[] = files.map(file => ({
    file,
    loaded: 0,
    total: file.size,
    status: 'pending',
  }));

  /**
   * 上传单个文件
   */
  const uploadFile = async (file: File, index: number) => {
    const formData = new FormData();
    formData.append('file', file);

    // 更新状态为"上传中"
    progress[index].status = 'uploading';
    onProgress([...progress]);  // 通知外部

    try {
      await axios.post(url, formData, {
        onUploadProgress: (event) => {
          // 更新该文件的进度
          progress[index].loaded = event.loaded;
          progress[index].total = event.total || file.size;
          onProgress([...progress]);  // 通知外部
        },
      });
      
      // 上传成功
      progress[index].status = 'success';
      onProgress([...progress]);
    } catch (error) {
      // 上传失败
      progress[index].status = 'error';
      onProgress([...progress]);
      throw error;
    }
  };

  // ========== 并发控制：限制同时上传 3 个文件 ==========
  const limit = 3;
  const results: Promise<void>[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const promise = uploadFile(files[i], i);
    results.push(promise);
    
    // 达到并发限制时，等待其中一个完成
    if (results.length >= limit) {
      await Promise.race(results);
    }
  }

  // 等待所有上传完成
  await Promise.allSettled(results);
  
  return progress;
}

// ========== 使用示例 ==========
const files = [file1, file2, file3, file4, file5];

uploadMultipleFiles(files, '/api/upload', (progress) => {
  // 计算整体进度
  const totalLoaded = progress.reduce((sum, p) => sum + p.loaded, 0);
  const totalSize = progress.reduce((sum, p) => sum + p.total, 0);
  const overallProgress = totalSize > 0 ? totalLoaded / totalSize : 0;
  
  console.log(`总进度: ${(overallProgress * 100).toFixed(1)}%`);
  
  // 显示每个文件的进度
  progress.forEach((p, i) => {
    const fileProgress = p.total > 0 ? (p.loaded / p.total * 100).toFixed(1) : 0;
    console.log(`文件 ${i + 1}: ${fileProgress}% [${p.status}]`);
  });
});
```

## 下载并保存文件

实现带进度显示的文件下载功能：

```typescript
/**
 * 下载文件并保存到本地
 * 
 * @param url - 文件下载地址
 * @param filename - 保存的文件名
 * @param onProgress - 进度回调（0-1）
 */
async function downloadFile(
  url: string,
  filename: string,
  onProgress: (progress: number) => void
): Promise<void> {
  // 发起下载请求
  const response = await axios.get(url, {
    // 重要：必须设置 responseType 为 blob
    responseType: 'blob',
    onDownloadProgress: (event) => {
      // 计算进度（需要服务器返回 Content-Length）
      const progress = event.total 
        ? event.loaded / event.total 
        : 0;
      onProgress(progress);
    },
  });

  // ========== 使用 Blob 和临时链接下载 ==========
  
  // 1. 创建 Blob 对象
  const blob = new Blob([response.data]);
  
  // 2. 创建临时下载链接
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;  // 设置下载文件名
  
  // 3. 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // 4. 清理临时 URL（释放内存）
  URL.revokeObjectURL(link.href);
}

// ========== 使用示例 ==========
await downloadFile(
  '/api/files/report.pdf',
  'report.pdf',
  (progress) => {
    console.log(`下载进度: ${(progress * 100).toFixed(1)}%`);
  }
);
```

### 下载流程图

```
┌─────────────────────────────────────────────────────────────┐
│  axios.get(url, { responseType: 'blob' })                   │
│                        │                                     │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  onDownloadProgress 多次触发                          │   │
│  │  loaded: 1MB → 5MB → 10MB → ... → 100MB              │   │
│  └──────────────────────────────────────────────────────┘   │
│                        │                                     │
│                        ▼                                     │
│  response.data: Blob { size: 104857600 }                    │
│                        │                                     │
│                        ▼                                     │
│  URL.createObjectURL(blob) → 'blob:http://...'              │
│                        │                                     │
│                        ▼                                     │
│  <a href="blob:..." download="file.pdf">                    │
│                        │                                     │
│                        ▼                                     │
│  浏览器弹出保存对话框                                        │
└─────────────────────────────────────────────────────────────┘
```

## 测试

为进度处理器编写测试：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createProgressHandler } from '../src/helpers/progressEventEnhancer';

describe('Progress Handler', () => {
  // ========== 基础进度计算测试 ==========
  
  it('should calculate progress correctly', () => {
    const onProgress = vi.fn();
    const handler = createProgressHandler(onProgress);

    // 模拟进度事件：50% 完成
    handler({ loaded: 50, total: 100 } as ProgressEvent);

    // 验证回调被调用，且包含正确的 progress 值
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        loaded: 50,
        total: 100,
        progress: 0.5,  // 50%
      })
    );
  });

  // ========== 速率计算测试 ==========
  
  it('should calculate rate based on time difference', async () => {
    const onProgress = vi.fn();
    const startTime = Date.now();
    const handler = createProgressHandler(onProgress, startTime);

    // 第一次调用（初始状态）
    handler({ loaded: 0, total: 100 } as ProgressEvent);

    // 等待一段时间模拟传输
    await new Promise(resolve => setTimeout(resolve, 100));

    // 第二次调用（传输了 50 字节）
    handler({ loaded: 50, total: 100 } as ProgressEvent);

    // 验证速率已计算（应该大于 0）
    const lastCall = onProgress.mock.calls[1][0];
    expect(lastCall.rate).toBeGreaterThan(0);
  });

  // ========== 预计时间计算测试 ==========
  
  it('should estimate remaining time', async () => {
    const onProgress = vi.fn();
    const handler = createProgressHandler(onProgress);

    // 模拟稳定的传输速率
    handler({ loaded: 0, total: 100 } as ProgressEvent);
    await new Promise(resolve => setTimeout(resolve, 50));
    handler({ loaded: 50, total: 100 } as ProgressEvent);

    const lastCall = onProgress.mock.calls[1][0];
    
    // 如果速率稳定，预计剩余时间应该是正数
    expect(lastCall.estimated).toBeGreaterThanOrEqual(0);
  });
});
```

## 常见问题解答

### Q1: 为什么 progressEvent.total 有时候是 0？

服务器需要返回 `Content-Length` 响应头，浏览器才能知道总大小。如果服务器使用 chunked 传输或未设置此头，`total` 会是 0。

**解决方案**：
```typescript
// 使用文件实际大小作为 fallback
const total = event.total || file.size;
```

### Q2: 上传进度为什么有时不准确？

几种常见原因：

| 原因 | 说明 | 解决方案 |
|------|------|----------|
| 代理/CDN 缓冲 | 数据先到代理，再转发到服务器 | 减少代理层级 |
| 压缩传输 | gzip 压缩后大小不同 | 禁用压缩或接受误差 |
| 小文件传输太快 | 事件触发次数少 | 小文件不显示进度 |

### Q3: 如何取消正在进行的上传？

结合 AbortController 使用：

```typescript
const controller = new AbortController();

axios.post('/upload', formData, {
  signal: controller.signal,
  onUploadProgress: (event) => {
    // 用户点击取消时
    if (userClickedCancel) {
      controller.abort();
    }
  }
});
```

### Q4: 服务端渲染（SSR）环境怎么处理？

Node.js 环境没有 `XMLHttpRequest.upload`，进度监控需要使用 Node.js 的流机制：

```typescript
// Node.js 环境
const form = new FormData();
form.on('progress', (bytesReceived, bytesExpected) => {
  console.log(`${bytesReceived} / ${bytesExpected}`);
});
```

## 小结

进度监控是文件处理应用的核心功能：

**核心知识点**：

| 主题 | 说明 |
|------|------|
| XHR 事件 | `xhr.onprogress`（下载）和 `xhr.upload.onprogress`（上传） |
| 基础属性 | `loaded`（已传输）、`total`（总大小） |
| 增强信息 | 速率、预计时间、已用时间 |
| 多文件处理 | 并发控制 + 独立进度追踪 |
| 文件保存 | Blob + createObjectURL + download 属性 |

**注意事项**：

1. ✅ 服务器需返回 `Content-Length` 头才能计算总进度
2. ✅ 代理和 CDN 可能影响进度准确性
3. ✅ 小文件传输太快，可能只触发一次事件
4. ✅ 使用后及时调用 `URL.revokeObjectURL` 释放内存

至此，高级功能章节完成。下一章我们进入 TypeScript 类型系统。
