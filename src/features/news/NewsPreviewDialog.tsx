import { useMemo, useRef, useState } from 'react'
import { generateHTML, type JSONContent } from '@tiptap/core'
import { X } from 'lucide-react'
import { apiUrl } from '@/lib/api'
import { useDialogKeyboard } from '@/lib/useDialogKeyboard'
import type { NewsCategory, NewsPostFields } from '@/types'
import { docText, newsExtensions } from './newsEditorSetup'

type Language = 'vi' | 'en'

// How the post will read on the website, in either language, before it is saved or published.
export function NewsPreviewDialog({ categories, coverUrl, fields, initialLanguage, onClose }: {
  categories: NewsCategory[]
  coverUrl: string | null
  fields: NewsPostFields
  initialLanguage: Language
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  useDialogKeyboard(true, dialogRef, { onEscape: onClose })
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const category = categories.find((item) => item.id === fields.categoryId)
  // The HTML comes from the editor's own schema (text is escaped), the same parts the site shows.
  const html = useMemo(() => generateHTML(fields.content[language] as JSONContent, newsExtensions()), [fields.content, language])
  const words = docText(fields.content[language]).split(' ').filter(Boolean).length
  const date = fields.publishedAt ? new Date(fields.publishedAt) : new Date()
  const dateText = language === 'en'
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
  const author = fields.author[language] || (language === 'en' ? 'CWI Editorial Team' : 'Ban biên tập CWI')
  const empty = (text: string) => <span className="news-preview-missing">{text}</span>

  return (
    <div className="report-modal-backdrop news-modal-backdrop" role="presentation">
      <section aria-labelledby="news-preview-title" aria-modal="true" className="report-modal news-preview-dialog" ref={dialogRef} role="dialog" tabIndex={-1}>
        <div className="report-modal-header">
          <div>
            <p>Xem trước</p>
            <h2 id="news-preview-title">Bài viết trên trang Tin tức</h2>
          </div>
          <div className="news-preview-head-actions">
            <div aria-label="Ngôn ngữ xem trước" className="news-lang-switch" role="tablist">
              {(['vi', 'en'] as const).map((value) => (
                <button aria-selected={language === value} className={language === value ? 'is-active' : ''} key={value} onClick={() => setLanguage(value)} role="tab" type="button">
                  {value === 'vi' ? 'Tiếng Việt' : 'English'}
                </button>
              ))}
            </div>
            <button aria-label="Đóng" className="icon-button" onClick={onClose} type="button"><X aria-hidden="true" size={18} /></button>
          </div>
        </div>
        <div className="report-modal-body news-preview-body">
          <article className="news-preview-article">
            <p className="news-preview-crumb">{language === 'en' ? 'News' : 'Tin tức'} › {category ? category.name[language] : empty('Chưa chọn chuyên mục')}</p>
            <h1>{fields.title[language] || empty(language === 'en' ? 'Chưa có tiêu đề tiếng Anh' : 'Chưa có tiêu đề')}</h1>
            <p className="news-preview-lead">{fields.excerpt[language] || empty('Chưa có sapo')}</p>
            <p className="news-preview-byline"><strong>{author}</strong> · {dateText} · {Math.max(1, Math.round(words / 220))} {language === 'en' ? 'min read' : 'phút đọc'}</p>
            {coverUrl ? <img alt={fields.coverAlt[language]} className="news-preview-cover" src={apiUrl(coverUrl)} /> : <div className="news-preview-cover is-empty">Chưa có ảnh đại diện</div>}
            {html && words + (fields.content[language].content?.length ?? 0) > 0
              ? <div className="news-prose-preview" dangerouslySetInnerHTML={{ __html: html }} />
              : <p>{empty('Chưa có nội dung')}</p>}
            {fields.tags[language].length ? <p className="news-preview-tags">{fields.tags[language].map((tag) => <span key={tag}>#{tag}</span>)}</p> : null}
          </article>
        </div>
      </section>
    </div>
  )
}
