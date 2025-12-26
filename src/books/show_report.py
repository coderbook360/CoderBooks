#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import csv
from collections import Counter, defaultdict

# 读取CSV
with open('E:/CoderBooks/src/books/missing-files-report.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    data = list(reader)

print("=" * 80)
print("缺失文章统计报告")
print("=" * 80)
print(f"\n📊 总计缺失文件数: {len(data)}\n")

# 按书籍统计
books_counter = Counter([row['书籍路径'] for row in data])

print("=" * 80)
print("📚 各书籍缺失数量排名")
print("=" * 80)

# 按类别分组
categories = defaultdict(list)
for book, count in books_counter.items():
    category = book.split('/')[0]
    categories[category].append((book, count))

# 分类显示
for category in ['web-frontend', 'nodejs', 'graphics', 'algorithm', 'design', 'general']:
    if category in categories:
        print(f"\n【{category.upper()}】")
        print("-" * 80)
        for book, count in sorted(categories[category], key=lambda x: x[1], reverse=True):
            print(f"  {book:55} : {count:4} 个缺失")

print("\n" + "=" * 80)
print("💾 详细报告文件:")
print("  - missing-files-report.txt  (完整列表)")
print("  - missing-files-report.csv  (表格格式)")
print("=" * 80)
