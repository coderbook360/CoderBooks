# URL-Encoding 请求体处理

除了 JSON 和 FormData，URL-Encoding 是另一种常见的数据格式。本节实现 application/x-www-form-urlencoded 支持。

## 本节目标

通过本节学习，你将：

1. 理解 URL-Encoding 格式及其应用场景
2. 实现数据到 URL-Encoding 格式的转换
3. 处理嵌套对象和数组的编码
4. 自动检测和设置 Content-Type

## 什么是 URL-Encoding？

### 格式说明

URL-Encoding（也称为 percent-encoding）将数据编码为 `key=value` 对：

```
原始数据:
{
  name: "张三",
  age: 25,
  tags: ["dev", "js"]
}

URL-Encoded:
name=%E5%BC%A0%E4%B8%89&age=25&tags[0]=dev&tags[1]=js
```

### 与其他格式对比

```
格式                    Content-Type                    适用场景
─────────────────────────────────────────────────────────────────
JSON                   application/json                现代 API
URL-Encoded           application/x-www-form-urlencoded   表单提交
FormData              multipart/form-data             文件上传
```

### 应用场景

- 传统 HTML 表单提交
- OAuth 认证请求
- 某些老旧 API
- 简单的键值对数据

## 实现 URL-Encoding

### 基础编码

```typescript
// src/helpers/urlEncode.ts

export function urlEncode(data: Record<string, any>): string {
  const parts: string[] = [];
  
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      
      if (value === null || value === undefined) {
        continue;
      }
      
      parts.push(
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      );
    }
  }
  
  return parts.join('&');
}

// 使用
urlEncode({ name: '张三', age: 25 });
// 输出: name=%E5%BC%A0%E4%B8%89&age=25
```

### 处理嵌套对象和数组

```typescript
// src/helpers/urlEncode.ts

interface EncodeOptions {
  /** 数组格式：brackets=tags[], indices=tags[0], repeat=tags */
  arrayFormat?: 'brackets' | 'indices' | 'repeat';
  /** 是否编码键名 */
  encodeValuesOnly?: boolean;
  /** 自定义编码函数 */
  encoder?: (value: string) => string;
}

export function urlEncode(
  data: any,
  options: EncodeOptions = {}
): string {
  const {
    arrayFormat = 'indices',
    encodeValuesOnly = false,
    encoder = encodeURIComponent
  } = options;
  
  const parts: string[] = [];
  
  function encode(key: string, value: any, prefix?: string): void {
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    
    if (value === null || value === undefined) {
      return;
    }
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        let arrayKey: string;
        
        switch (arrayFormat) {
          case 'brackets':
            arrayKey = `${fullKey}[]`;
            break;
          case 'repeat':
            arrayKey = fullKey;
            break;
          case 'indices':
          default:
            arrayKey = `${fullKey}[${index}]`;
        }
        
        if (typeof item === 'object' && item !== null) {
          encode('', item, arrayKey);
        } else {
          addPart(arrayKey, item);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach(nestedKey => {
        encode(nestedKey, value[nestedKey], fullKey);
      });
    } else {
      addPart(fullKey, value);
    }
  }
  
  function addPart(key: string, value: any): void {
    const encodedKey = encodeValuesOnly ? key : encoder(key);
    const encodedValue = encoder(String(value));
    parts.push(`${encodedKey}=${encodedValue}`);
  }
  
  Object.keys(data).forEach(key => {
    encode(key, data[key]);
  });
  
  return parts.join('&');
}
```

### 不同数组格式示例

```typescript
const data = { tags: ['a', 'b', 'c'] };

// indices 格式（默认）
urlEncode(data, { arrayFormat: 'indices' });
// tags[0]=a&tags[1]=b&tags[2]=c

// brackets 格式
urlEncode(data, { arrayFormat: 'brackets' });
// tags[]=a&tags[]=b&tags[]=c

// repeat 格式
urlEncode(data, { arrayFormat: 'repeat' });
// tags=a&tags=b&tags=c
```

## 集成到请求处理

### 自动转换

```typescript
// src/helpers/transformData.ts

import { urlEncode } from './urlEncode';
import { isFormData } from './isFormData';
import { isPlainObject } from './isPlainObject';
import { isURLSearchParams } from './isURLSearchParams';

export function transformRequest(data: any, headers: any): any {
  // FormData：不处理
  if (isFormData(data)) {
    return data;
  }
  
  // URLSearchParams：直接使用
  if (isURLSearchParams(data)) {
    setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded');
    return data.toString();
  }
  
  // 检查 Content-Type 是否为 urlencoded
  const contentType = headers?.['Content-Type'] || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    if (isPlainObject(data)) {
      return urlEncode(data);
    }
  }
  
  // 默认：JSON
  if (isPlainObject(data)) {
    setContentTypeIfUnset(headers, 'application/json');
    return JSON.stringify(data);
  }
  
  return data;
}
```

### URLSearchParams 检测

```typescript
// src/helpers/isURLSearchParams.ts

export function isURLSearchParams(val: any): val is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}
```

## 使用示例

### 手动设置 Content-Type

```typescript
// 方式1：手动设置 Content-Type
axios.post('/api/login', 
  { username: 'john', password: '123456' },
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
);
// 发送: username=john&password=123456
```

### 使用 URLSearchParams

