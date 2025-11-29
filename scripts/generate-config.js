/**
 * 书籍配置生成器
 * 
 * 功能：
 * 1. 扫描 sourcebooks 目录，解析每本书的 toc.md
 * 2. 结合 books.config.yaml 中的元信息
 * 3. 生成 sidebar 和 nav 配置到 .vitepress/generated/
 * 4. 同步书籍内容到 docs 目录
 * 
 * 用法：
 * - node scripts/generate-config.js        # 生成配置并同步
 * - node scripts/generate-config.js --watch # 监听模式
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const SOURCEBOOKS_DIR = path.join(ROOT_DIR, 'sourcebooks')
const DOCS_DIR = path.join(ROOT_DIR, 'docs')
const GENERATED_DIR = path.join(DOCS_DIR, '.vitepress', 'generated')
const BOOKS_CONFIG_FILE = path.join(ROOT_DIR, 'books.config.yaml')

// ============== 读取配置 ==============

function readBooksConfig() {
  if (!fs.existsSync(BOOKS_CONFIG_FILE)) {
    console.log('⚠️  books.config.yaml 不存在，使用默认配置')
    return { books: {}, categoryOrder: ['other'] }
  }
  
  try {
    const content = fs.readFileSync(BOOKS_CONFIG_FILE, 'utf-8')
    return yaml.load(content)
  } catch (e) {
    console.error('❌ 读取 books.config.yaml 失败:', e.message)
    return { books: {}, categoryOrder: ['other'] }
  }
}

// ============== 解析 toc.md ==============

function parseTocMd(tocPath) {
  if (!fs.existsSync(tocPath)) {
    return { title: null, toc: [] }
  }

  const content = fs.readFileSync(tocPath, 'utf-8')
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let bookTitle = null
  const toc = []
  let currentPart = null

  for (const line of lines) {
    // 匹配书籍标题 (# 开头的第一行)
    if (!bookTitle) {
      const titleMatch = line.match(/^#\s+(.+)$/)
      if (titleMatch) {
        bookTitle = titleMatch[1].trim()
        continue
      }
    }

    // 匹配部分标题: ### 或 ##
    const partMatch = line.match(/^#{2,3}\s+(.+)$/)
    if (partMatch && !partMatch[1].startsWith('[')) {
      if (currentPart && currentPart.chapters.length > 0) {
        toc.push(currentPart)
      }
      currentPart = {
        title: partMatch[1].trim(),
        chapters: []
      }
      continue
    }

    // 匹配章节链接
    const linkMatch = line.match(/^(\d+)\.\s+\[(.+?)\]\((.+?)\)/)
    if (linkMatch && currentPart) {
      currentPart.chapters.push({
        title: linkMatch[2],
        file: linkMatch[3].replace(/\.md$/, '')
      })
    }
  }

  if (currentPart && currentPart.chapters.length > 0) {
    toc.push(currentPart)
  }

  return { title: bookTitle, toc }
}

// ============== 扫描书籍 ==============

function scanBooks(booksConfig) {
  const zhBooks = []
  const enBooks = []

  if (!fs.existsSync(SOURCEBOOKS_DIR)) {
    console.log('⚠️  sourcebooks 目录不存在')
    return { zhBooks, enBooks }
  }

  const dirs = fs.readdirSync(SOURCEBOOKS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())

  for (const dir of dirs) {
    const bookName = dir.name
    const bookPath = path.join(SOURCEBOOKS_DIR, bookName)
    // 保持原目录名，不做转换
    const docsName = bookName
    const meta = booksConfig.books[bookName] || {}

    // 中文版
    const zhDir = path.join(bookPath, 'book_zh')
    if (fs.existsSync(zhDir)) {
      const { title, toc } = parseTocMd(path.join(zhDir, 'toc.md'))
      zhBooks.push({
        sourceName: bookName,
        docsName,
        sourceDir: zhDir,
        lang: 'zh',
        name: title || formatBookName(bookName),
        toc,
        category: meta.category || 'other',
        categoryName: meta.categoryName || '其他',
        group: meta.group || '未分类',
        order: meta.order || 999
      })
    }

    // 英文版
    const enDir = path.join(bookPath, 'book_en')
    if (fs.existsSync(enDir)) {
      const { title, toc } = parseTocMd(path.join(enDir, 'toc.md'))
      enBooks.push({
        sourceName: bookName,
        docsName,
        sourceDir: enDir,
        lang: 'en',
        name: title || formatBookName(bookName, true),
        toc,
        category: meta.category || 'other',
        categoryName: meta.categoryNameEn || 'Other',
        group: meta.groupEn || 'Uncategorized',
        order: meta.order || 999
      })
    }
  }

  return { zhBooks, enBooks }
}

function formatBookName(name) {
  return name
    .replace(/-book$/, '')
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// ============== 文件同步 ==============

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })

  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function remove(targetPath) {
  if (!fs.existsSync(targetPath)) return
  fs.rmSync(targetPath, { recursive: true, force: true })
}

/**
 * 清空 docs/zh 和 docs/en 目录（保留 index.md）
 */
