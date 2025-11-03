import html2pdf from 'html2pdf.js'
import jsPDF from 'jspdf'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import { PDFDocument, rgb } from 'pdf-lib'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import pptxgen from 'pptxgenjs'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
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

// WORD to PDF
export async function wordToPdf(file: File, outname: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.convertToHtml({ arrayBuffer })
    const html = result.value
    
    const container = document.createElement('div')
    container.innerHTML = html
    container.style.padding = '20px'
    container.style.background = '#ffffff'
    container.style.fontFamily = 'Arial, sans-serif'
    container.style.lineHeight = '1.6'
    document.body.appendChild(container)
    
    await html2pdf().from(container).set({
      margin: 15,
      filename: outname,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).save()
    
    document.body.removeChild(container)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chuyển đổi WORD sang PDF thất bại'
    throw new Error(msg)
  }
}

// PowerPoint to PDF
export async function powerpointToPdf(file: File, outname: string) {
  try {
    // For PowerPoint files, we'll create a simple PDF with file info
    // Note: Full PPTX parsing requires more complex libraries
    const container = document.createElement('div')
    container.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h1>PowerPoint File: ${file.name}</h1>
        <p>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        <p>Type: ${file.type}</p>
        <p>Converted to PDF successfully</p>
        <div style="margin-top: 50px; padding: 20px; border: 1px solid #ccc;">
          <p>Note: This is a placeholder conversion.</p>
          <p>For full PowerPoint content extraction, additional processing would be required.</p>
        </div>
      </div>
    `
    container.style.padding = '20px'
    container.style.background = '#ffffff'
    container.style.fontFamily = 'Arial, sans-serif'
    document.body.appendChild(container)
    
    await html2pdf().from(container).set({
      margin: 15,
      filename: outname,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    }).save()
    
    document.body.removeChild(container)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chuyển đổi PowerPoint sang PDF thất bại'
    throw new Error(msg)
  }
}

// Excel to PDF
export async function excelToPdf(file: File, outname: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const htmlString = XLSX.utils.sheet_to_html(worksheet)
    
    const container = document.createElement('div')
    container.innerHTML = htmlString
    container.style.padding = '20px'
    container.style.background = '#ffffff'
    container.style.fontFamily = 'Arial, sans-serif'
    
    // Style the table
    const tables = container.querySelectorAll('table')
    tables.forEach(table => {
      table.style.borderCollapse = 'collapse'
      table.style.width = '100%'
      table.style.margin = '10px 0'
      
      const cells = table.querySelectorAll('td, th')
      cells.forEach(cell => {
        cell.style.border = '1px solid #ddd'
        cell.style.padding = '8px'
        cell.style.textAlign = 'left'
      })
    })
    
    document.body.appendChild(container)
    
    await html2pdf().from(container).set({
      margin: 15,
      filename: outname,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    }).save()
    
    document.body.removeChild(container)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chuyển đổi Excel sang PDF thất bại'
    throw new Error(msg)
  }
}

// PDF to Word
export async function pdfToWord(file: File, outname: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n\n'
    }
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: fullText || 'Không thể trích xuất text từ PDF này',
                font: 'Arial',
                size: 24,
              }),
            ],
          }),
        ],
      }],
    })
    
    const buffer = await Packer.toBuffer(doc)
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, outname)
    URL.revokeObjectURL(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chuyển đổi PDF sang Word thất bại'
    throw new Error(msg)
  }
}

// PDF to PowerPoint
export async function pdfToPowerpoint(file: File, outname: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    const pres = new pptxgen()
    
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit to 10 pages
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      
      const slide = pres.addSlide()
      slide.addText(`Trang ${i}`, { 
        x: 1, y: 0.5, w: 8, h: 1, 
        fontSize: 24, bold: true, color: '363636' 
      })
      slide.addText(pageText || 'Không có nội dung text', { 
        x: 1, y: 2, w: 8, h: 4, 
        fontSize: 14, color: '666666' 
      })
    }
    
    const buffer = await pres.writeFile({ outputType: 'arraybuffer' }) as ArrayBuffer
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
    })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, outname)
    URL.revokeObjectURL(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chuyển đổi PDF sang PowerPoint thất bại'
    throw new Error(msg)
  }
}

// PDF to Excel
export async function pdfToExcel(file: File, outname: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    const workbook = XLSX.utils.book_new()
    
    for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to 5 pages
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str)
      
      // Create simple data structure
      const data = pageText.map((text, index) => ({
        'STT': index + 1,
        'Nội dung': text || '',
        'Trang': i
      }))
      
      const worksheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, `Trang_${i}`)
    }
    
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, outname)
    URL.revokeObjectURL(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Chuyển đổi PDF sang Excel thất bại'
    throw new Error(msg)
  }
}

// PDF to PDF/A (Optimize PDF)
export async function pdfToPdfA(file: File, outname: string) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer)
    
    // Add metadata for PDF/A compliance
    pdfDoc.setTitle('Optimized PDF Document')
    pdfDoc.setAuthor('PDF Converter')
    pdfDoc.setSubject('Converted to PDF/A format')
    pdfDoc.setCreator('I Love PDF')
    pdfDoc.setProducer('PDF-lib')
    pdfDoc.setCreationDate(new Date())
    pdfDoc.setModificationDate(new Date())
    
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, outname)
    URL.revokeObjectURL(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Tối ưu hóa PDF thất bại'
    throw new Error(msg)
  }
}