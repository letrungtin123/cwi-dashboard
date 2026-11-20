import { useEffect, useRef, useState, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from '@tiptap/react'
import {
  Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, LoaderCircle, Minus, Pilcrow, Quote, Redo2,
  RemoveFormatting, SquarePlay, Strikethrough, TriangleAlert, Underline, Undo2, Unlink,
} from 'lucide-react'
import type { NewsDoc } from '@/types'
import { errorMessage } from '@/features/surveyQuarters/cardEditorParts'
import { cleanNewsDoc, docText, newsExtensions } from './newsEditorSetup'
import { uploadPreparedNewsImage } from './newsImage'

function ToolButton({ active = false, children, disabled = false, label, onClick }: { active?: boolean; children: ReactNode; disabled?: boolean; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`news-tool${active ? ' is-active' : ''}`}
      data-tooltip={label}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      type="button"
    >
      {children}
    </button>
  )
}

type Panel = 'link' | 'youtube' | null

function Toolbar({ editor, onError }: { editor: Editor; onError: (message: string) => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      blockquote: current.isActive('blockquote'),
      bold: current.isActive('bold'),
      bulletList: current.isActive('bulletList'),
      canRedo: current.can().redo(),
      canUndo: current.can().undo(),
      editable: current.isEditable,
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      image: current.isActive('image'),
      imageAlt: String(current.getAttributes('image').alt ?? ''),
      imageTitle: String(current.getAttributes('image').title ?? ''),
      italic: current.isActive('italic'),
      link: current.isActive('link'),
      linkHref: String(current.getAttributes('link').href ?? ''),
      orderedList: current.isActive('orderedList'),
      paragraph: current.isActive('paragraph') && !current.isActive('heading'),
      strike: current.isActive('strike'),
      underline: current.isActive('underline'),
    }),
  })
  const [panel, setPanel] = useState<Panel>(null)
  const [value, setValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const disabled = !state.editable

  function open(next: Panel) {
    setPanel((current) => (current === next ? null : next))
    setValue(next === 'link' ? state.linkHref : '')
  }

  function applyLink() {
    const href = value.trim()
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const normalized = /^(https?:\/\/|mailto:|tel:|\/)/i.test(href) ? href : `https://${href}`
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
    }
    setPanel(null)
  }

  function applyYoutube() {
    const ok = editor.chain().focus().setYoutubeVideo({ src: value.trim() }).run()
    if (!ok) {
      onError('Link YouTube không hợp lệ. Hãy dán link dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...')
      return
    }
    setPanel(null)
  }

  async function pickImage(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setUploading(true)
    try {
      const image = await uploadPreparedNewsImage(file)
      editor.chain().focus().setImage({ alt: '', src: image.url }).run()
    } catch (caught) {
      onError(errorMessage(caught, 'Không tải được ảnh lên.'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="news-toolbar-wrap">
      <div aria-label="Định dạng nội dung" className="news-toolbar" role="toolbar">
        <div className="news-tool-group">
          <ToolButton disabled={disabled || !state.canUndo} label="Hoàn tác (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()}><Undo2 aria-hidden="true" size={17} /></ToolButton>
          <ToolButton disabled={disabled || !state.canRedo} label="Làm lại (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()}><Redo2 aria-hidden="true" size={17} /></ToolButton>
        </div>
        <div className="news-tool-group">
          <ToolButton active={state.paragraph} disabled={disabled} label="Đoạn văn" onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow aria-hidden="true" size={17} /></ToolButton>
          <ToolButton active={state.h2} disabled={disabled} label="Tiêu đề lớn" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 aria-hidden="true" size={18} /></ToolButton>
          <ToolButton active={state.h3} disabled={disabled} label="Tiêu đề nhỏ" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 aria-hidden="true" size={18} /></ToolButton>
        </div>
        <div className="news-tool-group">
          <ToolButton active={state.bold} disabled={disabled} label="In đậm (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()}><Bold aria-hidden="true" size={17} /></ToolButton>
          <ToolButton active={state.italic} disabled={disabled} label="In nghiêng (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic aria-hidden="true" size={17} /></ToolButton>
          <ToolButton active={state.underline} disabled={disabled} label="Gạch chân (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()}><Underline aria-hidden="true" size={17} /></ToolButton>
          <ToolButton active={state.strike} disabled={disabled} label="Gạch ngang" onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough aria-hidden="true" size={17} /></ToolButton>
        </div>
        <div className="news-tool-group">
          <ToolButton active={state.bulletList} disabled={disabled} label="Danh sách chấm" onClick={() => editor.chain().focus().toggleBulletList().run()}><List aria-hidden="true" size={17} /></ToolButton>
          <ToolButton active={state.orderedList} disabled={disabled} label="Danh sách số" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered aria-hidden="true" size={17} /></ToolButton>
          <ToolButton active={state.blockquote} disabled={disabled} label="Trích dẫn" onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote aria-hidden="true" size={17} /></ToolButton>
          <ToolButton disabled={disabled} label="Đường kẻ ngăn cách" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus aria-hidden="true" size={17} /></ToolButton>
        </div>
        <div className="news-tool-group">
          <ToolButton active={state.link || panel === 'link'} disabled={disabled} label="Chèn liên kết" onClick={() => open('link')}><Link2 aria-hidden="true" size={17} /></ToolButton>
          {state.link ? <ToolButton disabled={disabled} label="Gỡ liên kết" onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}><Unlink aria-hidden="true" size={17} /></ToolButton> : null}
          <ToolButton disabled={disabled || uploading} label="Chèn ảnh" onClick={() => fileRef.current?.click()}>
            {uploading ? <LoaderCircle aria-hidden="true" className="spinning-icon" size={17} /> : <ImagePlus aria-hidden="true" size={17} />}
          </ToolButton>
          <ToolButton active={panel === 'youtube'} disabled={disabled} label="Chèn video YouTube" onClick={() => open('youtube')}><SquarePlay aria-hidden="true" size={17} /></ToolButton>
        </div>
        <div className="news-tool-group">
          <ToolButton disabled={disabled} label="Xóa định dạng" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting aria-hidden="true" size={17} /></ToolButton>
        </div>
        <input accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void pickImage(event.currentTarget.files?.[0])} ref={fileRef} type="file" />
      </div>

      {panel ? (
        <form className="news-toolbar-panel" onSubmit={(event) => { event.preventDefault(); if (panel === 'link') applyLink(); else applyYoutube() }}>
          <label>
            <span>{panel === 'link' ? 'Địa chỉ liên kết' : 'Link video YouTube'}</span>
            <input autoFocus onChange={(event) => setValue(event.currentTarget.value)} placeholder={panel === 'link' ? 'https://... hoặc /bao-cao-quy' : 'https://www.youtube.com/watch?v=...'} value={value} />
          </label>
          <button className="primary-button" type="submit"><span>{panel === 'link' ? 'Áp dụng' : 'Chèn video'}</span></button>
          <button className="secondary-button" onClick={() => setPanel(null)} type="button"><span>Hủy</span></button>
          {panel === 'link' ? <small>Bôi đen chữ cần gắn link trước khi bấm. Link trong trang (ví dụ /survey) mở ngay tại trang; link ra ngoài mở tab mới.</small> : null}
        </form>
      ) : null}

      {state.image ? (
        <div className="news-toolbar-panel news-image-panel">
          <label>
            <span>Mô tả ảnh (cho người khiếm thị và Google)</span>
            <input maxLength={200} onChange={(event) => editor.chain().updateAttributes('image', { alt: event.currentTarget.value }).run()} placeholder="Ví dụ: Khách mời trao đổi tại Bàn tròn CEO" value={state.imageAlt} />
          </label>
          <label>
            <span>Chú thích dưới ảnh</span>
            <input maxLength={300} onChange={(event) => editor.chain().updateAttributes('image', { title: event.currentTarget.value }).run()} placeholder="Không bắt buộc" value={state.imageTitle} />
          </label>
        </div>
      ) : null}
    </div>
  )
}

