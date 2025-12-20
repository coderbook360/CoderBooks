# 命令行交互：readline 模块

有时我们需要在运行过程中获取用户输入。readline 是 Node.js 内置的行读取模块。

## 基本用法

```javascript
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('你的名字是？', (answer) => {
  console.log(`你好，${answer}！`);
  rl.close();
});
```

## 多问题交互

回调嵌套方式：

```javascript
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('姓名: ', (name) => {
  rl.question('年龄: ', (age) => {
    rl.question('城市: ', (city) => {
      console.log(`\n信息：${name}, ${age}岁, 来自${city}`);
      rl.close();
    });
  });
});
```

## Promise 封装

```javascript
const readline = require('readline');

function createPrompter() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return {
    ask(question) {
      return new Promise((resolve) => {
        rl.question(question, resolve);
      });
    },
    close() {
      rl.close();
    }
  };
}

async function main() {
  const prompt = createPrompter();
  
  const name = await prompt.ask('姓名: ');
  const age = await prompt.ask('年龄: ');
  const city = await prompt.ask('城市: ');
  
  console.log(`\n信息：${name}, ${age}岁, 来自${city}`);
  
  prompt.close();
}

main();
```

## Node.js 17+ 内置 Promise API

```javascript
const readline = require('readline/promises');

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const name = await rl.question('姓名: ');
  const age = await rl.question('年龄: ');
  
  console.log(`你好，${name}，${age}岁`);
  
  rl.close();
}

main();
```

## 逐行读取

处理大文件或持续输入：

```javascript
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

console.log('输入命令（exit 退出）：');
rl.prompt();

rl.on('line', (line) => {
  const input = line.trim();
  
  switch (input) {
    case 'exit':
      console.log('再见！');
      rl.close();
      break;
    case 'help':
      console.log('命令：help, status, exit');
      break;
    case 'status':
      console.log('状态：正常运行');
      break;
    default:
      console.log(`未知命令：${input}`);
  }
  
  rl.prompt();
});

rl.on('close', () => {
  process.exit(0);
});
```

## 读取文件

```javascript
const readline = require('readline');
const fs = require('fs');

async function processFile(filePath) {
  const stream = fs.createReadStream(filePath);
  
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity  // 处理 Windows 换行
  });
  
  let lineNumber = 0;
  
  for await (const line of rl) {
    lineNumber++;
    console.log(`${lineNumber}: ${line}`);
  }
  
  console.log(`\n共 ${lineNumber} 行`);
}

processFile('example.txt');
```

## 输入验证

```javascript
const readline = require('readline/promises');

async function askWithValidation(rl, question, validator) {
  while (true) {
    const answer = await rl.question(question);
    const result = validator(answer);
    
    if (result.valid) {
      return result.value;
    }
    
    console.log(`错误：${result.error}`);
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const age = await askWithValidation(
    rl,
    '请输入年龄: ',
    (input) => {
      const num = parseInt(input, 10);
      if (isNaN(num)) {
        return { valid: false, error: '请输入数字' };
      }
      if (num < 0 || num > 150) {
        return { valid: false, error: '年龄范围 0-150' };
      }
      return { valid: true, value: num };
    }
  );
  
  console.log(`你的年龄是：${age}`);
  rl.close();
}

main();
```

## 密码输入

隐藏用户输入：

```javascript
const readline = require('readline');

function askPassword(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // 隐藏输入
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    
    let password = '';
    
    process.stdin.on('data', (char) => {
      char = char.toString();
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':  // Ctrl+D
          process.stdin.setRawMode(false);
          rl.close();
          console.log();
          resolve(password);
          break;
        case '\u0003':  // Ctrl+C
          process.exit();
          break;
        case '\u007F':  // Backspace
          password = password.slice(0, -1);
          break;
        default:
          password += char;
          process.stdout.write('*');
      }
    });
  });
}

async function main() {
  const password = await askPassword('密码: ');
  console.log(`密码长度：${password.length}`);
}

main();
```

## 完整交互示例

```javascript
const readline = require('readline/promises');

async function createUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('=== 创建用户 ===\n');
  
  const username = await rl.question('用户名: ');
  const email = await rl.question('邮箱: ');
  const age = await rl.question('年龄: ');
  
  console.log('\n确认信息：');
  console.log(`  用户名: ${username}`);
  console.log(`  邮箱: ${email}`);
  console.log(`  年龄: ${age}`);
  
  const confirm = await rl.question('\n确认创建？(y/n): ');
  
  if (confirm.toLowerCase() === 'y') {
    console.log('\n用户创建成功！');
  } else {
    console.log('\n已取消');
  }
  
  rl.close();
}

createUser();
```

## 本章小结

- `readline.createInterface` 创建交互接口
- `question()` 提问并获取回答
- `for await...of` 逐行读取
- Promise 封装让代码更清晰
- Node.js 17+ 内置 `readline/promises`

下一章我们将学习更强大的 Inquirer.js。
