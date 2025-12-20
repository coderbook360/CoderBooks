# os 模块：系统信息获取

`os` 模块提供了获取操作系统信息的方法，用于编写系统感知的应用程序。

## 基础系统信息

### 操作系统类型

```javascript
const os = require('os');

console.log(os.platform());  // 'win32', 'darwin', 'linux'
console.log(os.type());      // 'Windows_NT', 'Darwin', 'Linux'
console.log(os.release());   // '10.0.19041'（版本号）
console.log(os.arch());      // 'x64', 'arm64'
```

跨平台处理：

```javascript
const isWindows = os.platform() === 'win32';
const isMac = os.platform() === 'darwin';
const isLinux = os.platform() === 'linux';

// 根据平台选择命令
const openCommand = isWindows ? 'start' : isMac ? 'open' : 'xdg-open';
```

### 主机信息

```javascript
console.log(os.hostname());   // 'my-computer'
console.log(os.userInfo());   // { username, uid, gid, shell, homedir }
console.log(os.homedir());    // '/Users/username' 或 'C:\\Users\\username'
console.log(os.tmpdir());     // 临时目录路径
```

## CPU 信息

```javascript
const cpus = os.cpus();

console.log(`CPU 核心数: ${cpus.length}`);
console.log(`CPU 型号: ${cpus[0].model}`);
console.log(`CPU 速度: ${cpus[0].speed} MHz`);

// 每个核心的详细信息
cpus.forEach((cpu, index) => {
  console.log(`核心 ${index}:`, cpu.times);
  // { user, nice, sys, idle, irq }
});
```

### 计算 CPU 使用率

```javascript
function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  
  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length,
    usage: 1 - totalIdle / totalTick
  };
}

// 计算一段时间内的使用率
async function measureCpuUsage(interval = 1000) {
  const start = getCpuUsage();
  await new Promise(r => setTimeout(r, interval));
  const end = getCpuUsage();
  
  const idleDiff = end.idle - start.idle;
  const totalDiff = end.total - start.total;
  
  return ((1 - idleDiff / totalDiff) * 100).toFixed(1) + '%';
}

const usage = await measureCpuUsage();
console.log(`CPU 使用率: ${usage}`);
```

## 内存信息