// Rich text for one language of a post. The toolbar offers only what the website shows.
export function RichTextEditor({ disabled, label, onChange, placeholder, value }: {
  disabled: boolean
  label: string
  onChange: (doc: NewsDoc) => void
  placeholder: string
  value: NewsDoc
}) {
  const [error, setError] = useState('')
  const [stats, setStats] = useState(() => ({ dropped: cleanNewsDoc(value).droppedImages, words: docText(value).split(' ').filter(Boolean).length }))
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    // A document needs at least one paragraph to type in; the server stores an empty body as none.
    content: (value.content?.length ? value : { content: [{ type: 'paragraph' }], type: 'doc' }) as JSONContent,
    editable: !disabled,
    editorProps: { attributes: { 'aria-label': label, class: 'news-editor-content news-prose-preview' } },
    extensions: newsExtensions(placeholder),
    immediatelyRender: true,
    onUpdate: ({ editor: current }) => {
      const doc = current.getJSON() as NewsDoc
      setStats({ dropped: cleanNewsDoc(doc).droppedImages, words: docText(doc).split(' ').filter(Boolean).length })
      onChangeRef.current(doc)
    },
  })

  // Without emitting an update: switching editable on or off is not an edit.
  useEffect(() => {
    if (editor && editor.isEditable === disabled) editor.setEditable(!disabled, false)
  }, [disabled, editor])

  useEffect(() => {
    if (!error) return
    const timer = window.setTimeout(() => setError(''), 6000)
    return () => window.clearTimeout(timer)
  }, [error])

  if (!editor) return null

  return (
    <div className={`news-editor${disabled ? ' is-disabled' : ''}`}>
      <Toolbar editor={editor} onError={setError} />
      <div className="news-editor-frame">
        <EditorContent editor={editor} />
      </div>
      <div className="news-editor-foot">
        <span>{stats.words.toLocaleString('vi-VN')} chữ · khoảng {Math.max(1, Math.round(stats.words / 220))} phút đọc</span>
        <span>Dán nội dung từ Word hay Google Docs vẫn giữ tiêu đề, in đậm, danh sách và link.</span>
      </div>
      {stats.dropped ? (
        <p className="news-editor-warning"><TriangleAlert aria-hidden="true" size={15} />Có {stats.dropped} ảnh dán từ trang khác sẽ bị bỏ khi lưu. Hãy xóa ảnh đó và tải ảnh lên bằng nút “Chèn ảnh”.</p>
      ) : null}
      {error ? <p className="roundtable-event-error" role="alert">{error}</p> : null}
    </div>
  )
}
