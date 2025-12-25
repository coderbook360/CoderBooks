# FormData 与文件上传支持

现代 Web 应用经常需要上传文件。本节实现 FormData 处理和文件上传功能。

## 本节目标

通过本节学习，你将：

1. 理解 FormData 的原理和使用方式
2. 实现自动检测和处理 FormData
3. 支持文件上传和进度监控
4. 处理多文件和混合数据上传

## FormData 基础

### 什么是 FormData？

FormData 是一个用于构造表单数据的接口，可以包含文件和普通字段：

```typescript
// 创建 FormData
const formData = new FormData();

// 添加普通字段
formData.append('username', 'john');
formData.append('email', 'john@example.com');

// 添加文件
const fileInput = document.querySelector('input[type="file"]');
formData.append('avatar', fileInput.files[0]);

// 添加 Blob
const blob = new Blob(['Hello World'], { type: 'text/plain' });
formData.append('document', blob, 'hello.txt');
```

### FormData 的特点

```
┌──────────────────────────────────────────────────────┐
│  FormData 特点：                                      │
│                                                      │
│  1. 自动设置 Content-Type 为 multipart/form-data     │
│  2. 自动生成边界字符串 (boundary)                     │
│  3. 可以包含文件和普通字段                            │
│  4. 不能直接序列化为 JSON                             │
└──────────────────────────────────────────────────────┘
```

## 检测 FormData

### 类型判断

```typescript
// src/helpers/isFormData.ts

export function isFormData(val: any): val is FormData {
  return typeof FormData !== 'undefined' && val instanceof FormData;
}
```

### 在请求中检测

```typescript
// src/core/transformData.ts

import { isFormData } from '../helpers/isFormData';

export function transformRequest(data: any, headers: any): any {
  // 如果是 FormData，不做处理，让浏览器自动设置 Content-Type
  if (isFormData(data)) {
    // 删除手动设置的 Content-Type，让浏览器自动生成
    delete headers['Content-Type'];
    return data;
  }
  
  // 处理其他类型...
  if (isPlainObject(data)) {
    setContentTypeIfUnset(headers, 'application/json');
    return JSON.stringify(data);
  }
  
  return data;
}
```

## 文件上传实现

### 基本上传

```typescript
// src/adapters/xhr.ts

export function xhrAdapter(config: AxiosRequestConfig): Promise<AxiosResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.open(config.method!.toUpperCase(), url, true);
    
    // 设置请求头（FormData 不设置 Content-Type）
    Object.keys(config.headers || {}).forEach(name => {
      if (
        config.data === undefined &&
        name.toLowerCase() === 'content-type'
      ) {
        return; // 跳过
      }
      xhr.setRequestHeader(name, config.headers[name]);
    });
    
    // 上传进度
    if (config.onUploadProgress) {
      xhr.upload.onprogress = config.onUploadProgress;
    }
    
    // 下载进度
    if (config.onDownloadProgress) {
      xhr.onprogress = config.onDownloadProgress;
    }
    
    // 发送请求
    xhr.send(config.data);
  });
}
```

### 进度监控类型

```typescript
// src/types/index.ts

export interface AxiosProgressEvent {
  loaded: number;        // 已传输字节数
  total: number;         // 总字节数
  progress?: number;     // 进度百分比 (0-1)
  bytes: number;         // 本次传输字节数
  rate?: number;         // 传输速率 (bytes/s)
  estimated?: number;    // 预计剩余时间 (s)
  upload?: boolean;      // 是否为上传
  download?: boolean;    // 是否为下载
}

export interface AxiosRequestConfig {
  // ... 其他配置
  
  /** 上传进度回调 */
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
  
  /** 下载进度回调 */
  onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
}
```

### 增强的进度事件

```typescript
// src/helpers/progressEvent.ts

interface ProgressState {
  startTime: number;
  lastTime: number;
  lastLoaded: number;
}

export function createProgressHandler(
  callback: (event: AxiosProgressEvent) => void,
  isUpload: boolean
): (event: ProgressEvent) => void {
  const state: ProgressState = {
    startTime: Date.now(),
    lastTime: Date.now(),
    lastLoaded: 0
  };
  
  return function (event: ProgressEvent) {
    const now = Date.now();
    const loaded = event.loaded;
    const total = event.total;
    const lengthComputable = event.lengthComputable;
    
    // 计算增量
    const bytes = loaded - state.lastLoaded;
    const timeDiff = (now - state.lastTime) / 1000;
    
    // 计算速率
    const rate = timeDiff > 0 ? bytes / timeDiff : 0;
    
    // 计算进度
    const progress = lengthComputable ? loaded / total : undefined;
    
    // 计算剩余时间
    const remaining = total - loaded;
    const estimated = rate > 0 ? remaining / rate : undefined;
    
    // 更新状态
    state.lastTime = now;
    state.lastLoaded = loaded;
    
    // 调用回调
    callback({
      loaded,
      total,
      progress,
      bytes,
      rate,
      estimated,
      upload: isUpload,
      download: !isUpload
    });
  };
}
```

## 使用示例

### 单文件上传

```typescript
// 基本文件上传
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post('/api/upload', formData, {
    onUploadProgress: (event) => {
      if (event.progress !== undefined) {
        console.log(`上传进度: ${(event.progress * 100).toFixed(2)}%`);
      }
    }
  });
  
  return response.data.url;
}
```

### 带进度条的上传

