import { defineConfig } from 'vitepress'
import { parseAllTocs } from './utils/parseToc.js'

// 定义所有书籍模块
const books = [
  { name: 'reactive', path: '/reactive/', title: 'Vue3 响应式系统', group: '源码解析' },
  { name: 'component', path: '/component/', title: 'Vue3 组件系统', group: '源码解析' },
  { name: 'renderer', path: '/renderer/', title: 'Vue 渲染器系统', group: '源码解析' },
  { name: 'compiler', path: '/compiler/', title: 'Vue 编译器系统', group: '源码解析' },
  { name: 'router', path: '/router/', title: 'Vue Router 路由', group: '源码解析' },
  { name: 'pinia', path: '/pinia/', title: 'Pinia 状态管理', group: '源码解析' },
  { name: 'ssr', path: '/ssr/', title: 'Vue SSR 服务端渲染', group: '源码解析' },
  { name: 'reactive-mini', path: '/reactive-mini/', title: 'Mini 响应式系统', group: 'Mini 实现' },
  { name: 'component-mini', path: '/component-mini/', title: 'Mini 组件系统', group: 'Mini 实现' },
  { name: 'renderer-mini', path: '/renderer-mini/', title: 'Mini 渲染器', group: 'Mini 实现' },
  { name: 'compiler-mini', path: '/compiler-mini/', title: 'Mini 编译器', group: 'Mini 实现' },
]

// 自动生成 sidebar
const sidebarConfig = parseAllTocs(books)

// 按分组生成导航菜单
const sourceBooks = books.filter(b => b.group === '源码解析')
const miniBooks = books.filter(b => b.group === 'Mini 实现')

export default defineConfig({
  title: 'Vue3 生态系统学习系列',
  description: '从零到精通：系统掌握 Vue3 核心原理与生态系统',
  base: '/CoderBooks/cs130-vue/',
  outDir: '../../../dist/cs130-vue',
  cleanUrls: true,

  // 忽略死链接检查（toc.md 文件中包含尚未创建的章节链接）
  ignoreDeadLinks: true,

  // 排除有 Vue 模板语法问题的目录（代码示例中的 {{ }} 会被误解析）
  srcExclude: [
    '**/.book_task/**',
    '**/.book_guide/**',
  ],
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { 
        text: '源码解析书籍',
        items: sourceBooks.map(book => ({
          text: book.title,
          link: book.path
        }))
      },
      {
        text: 'Mini 实现书籍',
        items: miniBooks.map(book => ({
          text: book.title,
          link: book.path
        }))
      },
      { text: '学习路径', link: '/learning-paths' }
    ],

    // 自动从 toc.md 生成的 sidebar
    sidebar: sidebarConfig,

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026 Vue3 生态系统学习系列'
    },

    search: {
      provider: 'local'
    }
  }
})