```javascript
// 总内存和空闲内存（字节）
console.log(`总内存: ${os.totalmem()}`);
console.log(`空闲内存: ${os.freemem()}`);

// 格式化输出
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index++;
  }
  return `${bytes.toFixed(2)} ${units[index]}`;
}

console.log(`总内存: ${formatBytes(os.totalmem())}`);   // '16.00 GB'
console.log(`空闲内存: ${formatBytes(os.freemem())}`); // '8.50 GB'
console.log(`内存使用率: ${((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)}%`);
```

## 网络接口

```javascript
const interfaces = os.networkInterfaces();

console.log(interfaces);
// {
//   'eth0': [
//     { address: '192.168.1.100', netmask: '255.255.255.0', family: 'IPv4', ... },
//     { address: 'fe80::...', family: 'IPv6', ... }
//   ],
//   'lo': [...]
// }
```

### 获取本机 IP

```javascript
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部接口和 IPv6
      if (iface.internal || iface.family !== 'IPv4') {
        continue;
      }
      return iface.address;
    }
  }
  return '127.0.0.1';
}

console.log(`本机 IP: ${getLocalIP()}`);
```

### 获取所有 IP

```javascript
function getAllIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const [name, ifaces] of Object.entries(interfaces)) {
    for (const iface of ifaces) {
      if (!iface.internal) {
        addresses.push({
          name,
          address: iface.address,
          family: iface.family,
          mac: iface.mac
        });
      }
    }
  }
  
  return addresses;
}
```

## 系统运行时间

```javascript
// 系统运行时间（秒）
const uptime = os.uptime();

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  
  return parts.join(' ') || '刚刚启动';
}

console.log(`系统运行时间: ${formatUptime(os.uptime())}`);
```

## 平台常量

```javascript
// 换行符
console.log(os.EOL);  // '\n' 或 '\r\n'

// 字节序
console.log(os.endianness());  // 'LE' 或 'BE'

// 系统常量
console.log(os.constants.signals);  // { SIGHUP: 1, SIGINT: 2, ... }
console.log(os.constants.errno);    // { ENOENT: 2, EACCES: 13, ... }
```

跨平台写文件：

```javascript
const lines = ['line1', 'line2', 'line3'];
const content = lines.join(os.EOL);
await fs.writeFile('output.txt', content);
```

## 负载平均值（Linux/macOS）

```javascript
// 1分钟、5分钟、15分钟的平均负载
const loadavg = os.loadavg();
console.log(`负载: ${loadavg.map(n => n.toFixed(2)).join(', ')}`);
// Windows 返回 [0, 0, 0]
```

## 实战示例

### 系统信息报告

```javascript
function getSystemReport() {
  return {
    platform: {
      type: os.type(),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release()
    },
    host: {
      hostname: os.hostname(),
      uptime: formatUptime(os.uptime()),
      user: os.userInfo().username
    },
    cpu: {
      model: os.cpus()[0]?.model,
      cores: os.cpus().length,
      speed: `${os.cpus()[0]?.speed} MHz`
    },
    memory: {
      total: formatBytes(os.totalmem()),
      free: formatBytes(os.freemem()),
      used: formatBytes(os.totalmem() - os.freemem()),
      usagePercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1) + '%'
    },
    network: {
      localIP: getLocalIP()
    }
  };
}

console.log(JSON.stringify(getSystemReport(), null, 2));
```

### 简单的健康检查

```javascript
function healthCheck() {
  const memUsage = 1 - os.freemem() / os.totalmem();
  const cpuCount = os.cpus().length;
  
  const warnings = [];
  
  if (memUsage > 0.9) {
    warnings.push('内存使用率超过 90%');
  }
  
  if (cpuCount < 2) {
    warnings.push('CPU 核心数不足');
  }
  
  return {
    status: warnings.length === 0 ? 'healthy' : 'warning',
    checks: {
      memory: memUsage < 0.9,
      cpu: cpuCount >= 2
    },
    warnings
  };
}
```

### 根据系统资源动态配置

```javascript
function getOptimalConfig() {
  const cpuCount = os.cpus().length;
  const totalMemGB = os.totalmem() / (1024 ** 3);
  
  return {
    // Worker 数量：CPU 核心数 - 1
    workers: Math.max(1, cpuCount - 1),
    
    // 连接池大小：每核心 10 个连接
    poolSize: cpuCount * 10,
    
    // 缓存大小：可用内存的 10%
    cacheSize: Math.floor(totalMemGB * 0.1 * 1024),  // MB
    
    // 文件上传限制：内存的 5%
    maxFileSize: Math.floor(totalMemGB * 0.05 * 1024 * 1024 * 1024)  // bytes
  };
}

const config = getOptimalConfig();
console.log('推荐配置:', config);
```

### 进程资源监控

```javascript
function monitorResources() {
  const memUsage = process.memoryUsage();
  
  return {
    system: {
      freeMem: formatBytes(os.freemem()),
      totalMem: formatBytes(os.totalmem())
    },
    process: {
      heapUsed: formatBytes(memUsage.heapUsed),
      heapTotal: formatBytes(memUsage.heapTotal),
      rss: formatBytes(memUsage.rss),
      external: formatBytes(memUsage.external)
    },
    uptime: {
      system: formatUptime(os.uptime()),
      process: formatUptime(process.uptime())
    }
  };
}
```

## 本章小结

- `os.platform()` 和 `os.arch()` 用于平台检测
- `os.cpus()` 获取 CPU 信息和核心数
- `os.totalmem()` 和 `os.freemem()` 获取内存信息
- `os.networkInterfaces()` 获取网络接口和 IP
- `os.EOL` 处理跨平台换行符
- 根据系统资源动态调整应用配置

下一章我们将学习 child_process 模块执行外部命令。
