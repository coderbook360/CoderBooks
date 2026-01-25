import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 测试解析单个 toc.md
const tocPath = path.resolve(__dirname, '../../router/book_zh/toc.md')
console.log('Reading:', tocPath)
console.log('File exists:', fs.existsSync(tocPath))

const content = fs.readFileSync(tocPath, 'utf-8')
const lines = content.split('\n')

console.log('\nTotal lines:', lines.length)
console.log('\nFirst 20 lines:')
lines.slice(0, 20).forEach((line, i) => {
  console.log(`${i}: ${JSON.stringify(line)}`)
})

// 测试正则匹配
const testLines = [
  '### 第一部分：设计思想',
  '#### 2.1 响应式核心',
  '1. [前端路由发展历程](design/routing-history.md)'
]

console.log('\n\nTesting regex:')
testLines.forEach(line => {
  const sectionMatch = line.match(/^###\s+(.+)/)
  const subSectionMatch = line.match(/^####\s+(.+)/)
  const itemMatch = line.match(/^\d+\.\s+\[(.+?)\]\((.+?)\)/)
  
  console.log('\nLine:', line)
  console.log('Section match:', sectionMatch?.[1])
  console.log('SubSection match:', subSectionMatch?.[1])
  console.log('Item match:', itemMatch ? { text: itemMatch[1], link: itemMatch[2] } : null)
})
