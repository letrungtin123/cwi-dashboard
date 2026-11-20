import { uploadNewsImage } from '@/lib/api'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
// Wide enough for a full-width cover on a large screen; larger only slows the page.
const MAX_WIDTH = 1600
const KEEP_AS_IS_BYTES = 400 * 1024

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

// Pictures are made smaller in the browser before upload (at most 1600 px wide, WebP), so a
// post opened from an ad loads fast even when the admin picked a 10 MB photo.
export async function prepareNewsImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.')
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { blob: file, name: file.name }
  }
  const scale = Math.min(1, MAX_WIDTH / bitmap.width)
  if (scale === 1 && file.size <= KEEP_AS_IS_BYTES) {
    bitmap.close()
    return { blob: file, name: file.name }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return { blob: file, name: file.name }
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const base = file.name.replace(/\.[^.]+$/, '') || 'anh'
  const webp = await canvasBlob(canvas, 'image/webp', 0.84)
  if (webp && webp.type === 'image/webp') {
    return webp.size < file.size || scale < 1 ? { blob: webp, name: `${base}.webp` } : { blob: file, name: file.name }
  }
  // Browsers without WebP encoding: JPEG on a white background (JPEG has no transparency).
  const flat = document.createElement('canvas')
  flat.width = canvas.width
  flat.height = canvas.height
  const flatContext = flat.getContext('2d')
  if (!flatContext) return { blob: file, name: file.name }
  flatContext.fillStyle = '#fff'
  flatContext.fillRect(0, 0, flat.width, flat.height)
  flatContext.drawImage(canvas, 0, 0)
  const jpeg = await canvasBlob(flat, 'image/jpeg', 0.86)
  return jpeg && (jpeg.size < file.size || scale < 1) ? { blob: jpeg, name: `${base}.jpg` } : { blob: file, name: file.name }
}

export async function uploadPreparedNewsImage(file: File) {
  const prepared = await prepareNewsImage(file)
  return uploadNewsImage(prepared.blob, prepared.name)
}
