import QRCode from 'qrcode'

// Copies a link, falling back to execCommand on browsers without the Clipboard API.
export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.cssText = 'left:-9999px;position:fixed;top:0'
  document.body.append(textArea)
  textArea.select()
  const copied = document.execCommand('copy')
  textArea.remove()
  if (!copied) throw new Error('copy_failed')
}

// Downloads a print-size PNG QR code for the link.
export async function downloadQrCode(url: string, fileName: string) {
  const dataUrl = await QRCode.toDataURL(url, {
    color: { dark: '#003d7c', light: '#ffffffff' },
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 1024,
  })
  const anchor = document.createElement('a')
  anchor.download = fileName
  anchor.href = dataUrl
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}
