import { defineConfig } from 'vitepress'
import { parseAllTocs } from './utils/parseToc.js'

// 定义所有书籍模块（L4 系列：1 总 + 2N 分架构）
const books = [
  // L4-0: 系列总览（必读基础）
  { name: '00-design-overview', path: '/00-design-overview/', title: 'Vue3 核心设计总览 (L4-0)', group: '系列总览', order: 0 },
  
  // L4-1~8: 四大核心模块（源码解析 + Mini 实现）
  { name: '01-reactive', path: '/01-reactive/', title: 'Vue3 响应式系统源码深度解析 (L4-1)', group: '核心模块', order: 1 },
  { name: '02-reactive-mini', path: '/02-reactive-mini/', title: '从零实现 Mini Vue Reactivity (L4-2)', group: '核心模块', order: 2 },
  { name: '03-component', path: '/03-component/', title: 'Vue3 组件系统源码深度解析 (L4-3)', group: '核心模块', order: 3 },
  { name: '04-component-mini', path: '/04-component-mini/', title: '从零实现 Mini Vue Component (L4-4)', group: '核心模块', order: 4 },
  { name: '05-renderer', path: '/05-renderer/', title: 'Vue Renderer 源码深度解析 (L4-5)', group: '核心模块', order: 5 },
  { name: '06-renderer-mini', path: '/06-renderer-mini/', title: '从零实现 Mini Vue Renderer (L4-6)', group: '核心模块', order: 6 },
  { name: '07-compiler', path: '/07-compiler/', title: 'Vue Compiler 源码深度解析 (L4-7)', group: '核心模块', order: 7 },
  { name: '08-compiler-mini', path: '/08-compiler-mini/', title: '从零实现 Mini Vue Compiler (L4-8)', group: '核心模块', order: 8 },
  
  // L4-9~14: 生态系统模块（源码解析 + Mini 实现）
  { name: '09-router-source', path: '/09-router-source/', title: 'Vue Router 源码深度解析 (L4-9)', group: '生态模块', order: 9 },
  { name: '10-router-mini', path: '/10-router-mini/', title: '从零实现 Mini Vue Router (L4-10)', group: '生态模块', order: 10 },
  { name: '11-pinia-source', path: '/11-pinia-source/', title: 'Pinia 源码深度解析 (L4-11)', group: '生态模块', order: 11 },
  { name: '12-pinia-mini', path: '/12-pinia-mini/', title: '从零实现 Mini Pinia (L4-12)', group: '生态模块', order: 12 },
  { name: '13-ssr-source', path: '/13-ssr-source/', title: 'Vue SSR 源码深度解析 (L4-13)', group: '生态模块', order: 13 },
  { name: '14-ssr-mini', path: '/14-ssr-mini/', title: '从零实现 Mini Vue SSR (L4-14)', group: '生态模块', order: 14 },
]

// 自动生成 sidebar
const sidebarConfig = parseAllTocs(books)

// 按分组生成导航菜单
const overviewBooks = books.filter(b => b.group === '系列总览')
const coreBooks = books.filter(b => b.group === '核心模块')
const ecoBooks = books.filter(b => b.group === '生态模块')

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
    // 排除 compiler 模块（包含大量模板语法示例）
    '**/07-compiler/**',
    '**/08-compiler-mini/**',
  ],
  
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { 
        text: 'L4-0 系列总览',
        items: overviewBooks.map(book => ({
          text: book.title,
          link: book.path
        }))
      },
      { 
        text: 'L4-1~8 核心模块',
        items: coreBooks.map(book => ({
          text: book.title,
          link: book.path
        }))
      },
      {
        text: 'L4-9~14 生态模块',
        items: ecoBooks.map(book => ({
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
