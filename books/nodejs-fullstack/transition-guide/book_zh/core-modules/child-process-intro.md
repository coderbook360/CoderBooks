# child_process 入门：执行外部命令

Node.js 的 `child_process` 模块让你能够执行系统命令、运行其他程序、创建子进程。这是构建 CLI 工具和自动化脚本的关键能力。

## 四种创建子进程的方法

| 方法 | 特点 | 适用场景 |
|------|------|----------|
| `exec` | Shell 执行，缓冲输出 | 简单命令，输出量小 |
| `execFile` | 直接执行文件，更安全 | 执行特定程序 |
| `spawn` | 流式输出，更灵活 | 大量输出，长时间运行 |
| `fork` | 创建 Node.js 子进程 | Node.js 进程间通信 |

## exec：最简单的方式

```javascript
const { exec } = require('child_process');

exec('ls -la', (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);
});
```

### Promise 版本

```javascript
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

async function run() {
  try {
    const { stdout, stderr } = await execAsync('git status');
    console.log(stdout);
  } catch (error) {
    console.error('执行失败:', error.message);
  }
}
```

### 常用选项

```javascript
exec('command', {
  cwd: '/path/to/dir',      // 工作目录
  env: { ...process.env },  // 环境变量
  timeout: 5000,            // 超时（毫秒）
  maxBuffer: 1024 * 1024,   // 最大输出缓冲区
  encoding: 'utf8',         // 输出编码
  shell: '/bin/bash'        // 使用的 shell
}, callback);
```

### 安全警告：命令注入

```javascript
// 危险！用户输入可能包含恶意命令
const userInput = 'file.txt; rm -rf /';
exec(`cat ${userInput}`);  // 不要这样做！

// 安全做法：使用 execFile 或验证输入
const { execFile } = require('child_process');
execFile('cat', [userInput]);  // 更安全
```

## execFile：更安全的执行

`execFile` 直接执行文件，不通过 shell：

```javascript
const { execFile } = require('child_process');

execFile('git', ['status', '--short'], (error, stdout, stderr) => {
  console.log(stdout);
});

// Promise 版本
const execFileAsync = util.promisify(execFile);
const { stdout } = await execFileAsync('node', ['--version']);
```

### exec vs execFile

- `exec`：通过 shell 执行，支持管道、重定向等 shell 特性
- `execFile`：直接执行程序，更快更安全，但不支持 shell 特性

```javascript
// exec 支持 shell 特性
exec('cat file.txt | grep error');

// execFile 不支持，需要分别处理
execFile('cat', ['file.txt']);  // 然后程序内处理
```

## spawn：流式处理

`spawn` 返回一个带有 stdout/stderr 流的子进程对象：

```javascript
const { spawn } = require('child_process');

const child = spawn('ls', ['-la']);

child.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
  console.log(`子进程退出，退出码 ${code}`);
});

child.on('error', (err) => {
  console.error('启动子进程失败:', err);
});
```

### 适用场景

- 输出量大（超过 1MB）
- 长时间运行的进程
- 需要实时处理输出
- 需要向子进程写入数据

### 向子进程写入

```javascript
const child = spawn('cat');

child.stdin.write('Hello\n');
child.stdin.write('World\n');
child.stdin.end();

child.stdout.on('data', (data) => {
  console.log(data.toString());
});
```

### 管道连接

```javascript
const { spawn } = require('child_process');

// 实现 cat file.txt | grep error
const cat = spawn('cat', ['file.txt']);
const grep = spawn('grep', ['error']);

cat.stdout.pipe(grep.stdin);

grep.stdout.on('data', (data) => {
  console.log(data.toString());
});
```

## fork：Node.js 进程通信

`fork` 专门用于创建 Node.js 子进程，自带 IPC 通道：

