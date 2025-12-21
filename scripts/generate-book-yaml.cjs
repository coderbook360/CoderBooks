/**
 * 从 toc.md 生成 book.yaml
 *
 * book.yaml 格式：
 * title: 书籍标题
 * description: 书籍简介
 * toc:
 *   - text: 序言
 *     link: preface
 *   - text: 第一部分：框架设计哲学
 *     items:
 *       - text: 1. Vue 3 的设计目标
 *         link: overview/design-philosophy
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

const booksDir = path.join(__dirname, '../src/books')

// 遍历所有分类和书籍
function processAllBooks() {
  const categories = fs.readdirSync(booksDir)

  for (const category of categories) {
    const categoryPath = path.join(booksDir, category)
    if (!fs.statSync(categoryPath).isDirectory()) continue

    const books = fs.readdirSync(categoryPath)
    for (const bookDir of books) {
      const bookPath = path.join(categoryPath, bookDir)
      if (!fs.statSync(bookPath).isDirectory()) continue

      const bookZhPath = path.join(bookPath, 'book_zh')
      if (!fs.existsSync(bookZhPath)) continue

      const tocPath = path.join(bookZhPath, 'toc.md')
      if (!fs.existsSync(tocPath)) {
        console.log(`跳过 ${bookDir}: 没有 toc.md`)
        continue
      }

      try {
        const bookYaml = parseTocToBookYaml(tocPath)
        const outputPath = path.join(bookZhPath, 'book.yaml')
        fs.writeFileSync(outputPath, yaml.dump(bookYaml, {
          lineWidth: -1,
          noRefs: true,
          quotingType: '"'
        }), 'utf-8')
        console.log(`生成: ${outputPath}`)
      } catch (err) {
        console.error(`处理 ${bookDir} 失败:`, err.message)
      }
    }
  }
}

function parseTocToBookYaml(tocPath) {
  const content = fs.readFileSync(tocPath, 'utf-8')
  const lines = content.split('\n')

  let title = ''
  let description = ''
  const toc = []
  let currentSection = null

  for (const line of lines) {
    const trimmed = line.trim()

    // 提取标题 (# 开头)
    if (trimmed.startsWith('# ') && !title) {
      title = trimmed.slice(2).trim()
      continue
    }

    // 提取简介 (标题后的第一段非空非链接文本)
    if (title && !description && trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('#') && !trimmed.startsWith('[')) {
      description = trimmed
      continue
    }

    // 提取章节标题 (### 开头)
    if (trimmed.startsWith('### ')) {
      // 保存之前的章节
      if (currentSection && currentSection.items.length > 0) {
        toc.push(currentSection)
      }
      currentSection = {
        text: trimmed.slice(4).trim(),
        items: []
      }
      continue
    }

    // 提取链接项
    // 格式1: - [序言](preface.md)
    // 格式2: 1. [Vue 3 的设计目标与核心理念](overview/design-philosophy.md)
    const linkMatch = trimmed.match(/^(?:[-*]|\d+\.)\s*\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      const text = linkMatch[1].trim()
      let link = linkMatch[2].trim()

      // 移除 .md 扩展名
      link = link.replace(/\.md$/, '')

      // 提取数字索引
      const indexMatch = trimmed.match(/^(\d+)\./)
      const index = indexMatch ? indexMatch[1] : null

      const item = {
        text: index ? `${index}. ${text}` : text,
        link: link
      }

      if (currentSection) {
        currentSection.items.push(item)
      } else {
        // 顶层链接（如序言）
        toc.push(item)
      }
    }
  }

  // 保存最后一个章节
  if (currentSection && currentSection.items.length > 0) {
    toc.push(currentSection)
  }

  return {
    title,
    description,
    toc
  }
}

// 运行
processAllBooks()
console.log('\n完成!')