function cleanDocsDir() {
  const zhDir = path.join(DOCS_DIR, 'zh')
  const enDir = path.join(DOCS_DIR, 'en')
  
  // 清空中文目录
  if (fs.existsSync(zhDir)) {
    const items = fs.readdirSync(zhDir)
    for (const item of items) {
      if (item === 'index.md') continue // 保留首页
      remove(path.join(zhDir, item))
    }
  }
  
  // 清空英文目录
  if (fs.existsSync(enDir)) {
    const items = fs.readdirSync(enDir)
    for (const item of items) {
      if (item === 'index.md') continue // 保留首页
      remove(path.join(enDir, item))
    }
  }
}

function syncAllBooks(zhBooks, enBooks) {
  console.log('📚 同步书籍内容...')
  
  // 先清空目录
  cleanDocsDir()

  for (const book of zhBooks) {
    const dest = path.join(DOCS_DIR, 'zh', book.docsName)
    console.log(`  📖 ${book.docsName} (zh)`)
    remove(dest)
    copyDir(book.sourceDir, dest)
    ensureIndexMd(dest, book.name)
  }

  for (const book of enBooks) {
    const dest = path.join(DOCS_DIR, 'en', book.docsName)
    console.log(`  📖 ${book.docsName} (en)`)
    remove(dest)
    copyDir(book.sourceDir, dest)
    ensureIndexMd(dest, book.name)
  }
}

function ensureIndexMd(bookDir, title) {
  const indexPath = path.join(bookDir, 'index.md')
  if (fs.existsSync(indexPath)) return

  const content = `# ${title}\n\n[开始阅读 →](./preface.md)\n`
  fs.writeFileSync(indexPath, content, 'utf-8')
}

// ============== 生成 Sidebar ==============

function generateSidebar(book) {
  const tocLabel = book.lang === 'zh' ? '📚 目录' : '📚 Contents'
  const prefaceLabel = book.lang === 'zh' ? '序言' : 'Preface'

  const sidebar = [
    {
      text: book.name,
      items: [
        { text: tocLabel, link: `/${book.lang}/${book.docsName}/` },
        { text: prefaceLabel, link: `/${book.lang}/${book.docsName}/preface` }
      ]
    }
  ]

  if (book.toc && book.toc.length > 0) {
    let chapterIndex = 0
    book.toc.forEach((part, partIndex) => {
      const partItem = {
        text: part.title,
        collapsed: partIndex >= 2,
        items: []
      }

      part.chapters.forEach(chapter => {
        chapterIndex++
        partItem.items.push({
          text: `${chapterIndex}. ${chapter.title}`,
          link: `/${book.lang}/${book.docsName}/${chapter.file}`
        })
      })

      if (partItem.items.length > 0) {
        sidebar.push(partItem)
      }
    })
  }

  return sidebar
}

function generateSidebarConfig(zhBooks, enBooks) {
  const zhSidebar = {}
  const enSidebar = {}

  for (const book of zhBooks) {
    zhSidebar[`/zh/${book.docsName}/`] = generateSidebar(book)
  }

  for (const book of enBooks) {
    enSidebar[`/en/${book.docsName}/`] = generateSidebar(book)
  }

  return { zhSidebar, enSidebar }
}

// ============== 生成 Nav ==============

