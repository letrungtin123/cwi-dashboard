import { mergeAttributes, type JSONContent } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import Youtube from '@tiptap/extension-youtube'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { apiUrl } from '@/lib/api'
import type { NewsDoc } from '@/types'

// The parts a post may use; the server accepts exactly these (see newsContent.ts in the
// backend). No code blocks, only h2 / h3 headings.

const IMAGE_PATH = /\/api\/v1\/public\/news\/images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

// Pictures are stored with their path on our server (/api/v1/public/news/images/<id>); the
// editor shows them from the API's address.
const NewsImage = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const src = typeof HTMLAttributes.src === 'string' && HTMLAttributes.src.startsWith('/') ? apiUrl(HTMLAttributes.src) : HTMLAttributes.src
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { src })]
  },
}).configure({ allowBase64: false, inline: false })

export function newsExtensions(placeholder?: string) {
  return [
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    StarterKit.configure({
      code: false,
      codeBlock: false,
      heading: { levels: [2, 3] },
      link: { autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' }, openOnClick: false },
    }),
    NewsImage,
    Youtube.configure({ controls: true, height: 360, nocookie: true, width: 640 }),
  ]
}

export const EMPTY_DOC: NewsDoc = { content: [], type: 'doc' }

// Before saving: pictures go back to their path on our server, and pictures pasted from other
// websites are dropped (the server only takes pictures uploaded to the news store).
export function cleanNewsDoc(doc: NewsDoc): { doc: NewsDoc; droppedImages: number } {
  let droppedImages = 0
  const visit = (node: JSONContent): JSONContent | null => {
    if (node.type === 'image') {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
      const match = IMAGE_PATH.exec(src)
      if (!match) {
        droppedImages += 1
        return null
      }
      return { ...node, attrs: { ...node.attrs, src: `/api/v1/public/news/images/${match[1]}` } }
    }
    if (!node.content) return node
    return { ...node, content: node.content.map(visit).filter((child): child is JSONContent => child !== null) }
  }
  const cleaned = visit(doc as JSONContent) as NewsDoc
  return { doc: cleaned, droppedImages }
}

export function docText(doc: NewsDoc): string {
  const parts: string[] = []
  const visit = (node: JSONContent) => {
    if (node.type === 'text' && node.text) parts.push(node.text)
    node.content?.forEach(visit)
    if (node.type === 'paragraph' || node.type === 'heading') parts.push(' ')
  }
  visit(doc as JSONContent)
  return parts.join('').replace(/\s+/g, ' ').trim()
}

export function docHasContent(doc: NewsDoc) {
  if (docText(doc)) return true
  let media = false
  const visit = (node: JSONContent) => {
    if (node.type === 'image' || node.type === 'youtube') media = true
    node.content?.forEach(visit)
  }
  visit(doc as JSONContent)
  return media
}
