// Read an image File and return a small PNG data URL (resized, so it's tiny
// enough to store directly in a DB text column). Used as a fallback when the
// storage bucket upload is unavailable/blocked.
export async function fileToSmallDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, max / Math.max(img.width, img.height || 1))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read the image file'))
    }
    img.src = objectUrl
  })
}
