import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * 解析 toc.md 文件生成 sidebar 配置
 * @param {string} tocPath - toc.md 文件的路径
 * @param {string} baseLink - 基础链接前缀，如 '/reactive/'
 * @returns {Array} sidebar 配置数组
 */
export function parseTocToSidebar(tocPath, baseLink) {
  try {
    const content = fs.readFileSync(tocPath, 'utf-8')
    const lines = content.split('\n')
    const sidebar = []
    let currentSection = null
    let currentSubSection = null

    for (const line of lines) {
      // 跳过空行、标题行、序言、分隔线
      if (!line.trim() || 
          line.startsWith('#') || 
          line.includes('序言') || 
          line.trim() === '---') {
        continue
      }

      // 匹配章节标题 ### 第一部分：设计思想
      const sectionMatch = line.match(/^###\s+(.+)/)
      if (sectionMatch) {
        if (currentSection) {
          sidebar.push(currentSection)
        }
        currentSection = {
          text: sectionMatch[1],
          collapsed: true,
          items: []
        }
        currentSubSection = null
        continue
      }

      // 匹配子章节 #### 2.1 响应式核心
      const subSectionMatch = line.match(/^####\s+(.+)/)
      if (subSectionMatch) {
        if (currentSubSection) {
          currentSection.items.push(currentSubSection)
        }
        currentSubSection = {
          text: subSectionMatch[1],
          collapsed: true,
          items: []
        }
        continue
      }

      // 匹配列表项 1. [标题](链接)
      const itemMatch = line.match(/^\d+\.\s+\[(.+?)\]\((.+?)\)/)
      if (itemMatch) {
        const [, text, link] = itemMatch
        const item = {
          text: text,
          link: baseLink + (link.startsWith('/') ? link.slice(1) : link.replace(/\.md$/, ''))
        }

        if (currentSubSection) {
          currentSubSection.items.push(item)
        } else if (currentSection) {
          currentSection.items.push(item)
        }
      }
    }

    // 添加最后一个章节
    if (currentSubSection) {
      currentSection.items.push(currentSubSection)
    }
    if (currentSection) {
      sidebar.push(currentSection)
    }

    return sidebar
  } catch (error) {
    console.warn(`Warning: Failed to parse ${tocPath}:`, error.message)
    return []
  }
}

/**
 * 批量解析多个模块的 toc.md
 * @param {Array} modules - 模块配置数组 [{name: 'reactive', path: '/reactive/'}]
 * @returns {Object} sidebar 配置对象
 */
export function parseAllTocs(modules) {
  const docsDir = path.resolve(__dirname, '../../')
  const sidebarConfig = {}

  for (const module of modules) {
    const tocPath = path.join(docsDir, module.name, 'book_zh', 'toc.md')
    if (fs.existsSync(tocPath)) {
      const sidebar = parseTocToSidebar(tocPath, module.path)
      
      // 添加首页链接
      sidebarConfig[module.path] = [
        {
          text: module.title || module.name,
          items: [
            { text: '书籍介绍', link: module.path },
            { text: '目录', link: `${module.path}book_zh/toc` }
          ]
        },
        ...sidebar
      ]
    } else {
      console.warn(`Warning: toc.md not found for ${module.name}`)
    }
  }

  return sidebarConfig
}
