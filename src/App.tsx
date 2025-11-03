import { useState } from 'react'
import './App.css'
import { motion } from 'framer-motion'
import ThreeBackground from './components/ThreeBackground'
import UploadDropzone from './components/UploadDropzone'
import { htmlFileToPdf, imagesToPdf, pdfToJpg } from './utils/converters'

type ToolKey = 'html2pdf' | 'images2pdf' | 'pdf2jpg'

const toolsLeft: { key: ToolKey; title: string; desc: string }[] = [
  { key: 'images2pdf', title: 'JPG sang PDF', desc: 'Ghép ảnh thành PDF' },
  { key: 'html2pdf', title: 'HTML sang PDF', desc: 'Chuyển HTML → PDF' },
]

const toolsRight: { key: ToolKey; title: string; desc: string }[] = [
  { key: 'pdf2jpg', title: 'PDF sang JPG', desc: 'Tách trang thành ảnh' },
]

function App() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>('html2pdf')
  const [files, setFiles] = useState<File[]>([])
  const [outfile, setOutfile] = useState('output')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const onConvert = async () => {
    if (!activeTool || files.length === 0) {
      setMessage('Vui lòng chọn file trước khi chuyển đổi.')
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      if (activeTool === 'html2pdf') {
        await htmlFileToPdf(files[0], `${outfile}.pdf`)
      } else if (activeTool === 'images2pdf') {
        await imagesToPdf(files, `${outfile}.pdf`)
      } else if (activeTool === 'pdf2jpg') {
        await pdfToJpg(files[0], `${outfile}.jpg`)
      }
      setMessage('Hoàn tất! File đã được tải xuống.')
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'Có lỗi xảy ra, vui lòng thử lại.'
      setMessage(msg)
    } finally {
      setBusy(false)
    }
  }

  const accept = activeTool === 'images2pdf'
    ? 'image/*'
    : activeTool === 'pdf2jpg'
    ? '.pdf,application/pdf'
    : '.html,.htm,text/html'

  const panelTitle =
    activeTool === 'html2pdf'
      ? 'HTML sang PDF'
      : activeTool === 'images2pdf'
      ? 'JPG sang PDF'
      : 'PDF sang JPG'

  return (
    <div className="app-container">
      <ThreeBackground />
      <div className="content">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="title"
        >
          Chuyển đổi tài liệu nhanh, đẹp, an toàn
        </motion.h1>

        <div className="grid">
          <section className="column">
            <h2>CHUYỂN SANG PDF</h2>
            <div className="cards">
              {toolsLeft.map((t) => (
                <motion.button
                  key={t.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={
                    'tool-card' + (activeTool === t.key ? ' active' : '')
                  }
                  onClick={() => setActiveTool(t.key)}
                >
                  <span className="tool-title">{t.title}</span>
                  <span className="tool-desc">{t.desc}</span>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="column">
            <h2>CHUYỂN ĐỔI TỪ PDF</h2>
            <div className="cards">
              {toolsRight.map((t) => (
                <motion.button
                  key={t.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={
                    'tool-card' + (activeTool === t.key ? ' active' : '')
                  }
                  onClick={() => setActiveTool(t.key)}
                >
                  <span className="tool-title">{t.title}</span>
                  <span className="tool-desc">{t.desc}</span>
                </motion.button>
              ))}
            </div>
          </section>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="panel"
        >
          <h3>{panelTitle}</h3>
          <UploadDropzone
            accept={accept}
            multiple={activeTool === 'images2pdf'}
            onFilesSelected={setFiles}
          />

          <div className="outfile">
            <input
              type="text"
              value={outfile}
              onChange={(e) => setOutfile(e.target.value)}
              placeholder="Tên file xuất"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="primary"
              disabled={busy}
              onClick={onConvert}
            >
              {busy ? 'Đang xử lý...' : 'Chuyển đổi và tải xuống'}
            </motion.button>
          </div>
          {message && <p className="message">{message}</p>}
        </motion.div>
      </div>
    </div>
  )
}

export default App
