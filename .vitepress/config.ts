import fs from 'fs'
import path from 'path'
import {
  defineConfigWithTheme,
  type HeadConfig,
  type Plugin
} from 'vitepress'
import type { Config as ThemeConfig } from '@vue/theme'
import llmstxt from 'vitepress-plugin-llms'
import baseConfig from '@vue/theme/config'
import { headerPlugin } from './headerMdPlugin'
import {
  groupIconMdPlugin,
  groupIconVitePlugin
} from 'vitepress-plugin-group-icons'
import yaml from 'js-yaml'

// 从 JSON 文件读取导航配置
import navConfig from './nav-config.json'

// 生成带分组的导航
function generateNav(): ThemeConfig['nav'] {
  const nav: ThemeConfig['nav'] = [
    {
      text: '首页',
      link: '/'
    }
  ]

  for (const category of navConfig.categories) {
    const items: any[] = []

    // 如果有分组，添加分组和书籍
    if (category.groups && category.groups.length > 0) {
      for (const group of category.groups) {
        // 添加分组标题（使用 items 属性来创建子菜单）
        if (group.books && group.books.length > 0) {
          items.push({
            text: group.label,
            items: group.books.map(book => ({
              text: book.title,
              // 优先使用 index.md，如果不存在则使用 toc.md
              link: `/books/${category.id}/${book.dirName}/book_zh/`
            }))
          })
        }
      }
    }

    // 只有当有 items 时才添加到导航
    if (items.length > 0) {
      nav.push({
        text: category.label,
        activeMatch: `^/books/${category.id}/`,
        items
      })
    }
  }

  // 添加生态系统菜单（避免 SiteMap 组件报错）
  nav.push({
    text: '生态系统',
    activeMatch: `^/ecosystem/`,
    items: [
      {
        text: '资源',
        items: [
          { text: 'GitHub', link: 'https://github.com/coderbook360/CoderBooks' }
        ]
      }
    ]
  })

  return nav
}

const nav = generateNav()

// 生成侧边栏配置 - 从每本书的 book.yaml 读取 toc 字段
// 兼容 @vue/theme 的 VPSidebarGroup 组件
const sidebar: ThemeConfig['sidebar'] = {}
const srcDir = path.join(__dirname, '../src')

for (const category of navConfig.categories) {
  if (category.groups) {
    for (const group of category.groups) {
      if (group.books) {
        for (const book of group.books) {
          const bookYamlPath = path.join(
            srcDir,
            'books',
            category.id,
            book.dirName,
            'book_zh',
            'book.yaml'
          )

          if (fs.existsSync(bookYamlPath)) {
            try {
              const yamlContent = fs.readFileSync(bookYamlPath, 'utf-8')
              const bookConfig = yaml.load(yamlContent) as {
                title?: string
                description?: string
                toc?: any[]
              }

              if (!bookConfig.toc || !Array.isArray(bookConfig.toc)) {
                continue
              }

              const basePath = `/books/${category.id}/${book.dirName}/book_zh/`

              // @vue/theme 要求: 所有分组必须有 items 数组
              // 单独的链接项需要包装到一个分组中
              const topLevelLinks: any[] = []
              const groups: any[] = []

              for (const item of bookConfig.toc) {
                if (!item || !item.text) continue

                if (item.items && Array.isArray(item.items) && item.items.length > 0) {
                  // 这是一个分组，有子项
                  groups.push({
                    text: item.text,
                    collapsed: item.collapsed ?? false,
                    items: item.items
                      .filter((sub: any) => sub && sub.text && sub.link)
                      .map((sub: any) => ({
                        text: sub.text,
                        link: basePath + sub.link
                      }))
                  })
                } else if (item.link) {
                  // 单独的链接项，收集起来
                  topLevelLinks.push({
                    text: item.text,
                    link: basePath + item.link
                  })
                }
              }

              // 组装最终配置
              const finalConfig: any[] = []

              // 如果有顶层链接，包装成一个"概览"分组
              if (topLevelLinks.length > 0) {
                finalConfig.push({
                  text: '概览',
                  items: topLevelLinks
                })
              }

              // 添加所有分组
              finalConfig.push(...groups)

              if (finalConfig.length > 0) {
                sidebar[basePath] = finalConfig
              }
            } catch (err) {
              // 忽略错误
            }
          }
        }
      }
    }
  }
}

export { sidebar }

function inlineScript(file: string): HeadConfig {
  return [
    'script',
    {},
    fs.readFileSync(
      path.resolve(__dirname, `./inlined-scripts/${file}`),
      'utf-8'
    )
  ]
}

export default defineConfigWithTheme<ThemeConfig>({
  extends: baseConfig,

  sitemap: {
    hostname: 'https://coderbooks.dev'
  },

  lang: 'zh-CN',
  title: 'CoderBooks',
  description: '程序员书籍精选 - 深入源码，洞察原理，构建技术体系',
  srcDir: 'src',
  srcExclude: ['tutorial/**/description.md'],

  head: [
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:url', content: 'https://coderbooks.dev/' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'CoderBooks - 程序员书籍精选' }],
    [
      'meta',
      {
        property: 'og:description',
        content: '程序员书籍精选 - 深入源码，洞察原理，构建技术体系'
      }
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://coderbooks.dev/logo.png'
      }
    ],
    ['meta', { name: 'twitter:site', content: '@coderbooks' }],
    ['meta', { name: 'twitter:card', content: 'summary' }]
  ],

  themeConfig: {
    nav,
    sidebar,

    outline: {
      label: '本页目录'
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/coderbook360/CoderBooks' }
    ],

    editLink: {
      repo: 'coderbook360/CoderBooks',
      text: '在 GitHub 上编辑此页'
    },

    footer: {
      message: '所有书籍内容仅供学习参考，请支持正版图书',
      copyright: `Copyright © 2024-${new Date().getFullYear()} CoderBooks`
    }
  },

  markdown: {
    theme: 'github-dark',
    config(md) {
      md.use(headerPlugin).use(groupIconMdPlugin)
    }
  },

  vite: {
    define: {
      __VUE_OPTIONS_API__: false
    },
    optimizeDeps: {
      include: ['gsap', 'dynamics.js'],
      exclude: ['@vue/repl']
    },
    json: {
      stringify: true
    },
    server: {
      host: true,
      fs: {
        // for when developing with locally linked theme
        allow: ['../..']
      }
    },
    build: {
      minify: 'terser',
      chunkSizeWarningLimit: Infinity
    },
    plugins: [
      llmstxt({
        ignoreFiles: [
          'index.md'
        ],
        customLLMsTxtTemplate: `\
# CoderBooks

程序员书籍精选 - 深入源码，洞察原理，构建技术体系

## Table of Contents

{toc}`
      }) as Plugin,
      groupIconVitePlugin({
        customIcon: {
          cypress: 'vscode-icons:file-type-cypress',
          'testing library': 'logos:testing-library'
        }
      }) as Plugin
    ]
  }
})