```javascript
// parent.js
const { fork } = require('child_process');

const child = fork('./worker.js');

// 发送消息给子进程
child.send({ task: 'compute', data: [1, 2, 3, 4, 5] });

// 接收子进程消息
child.on('message', (result) => {
  console.log('收到结果:', result);
});

child.on('exit', (code) => {
  console.log('Worker 退出');
});
```

```javascript
// worker.js
process.on('message', (msg) => {
  if (msg.task === 'compute') {
    const result = msg.data.reduce((a, b) => a + b, 0);
    process.send({ result });
  }
});
```

### 传递复杂数据

```javascript
// 发送对象
child.send({
  type: 'job',
  payload: { id: 1, data: 'content' }
});

// 接收
process.on('message', (msg) => {
  if (msg.type === 'job') {
    handleJob(msg.payload);
  }
});
```

## 同步方法

每个方法都有同步版本（阻塞主线程）：

```javascript
const { execSync, spawnSync, execFileSync } = require('child_process');

// execSync
const output = execSync('git status', { encoding: 'utf8' });

// spawnSync
const result = spawnSync('ls', ['-la']);
console.log(result.stdout.toString());

// execFileSync
const version = execFileSync('node', ['--version'], { encoding: 'utf8' });
```

**使用场景**：CLI 工具、脚本、启动配置。不要在服务器请求处理中使用。

## 信号和终止

```javascript
const child = spawn('long-running-process');

// 发送信号
child.kill('SIGTERM');  // 请求终止
child.kill('SIGKILL');  // 强制终止

// 监听退出
child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`被信号 ${signal} 终止`);
  } else {
    console.log(`退出码: ${code}`);
  }
});
```

### 超时处理

```javascript
async function execWithTimeout(command, timeout) {
  return new Promise((resolve, reject) => {
    const child = exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
    
    setTimeout(() => {
      child.kill();
      reject(new Error('执行超时'));
    }, timeout);
  });
}
```

## 实战示例

### 执行 Git 命令

```javascript
const { execSync } = require('child_process');

function git(args) {
  try {
    return execSync(`git ${args}`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    throw new Error(`Git 命令失败: ${error.stderr || error.message}`);
  }
}

const branch = git('branch --show-current');
const lastCommit = git('log -1 --pretty=format:"%h %s"');
const status = git('status --short');
```

### 运行 npm 脚本

```javascript
function runNpmScript(script, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], {
      stdio: 'inherit',  // 继承父进程的 stdio
      cwd: options.cwd || process.cwd(),
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm run ${script} 失败，退出码 ${code}`));
    });
  });
}

await runNpmScript('build');
```

### 并行执行多个命令

```javascript
async function runParallel(commands) {
  const execAsync = util.promisify(exec);
  const results = await Promise.allSettled(
    commands.map(cmd => execAsync(cmd))
  );
  
  return results.map((result, index) => ({
    command: commands[index],
    success: result.status === 'fulfilled',
    output: result.status === 'fulfilled' 
      ? result.value.stdout 
      : result.reason.message
  }));
}

const results = await runParallel([
  'echo "Hello"',
  'node --version',
  'npm --version'
]);
```

## 安全最佳实践

1. **避免直接拼接用户输入到命令中**
2. **优先使用 `execFile` 或 `spawn`**
3. **设置合理的超时**
4. **限制子进程权限**

```javascript
// 安全的命令执行
function safeExec(command, args = []) {
  // 验证命令是否在白名单中
  const allowedCommands = ['git', 'npm', 'node'];
  if (!allowedCommands.includes(command)) {
    throw new Error(`不允许执行: ${command}`);
  }
  
  return execFileAsync(command, args, {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024
  });
}
```

## 本章小结

- `exec`：简单命令，通过 shell 执行
- `execFile`：直接执行程序，更安全
- `spawn`：流式处理，适合大量输出
- `fork`：创建 Node.js 子进程，支持 IPC 通信
- 注意命令注入安全问题
- 生产环境设置超时和资源限制

下一章我们将学习 Buffer 基础，理解 Node.js 如何处理二进制数据。