```typescript
// 方式2：使用原生 URLSearchParams
const params = new URLSearchParams();
params.append('username', 'john');
params.append('password', '123456');

axios.post('/api/login', params);
// 自动设置 Content-Type: application/x-www-form-urlencoded
```

### 使用 qs 库

```typescript
// 方式3：使用 qs 库处理复杂数据
import qs from 'qs';

axios.post('/api/data', 
  qs.stringify({
    user: {
      name: 'john',
      roles: ['admin', 'user']
    }
  }),
  {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }
);
// 发送: user[name]=john&user[roles][0]=admin&user[roles][1]=user
```

## 解码实现

### 基础解码

```typescript
// src/helpers/urlDecode.ts

export function urlDecode(str: string): Record<string, any> {
  const result: Record<string, any> = {};
  
  if (!str) {
    return result;
  }
  
  str.split('&').forEach(pair => {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    
    if (key) {
      // 处理数组格式
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2);
        if (!result[arrayKey]) {
          result[arrayKey] = [];
        }
        result[arrayKey].push(value);
      }
      // 处理索引格式
      else if (key.match(/\[\d+\]$/)) {
        const match = key.match(/^(.+)\[(\d+)\]$/);
        if (match) {
          const [, arrayKey, index] = match;
          if (!result[arrayKey]) {
            result[arrayKey] = [];
          }
          result[arrayKey][parseInt(index)] = value;
        }
      }
      // 普通键值
      else {
        result[key] = value;
      }
    }
  });
  
  return result;
}
```

### 处理嵌套对象

```typescript
function parseNestedKeys(result: Record<string, any>): Record<string, any> {
  const output: Record<string, any> = {};
  
  for (const key in result) {
    const value = result[key];
    const keys = key.split(/\]?\[/).map(k => k.replace(/\]$/, ''));
    
    let current = output;
    
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const isLast = i === keys.length - 1;
      
      if (isLast) {
        current[k] = value;
      } else {
        const nextKey = keys[i + 1];
        const isArray = nextKey === '' || /^\d+$/.test(nextKey);
        
        if (!current[k]) {
          current[k] = isArray ? [] : {};
        }
        current = current[k];
      }
    }
  }
  
  return output;
}
```

## 配置选项

### 序列化器配置

```typescript
// src/types/index.ts

export interface ParamsSerializer {
  /** 自定义序列化函数 */
  serialize?: (params: any) => string;
  /** 编码选项 */
  encode?: (value: string) => string;
  /** 数组格式 */
  indexes?: boolean | null;
}

// 使用
axios.post('/api/data', data, {
  paramsSerializer: {
    serialize: (params) => qs.stringify(params, { arrayFormat: 'brackets' })
  }
});
```

### 全局配置

```typescript
// 设置默认序列化器
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

axios.defaults.transformRequest = [
  function (data, headers) {
    if (isPlainObject(data)) {
      return urlEncode(data);
    }
    return data;
  }
];
```

## 特殊字符处理

### 编码规则

```typescript
// 标准 encodeURIComponent 行为
encodeURIComponent('hello world');  // hello%20world
encodeURIComponent('a+b');          // a%2Bb
encodeURIComponent('a=b');          // a%3Db

// 表单提交的特殊处理（空格编码为 +）
function formEncode(str: string): string {
  return encodeURIComponent(str).replace(/%20/g, '+');
}

formEncode('hello world');  // hello+world
```

### 自定义编码器

```typescript
const customEncoder = (value: string) => {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')           // 空格 -> +
    .replace(/%2C/g, ',')           // 保留逗号
    .replace(/%3A/g, ':');          // 保留冒号
};

urlEncode(data, { encoder: customEncoder });
```

## 测试

```typescript
describe('URL Encoding', () => {
  describe('urlEncode', () => {
    it('should encode simple object', () => {
      const result = urlEncode({ a: 1, b: 2 });
      expect(result).toBe('a=1&b=2');
    });
    
    it('should encode special characters', () => {
      const result = urlEncode({ name: '张三' });
      expect(result).toBe('name=%E5%BC%A0%E4%B8%89');
    });
    
    it('should encode arrays with indices', () => {
      const result = urlEncode({ tags: ['a', 'b'] });
      expect(result).toBe('tags[0]=a&tags[1]=b');
    });
    
    it('should encode nested objects', () => {
      const result = urlEncode({ user: { name: 'john' } });
      expect(result).toBe('user[name]=john');
    });
    
    it('should skip null and undefined', () => {
      const result = urlEncode({ a: 1, b: null, c: undefined });
      expect(result).toBe('a=1');
    });
  });
  
  describe('urlDecode', () => {
    it('should decode simple string', () => {
      const result = urlDecode('a=1&b=2');
      expect(result).toEqual({ a: '1', b: '2' });
    });
    
    it('should decode special characters', () => {
      const result = urlDecode('name=%E5%BC%A0%E4%B8%89');
      expect(result).toEqual({ name: '张三' });
    });
  });
});
```

## 小结

本节我们实现了完整的 URL-Encoding 支持：

1. **基础编码**：简单键值对转换
2. **复杂数据**：嵌套对象和数组处理
3. **多种格式**：indices、brackets、repeat
4. **自动检测**：根据 Content-Type 自动处理
5. **解码功能**：反向解析 URL-Encoded 字符串
6. **自定义编码**：支持自定义编码器

URL-Encoding 虽然不如 JSON 灵活，但在特定场景下仍然必不可少。