```typescript
// React 组件示例
function FileUploader() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/api/upload', formData, {
        onUploadProgress: (event) => {
          if (event.progress !== undefined) {
            setProgress(Math.round(event.progress * 100));
          }
        }
      });
      
      setUploadedUrl(response.data.url);
    } catch (error) {
      console.error('上传失败:', error);
    } finally {
      setUploading(false);
    }
  }
  
  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={uploading} />
      
      {uploading && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
          <span>{progress}%</span>
        </div>
      )}
      
      {uploadedUrl && (
        <div>
          上传成功: <a href={uploadedUrl}>{uploadedUrl}</a>
        </div>
      )}
    </div>
  );
}
```

### 多文件上传

```typescript
async function uploadMultipleFiles(files: FileList): Promise<string[]> {
  const formData = new FormData();
  
  // 添加所有文件
  Array.from(files).forEach((file, index) => {
    formData.append(`files`, file);
  });
  
  const response = await axios.post('/api/upload/batch', formData, {
    onUploadProgress: (event) => {
      if (event.progress !== undefined) {
        console.log(`总进度: ${(event.progress * 100).toFixed(2)}%`);
      }
    }
  });
  
  return response.data.urls;
}
```

### 混合数据上传

```typescript
interface CreatePostData {
  title: string;
  content: string;
  tags: string[];
  coverImage: File;
  attachments: File[];
}

async function createPost(data: CreatePostData): Promise<void> {
  const formData = new FormData();
  
  // 普通字段
  formData.append('title', data.title);
  formData.append('content', data.content);
  
  // 数组字段
  data.tags.forEach(tag => {
    formData.append('tags[]', tag);
  });
  
  // 文件字段
  formData.append('coverImage', data.coverImage);
  
  data.attachments.forEach(file => {
    formData.append('attachments[]', file);
  });
  
  await axios.post('/api/posts', formData);
}
```

## 高级功能

### 文件类型验证

```typescript
interface UploadOptions {
  file: File;
  allowedTypes?: string[];
  maxSize?: number;  // bytes
}

function validateFile(options: UploadOptions): void {
  const { file, allowedTypes, maxSize } = options;
  
  // 类型验证
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    throw new Error(
      `不支持的文件类型: ${file.type}。允许的类型: ${allowedTypes.join(', ')}`
    );
  }
  
  // 大小验证
  if (maxSize && file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(2);
    throw new Error(`文件大小不能超过 ${sizeMB}MB`);
  }
}

async function uploadWithValidation(
  file: File,
  options: Omit<UploadOptions, 'file'> = {}
): Promise<string> {
  validateFile({ file, ...options });
  
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post('/api/upload', formData);
  return response.data.url;
}

// 使用
uploadWithValidation(file, {
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
  maxSize: 5 * 1024 * 1024  // 5MB
});
```

### 取消上传

```typescript
function uploadWithCancel(file: File) {
  const controller = new AbortController();
  
  const promise = axios.post('/api/upload', formData, {
    signal: controller.signal,
    onUploadProgress: (event) => {
      // 更新进度...
    }
  });
  
  return {
    promise,
    cancel: () => controller.abort()
  };
}

// 使用
const upload = uploadWithCancel(file);

// 取消上传
cancelButton.onclick = () => {
  upload.cancel();
};

try {
  const result = await upload.promise;
} catch (error) {
  if (axios.isCancel(error)) {
    console.log('上传已取消');
  }
}
```

### 断点续传

```typescript
interface ChunkUploadOptions {
  file: File;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

async function uploadWithResume(options: ChunkUploadOptions): Promise<string> {
  const { file, chunkSize = 1024 * 1024, onProgress } = options;
  
  // 计算文件哈希（用于标识文件）
  const fileHash = await calculateFileHash(file);
  
  // 检查已上传的分片
  const { uploadedChunks, uploadId } = await checkUploadStatus(fileHash);
  
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    // 跳过已上传的分片
    if (uploadedChunks.includes(i)) {
      continue;
    }
    
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', String(i));
    formData.append('uploadId', uploadId);
    
    await axios.post('/api/upload/chunk', formData);
    
    if (onProgress) {
      onProgress((i + 1) / totalChunks);
    }
  }
  
  // 完成上传
  const response = await axios.post('/api/upload/complete', { uploadId });
  return response.data.url;
}
```

## Node.js 环境

### 使用 form-data 包

```typescript
// Node.js 中使用 FormData
import FormData from 'form-data';
import fs from 'fs';

const form = new FormData();

// 从文件读取
form.append('file', fs.createReadStream('/path/to/file'));

// 从 Buffer
form.append('document', Buffer.from('Hello World'), {
  filename: 'hello.txt',
  contentType: 'text/plain'
});

axios.post('/api/upload', form, {
  headers: form.getHeaders()
});
```

## 测试

```typescript
describe('FormData Upload', () => {
  it('should upload file successfully', async () => {
    const file = new File(['test content'], 'test.txt', {
      type: 'text/plain'
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    mock.onPost('/api/upload').reply(200, {
      url: 'https://cdn.example.com/test.txt'
    });
    
    const response = await axios.post('/api/upload', formData);
    
    expect(response.data.url).toBe('https://cdn.example.com/test.txt');
  });
  
  it('should track upload progress', async () => {
    const progressEvents: number[] = [];
    
    // 模拟进度事件...
    
    expect(progressEvents.length).toBeGreaterThan(0);
  });
});
```

## 小结

本节我们实现了完整的 FormData 和文件上传支持：

1. **FormData 检测**：自动识别和处理
2. **进度监控**：上传和下载进度回调
3. **多文件上传**：批量处理多个文件
4. **混合数据**：文件与普通字段组合
5. **高级功能**：验证、取消、断点续传

文件上传是 Web 应用的常见需求，合理的实现能显著提升用户体验。