function generateNavConfig(zhBooks, enBooks, categoryOrder) {
  // 中文导航
  const zhCategories = {}
  for (const book of zhBooks) {
    const cat = book.category
    if (!zhCategories[cat]) {
      zhCategories[cat] = { name: book.categoryName, groups: {} }
    }
    const group = book.group
    if (!zhCategories[cat].groups[group]) {
      zhCategories[cat].groups[group] = []
    }
    zhCategories[cat].groups[group].push({
      text: book.name,
      link: `/zh/${book.docsName}/`,
      order: book.order
    })
  }

  const zhNav = [{ text: '首页', link: '/zh/' }]
  for (const cat of categoryOrder) {
    if (!zhCategories[cat]) continue
    const catData = zhCategories[cat]
    const items = []
    const groupNames = Object.keys(catData.groups)

    for (const groupName of groupNames) {
      const books = catData.groups[groupName].sort((a, b) => a.order - b.order)
      if (groupNames.length === 1) {
        items.push(...books.map(b => ({ text: b.text, link: b.link })))
      } else {
        items.push({ text: groupName, items: books.map(b => ({ text: b.text, link: b.link })) })
      }
    }

    if (items.length > 0) {
      zhNav.push({ text: catData.name, items })
    }
  }

  // 英文导航
  const enCategories = {}
  for (const book of enBooks) {
    const cat = book.category
    if (!enCategories[cat]) {
      enCategories[cat] = { name: book.categoryName, groups: {} }
    }
    const group = book.group
    if (!enCategories[cat].groups[group]) {
      enCategories[cat].groups[group] = []
    }
    enCategories[cat].groups[group].push({
      text: book.name,
      link: `/en/${book.docsName}/`,
      order: book.order
    })
  }

  const enNav = [{ text: 'Home', link: '/en/' }]
  for (const cat of categoryOrder) {
    if (!enCategories[cat]) continue
    const catData = enCategories[cat]
    const items = []
    const groupNames = Object.keys(catData.groups)

    for (const groupName of groupNames) {
      const books = catData.groups[groupName].sort((a, b) => a.order - b.order)
      if (groupNames.length === 1) {
        items.push(...books.map(b => ({ text: b.text, link: b.link })))
      } else {
        items.push({ text: groupName, items: books.map(b => ({ text: b.text, link: b.link })) })
      }
    }

    if (items.length > 0) {
      enNav.push({ text: catData.name, items })
    }
  }

  return { zhNav, enNav }
}

// ============== 写入生成的配置 ==============

function writeGeneratedConfig(zhSidebar, enSidebar, zhNav, enNav) {
  fs.mkdirSync(GENERATED_DIR, { recursive: true })

  // sidebar.js
  const sidebarContent = `// 自动生成，请勿手动编辑
// 生成时间: ${new Date().toISOString()}

export const zhSidebar = ${JSON.stringify(zhSidebar, null, 2)}

export const enSidebar = ${JSON.stringify(enSidebar, null, 2)}
`
  fs.writeFileSync(path.join(GENERATED_DIR, 'sidebar.js'), sidebarContent, 'utf-8')

  // nav.js
  const navContent = `// 自动生成，请勿手动编辑
// 生成时间: ${new Date().toISOString()}

export const zhNav = ${JSON.stringify(zhNav, null, 2)}

export const enNav = ${JSON.stringify(enNav, null, 2)}
`
  fs.writeFileSync(path.join(GENERATED_DIR, 'nav.js'), navContent, 'utf-8')

  console.log('✅ 配置已生成到 docs/.vitepress/generated/')
}

// ============== 监听模式 ==============

async function startWatcher(booksConfig) {
  const chokidar = await import('chokidar')
  
  console.log('👀 监听 sourcebooks 目录变化...')

  let debounceTimer = null
  const DEBOUNCE_DELAY = 300

  const regenerate = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      console.log('\n🔄 检测到变化，重新生成...')
      generate(booksConfig)
    }, DEBOUNCE_DELAY)
  }

  chokidar.watch([SOURCEBOOKS_DIR, BOOKS_CONFIG_FILE], {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true
  })
    .on('add', regenerate)
    .on('change', regenerate)
    .on('unlink', regenerate)
    .on('error', err => console.error('监听错误:', err))
}

// ============== 主函数 ==============

function generate(booksConfig) {
  const { zhBooks, enBooks } = scanBooks(booksConfig)

  console.log(`📖 发现 ${zhBooks.length} 本中文书籍, ${enBooks.length} 本英文书籍`)

  syncAllBooks(zhBooks, enBooks)

  const { zhSidebar, enSidebar } = generateSidebarConfig(zhBooks, enBooks)
  const { zhNav, enNav } = generateNavConfig(zhBooks, enBooks, booksConfig.categoryOrder || [])

  writeGeneratedConfig(zhSidebar, enSidebar, zhNav, enNav)
}

async function main() {
  const args = process.argv.slice(2)
  const booksConfig = readBooksConfig()

  generate(booksConfig)

  if (args.includes('--watch')) {
    await startWatcher(booksConfig)
  }
}

main()
