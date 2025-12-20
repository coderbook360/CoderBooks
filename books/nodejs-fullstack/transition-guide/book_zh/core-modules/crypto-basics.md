# crypto 基础：哈希、加密与安全随机数

`crypto` 模块是 Node.js 内置的加密模块，提供了哈希、加密、随机数生成等安全相关功能。

## 哈希 vs 加密

首先澄清一个常见误区：

- **哈希**（Hash）：单向转换，不可逆。用于验证数据完整性、存储密码。
- **加密**（Encryption）：双向转换，可解密。用于保护数据传输和存储。

```javascript
// 哈希：无法还原原文
hash('password') → 'a1b2c3...'  // 不可逆

// 加密：可以解密
encrypt('message', key) → 'xyz...'
decrypt('xyz...', key) → 'message'
```

## 哈希函数

### 创建哈希

```javascript
const crypto = require('crypto');

// 计算字符串的 SHA-256 哈希
const hash = crypto.createHash('sha256')
  .update('Hello World')
  .digest('hex');
  
console.log(hash);
// '64ec88ca00b268e5ba1a35678a1b5316d212f4f366b2477232534a8aeca37f3c'
```

### 常用哈希算法

```javascript
// MD5（不推荐用于安全场景）
crypto.createHash('md5').update(data).digest('hex');

// SHA-1（已不安全，不推荐）
crypto.createHash('sha1').update(data).digest('hex');

// SHA-256（推荐）
crypto.createHash('sha256').update(data).digest('hex');

// SHA-512（更强）
crypto.createHash('sha512').update(data).digest('hex');
```

### 输出格式

```javascript
const hash = crypto.createHash('sha256').update('data');

hash.digest('hex');    // 十六进制字符串
hash.digest('base64'); // Base64 编码
hash.digest('binary'); // 二进制字符串
hash.digest();         // Buffer
```

### 文件哈希

```javascript
const fs = require('fs');

function fileHash(filePath, algorithm = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// 使用
const hash = await fileHash('./package.json');
console.log(`SHA-256: ${hash}`);
```

## HMAC：带密钥的哈希

HMAC 用于验证消息的完整性和来源：

```javascript
const hmac = crypto.createHmac('sha256', 'secret-key')
  .update('message')
  .digest('hex');
  
console.log(hmac);
```

常见用途：
- API 签名验证
- Webhook 验证
- 会话令牌

```javascript
// API 签名示例
function signRequest(method, path, body, secretKey) {
  const payload = `${method}\n${path}\n${JSON.stringify(body)}`;
  return crypto.createHmac('sha256', secretKey)
    .update(payload)
    .digest('hex');
}

const signature = signRequest('POST', '/api/users', { name: 'test' }, 'my-secret');
```

## 密码哈希

直接使用 SHA-256 存储密码是不安全的。应使用专门的密码哈希函数：

### scrypt（推荐）

```javascript
const crypto = require('crypto');
const util = require('util');

const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  const derivedKey = await scrypt(password, salt, 64);
  return derivedKey.toString('hex') === hash;
}

// 使用
const hash = await hashPassword('myPassword123');
const isValid = await verifyPassword('myPassword123', hash);
```

### pbkdf2

```javascript
const pbkdf2 = util.promisify(crypto.pbkdf2);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await pbkdf2(password, salt, 100000, 64, 'sha512');
  return `${salt}:${derivedKey.toString('hex')}`;
}
```

## 安全随机数

### 生成随机字节

```javascript
// 异步（推荐）
crypto.randomBytes(32, (err, buffer) => {
  console.log(buffer.toString('hex'));
});

// Promise 版本
const randomBytes = util.promisify(crypto.randomBytes);
const buffer = await randomBytes(32);

// 同步（阻塞）
const buffer = crypto.randomBytes(32);
```

### 生成 UUID

```javascript
// Node.js 14.17+
const { randomUUID } = require('crypto');

const uuid = randomUUID();
console.log(uuid);  // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
```

### 生成令牌

```javascript
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

const token = generateToken();
// 'a1b2c3d4e5f6...'（64个字符的十六进制字符串）

// URL 安全的令牌
function generateUrlSafeToken(length = 32) {
  return crypto.randomBytes(length)
    .toString('base64url');
}
```

### 生成随机整数

```javascript
// 生成 [min, max] 范围内的随机整数
function randomInt(min, max) {
  return crypto.randomInt(min, max + 1);
}

// Node.js 14.10+
crypto.randomInt(100);       // 0-99
crypto.randomInt(1, 100);    // 1-99
```

## 对称加密（AES）

对称加密使用同一个密钥进行加密和解密：

```javascript
const algorithm = 'aes-256-cbc';

function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted, key) {
  const [ivHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// 使用（密钥必须是 32 字节）
const key = crypto.randomBytes(32);
const encrypted = encrypt('Hello World', key);
const decrypted = decrypt(encrypted, key);
```

### 重要安全提醒

1. **永远不要硬编码密钥**
2. **使用随机 IV**（初始化向量）
3. **密钥长度必须正确**（AES-256 需要 32 字节）
4. **妥善保管密钥**

## 实战示例

### API 密钥生成

```javascript
class ApiKeyGenerator {
  static generate() {
    const prefix = 'sk';  // secret key
    const random = crypto.randomBytes(24).toString('base64url');
    return `${prefix}_${random}`;
  }
  
  static validate(key) {
    return /^sk_[A-Za-z0-9_-]{32}$/.test(key);
  }
}

const apiKey = ApiKeyGenerator.generate();
// 'sk_Abc123...'
```

### 简单的 Token 验证

```javascript
class TokenService {
  constructor(secret) {
    this.secret = secret;
  }
  
  generate(userId, expiresIn = 3600) {
    const payload = JSON.stringify({
      userId,
      exp: Date.now() + expiresIn * 1000
    });
    
    const signature = crypto.createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
    
    const token = Buffer.from(payload).toString('base64url');
    return `${token}.${signature}`;
  }
  
  verify(token) {
    const [payloadB64, signature] = token.split('.');
    const payload = Buffer.from(payloadB64, 'base64url').toString();
    
    const expectedSig = crypto.createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSig) {
      throw new Error('Invalid signature');
    }
    
    const data = JSON.parse(payload);
    if (Date.now() > data.exp) {
      throw new Error('Token expired');
    }
    
    return data;
  }
}
```

### 数据完整性校验

```javascript
function createChecksum(data) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .slice(0, 8);  // 取前8位
}

function addChecksum(data) {
  return {
    ...data,
    _checksum: createChecksum(data)
  };
}

function verifyChecksum(data) {
  const { _checksum, ...rest } = data;
  return _checksum === createChecksum(rest);
}
```

## 安全注意事项

1. **不要使用 MD5 或 SHA1 存储密码**
2. **使用 scrypt 或 bcrypt 处理密码**
3. **使用 crypto.randomBytes 生成随机数**
4. **不要自己实现加密算法**
5. **密钥要安全存储（环境变量、密钥管理服务）**
6. **定期轮换密钥**

## 本章小结

- 哈希是单向的，加密是双向的
- 使用 SHA-256 进行数据校验
- 使用 scrypt/pbkdf2 存储密码
- 使用 randomBytes/randomUUID 生成安全随机数
- 对称加密使用 AES-256-CBC，注意使用随机 IV
- 遵循安全最佳实践，不要自创加密方案

下一章我们将学习 util 模块的实用工具函数。
