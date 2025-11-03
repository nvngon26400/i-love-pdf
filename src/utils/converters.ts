import html2pdf from 'html2pdf.js'
import jsPDF from 'jspdf'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
// In Vite, ?url will return final asset URL; ensures worker version matches
// installed pdfjs-dist to prevent mismatch errors.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Use CDN worker to avoid bundling complications in dev
// You can change to local worker if needed
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
GlobalWorkerOptions.workerSrc = workerSrc

export async function htmlFileToPdf(file: File, outname: string) {
  const text = await file.text()
  const container = document.createElement('div')
  container.innerHTML = text
  container.style.padding = '16px'
  container.style.background = '#ffffff'
  document.body.appendChild(container)
  await html2pdf().from(container).set({
    margin: 10,
    filename: outname,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).save()
  document.body.removeChild(container)
}

export async function imagesToPdf(files: File[], outname: string) {
  if (files.length === 0) return
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 10
  const availW = pageW - margin * 2
  const availH = pageH - margin * 2

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const dataUrl = await fileToDataURL(f)
    const { width, height } = await getImgSize(dataUrl)
    const ratio = Math.min(availW / width, availH / height)
    const w = width * ratio
    const h = height * ratio
    const x = (pageW - w) / 2
    const y = (pageH - h) / 2
    pdf.addImage(dataUrl, getImageType(f.name), x, y, w, h)
    if (i < files.length - 1) pdf.addPage()
  }
  pdf.save(outname)
}

export async function pdfToJpg(file: File, outname: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    triggerDownload(dataUrl, outname)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF xử lý thất bại'
    throw new Error(msg)
  }
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getImgSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = src
  })
}

function getImageType(name: string): 'PNG' | 'JPEG' | 'WEBP' {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'PNG'
  if (lower.endsWith('.webp')) return 'WEBP'
  return 'JPEG'
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}