import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { motion } from 'framer-motion'
import ThreeBackground from './components/ThreeBackground'
import ImageLab from './components/ImageLab'
import VideoLab from './components/VideoLab'
import ChatLab from './components/ChatLab'
import AudioLab from './components/AudioLab'
import UploadDropzone from './components/UploadDropzone'
import { 
  htmlFileToPdf, 
  imagesToPdf, 
  pdfToJpg,
  wordToPdf,
  powerpointToPdf,
  excelToPdf,
  pdfToWord,
  pdfToPowerpoint,
  pdfToExcel,
  pdfToPdfA
} from './utils/converters'
import { t, type Lang } from './utils/i18n'

type ToolKey = 'html2pdf' | 'images2pdf' | 'pdf2jpg' | 'word2pdf' | 'powerpoint2pdf' | 'excel2pdf' | 'pdf2word' | 'pdf2powerpoint' | 'pdf2excel' | 'pdf2pdfa'
type AppTab = 'pdf' | 'image' | 'video' | 'audio' | 'chat'

function makeTools(lang: Lang) {
  const left: { key: ToolKey; title: string; desc: string }[] = [
    { key: 'images2pdf', title: t(lang, 'jpg_to_pdf_title'), desc: t(lang, 'jpg_to_pdf_desc') },
    { key: 'word2pdf', title: t(lang, 'word_to_pdf_title'), desc: t(lang, 'word_to_pdf_desc') },
    { key: 'powerpoint2pdf', title: t(lang, 'ppt_to_pdf_title'), desc: t(lang, 'ppt_to_pdf_desc') },
    { key: 'excel2pdf', title: t(lang, 'xls_to_pdf_title'), desc: t(lang, 'xls_to_pdf_desc') },
    { key: 'html2pdf', title: t(lang, 'html_to_pdf_title'), desc: t(lang, 'html_to_pdf_desc') },
  ]
  const right: { key: ToolKey; title: string; desc: string }[] = [
    { key: 'pdf2jpg', title: t(lang, 'pdf_to_jpg_title'), desc: t(lang, 'pdf_to_jpg_desc') },
    { key: 'pdf2word', title: t(lang, 'pdf_to_word_title'), desc: t(lang, 'pdf_to_word_desc') },
    { key: 'pdf2powerpoint', title: t(lang, 'pdf_to_ppt_title'), desc: t(lang, 'pdf_to_ppt_desc') },
    { key: 'pdf2excel', title: t(lang, 'pdf_to_xls_title'), desc: t(lang, 'pdf_to_xls_desc') },
    { key: 'pdf2pdfa', title: t(lang, 'pdf_to_pdfa_title'), desc: t(lang, 'pdf_to_pdfa_desc') },
  ]
  return { left, right }
}

function App() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>('html2pdf')
  const [files, setFiles] = useState<File[]>([])
  const [outfile, setOutfile] = useState('output')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>('vi')
  const [tab, setTab] = useState<AppTab>('pdf')

  // Load persisted settings
  useEffect(() => {
    const savedLang = localStorage.getItem('app.lang') as Lang | null
    const savedTab = localStorage.getItem('app.tab') as AppTab | null
    if (savedLang) setLang(savedLang)
    if (savedTab) setTab(savedTab)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    root.classList.remove('theme-dark','theme-light','theme-neon','theme-sunset','theme-ocean','theme-forest')
    body.classList.remove('theme-dark','theme-light','theme-neon','theme-sunset','theme-ocean','theme-forest')
    const cls = 'theme-forest'
    root.classList.add(cls)
    body.classList.add(cls)
  }, [])

  // Persist settings on change
  useEffect(() => {
    localStorage.setItem('app.lang', lang)
  }, [lang])
  useEffect(() => {
    localStorage.setItem('app.tab', tab)
  }, [tab])

  const { left: toolsLeft, right: toolsRight } = useMemo(() => makeTools(lang), [lang])

  const onConvert = async () => {
    if (!activeTool || files.length === 0) {
      setMessage(t(lang, 'select_notice'))
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      switch (activeTool) {
        case 'html2pdf':
          await htmlFileToPdf(files[0], `${outfile}.pdf`)
          break
        case 'images2pdf':
          await imagesToPdf(files, `${outfile}.pdf`)
          break
        case 'word2pdf':
          await wordToPdf(files[0], `${outfile}.pdf`)
          break
        case 'powerpoint2pdf':
          await powerpointToPdf(files[0], `${outfile}.pdf`)
          break
        case 'excel2pdf':
          await excelToPdf(files[0], `${outfile}.pdf`)
          break
        case 'pdf2jpg':
          await pdfToJpg(files[0], `${outfile}.jpg`)
          break
        case 'pdf2word':
          await pdfToWord(files[0], `${outfile}.docx`)
          break
        case 'pdf2powerpoint':
          await pdfToPowerpoint(files[0], `${outfile}.pptx`)
          break
        case 'pdf2excel':
          await pdfToExcel(files[0], `${outfile}.xlsx`)
          break
        case 'pdf2pdfa':
          await pdfToPdfA(files[0], `${outfile}_optimized.pdf`)
          break
        default:
          throw new Error('Chức năng không được hỗ trợ')
      }
      setMessage(t(lang, 'done_msg'))
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : t(lang, 'error_generic')
      setMessage(msg)
    } finally {
      setBusy(false)
    }
  }

  const getAcceptType = (tool: ToolKey | null) => {
    switch (tool) {
      case 'images2pdf':
        return 'image/*'
      case 'word2pdf':
        return '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case 'powerpoint2pdf':
        return '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
      case 'excel2pdf':
        return '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case 'html2pdf':
        return '.html,.htm,text/html'
      case 'pdf2jpg':
      case 'pdf2word':
      case 'pdf2powerpoint':
      case 'pdf2excel':
      case 'pdf2pdfa':
        return '.pdf,application/pdf'
      default:
        return '*'
    }
  }

  const getPanelTitle = (tool: ToolKey | null) => {
    switch (tool) {
      case 'html2pdf':
        return t(lang, 'html_to_pdf_title')
      case 'images2pdf':
        return t(lang, 'jpg_to_pdf_title')
      case 'word2pdf':
        return t(lang, 'word_to_pdf_title')
      case 'powerpoint2pdf':
        return t(lang, 'ppt_to_pdf_title')
      case 'excel2pdf':
        return t(lang, 'xls_to_pdf_title')
      case 'pdf2jpg':
        return t(lang, 'pdf_to_jpg_title')
      case 'pdf2word':
        return t(lang, 'pdf_to_word_title')
      case 'pdf2powerpoint':
        return t(lang, 'pdf_to_ppt_title')
      case 'pdf2excel':
        return t(lang, 'pdf_to_xls_title')
      case 'pdf2pdfa':
        return t(lang, 'pdf_to_pdfa_title')
      default:
        return t(lang, 'panel_choose')
    }
  }

  const accept = getAcceptType(activeTool)
  const panelTitle = getPanelTitle(activeTool)

  return (
    <div className="app-container">
      <ThreeBackground />
      <div className="content">
        <div className="topbar">
          <div className="tabs">
            <button className={tab==='pdf'?'active':''} onClick={()=>setTab('pdf')}>{t(lang,'tab_pdf')}</button>
            <button className={tab==='image'?'active':''} onClick={()=>setTab('image')}>{t(lang,'tab_image')}</button>
            <button className={tab==='video'?'active':''} onClick={()=>setTab('video')}>{t(lang,'tab_video')}</button>
            <button className={tab==='audio'?'active':''} onClick={()=>setTab('audio')}>{t(lang,'tab_audio')}</button>
            <button className={tab==='chat'?'active':''} onClick={()=>setTab('chat')}>{t(lang,'tab_chat')}</button>
          </div>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </div>
        {tab==='pdf' && (
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="title"
        >
          {t(lang, 'title')}
        </motion.h1>
        )}

        {tab==='pdf' ? (
        <div className="grid">
          <section className="column">
            <h2>{t(lang, 'to_pdf')}</h2>
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
            <h2>{t(lang, 'from_pdf')}</h2>
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
        ) : tab==='image' ? (
          <ImageLab lang={lang} />
        ) : tab==='video' ? (
          <VideoLab lang={lang} />
        ) : tab==='audio' ? (
          <AudioLab lang={lang} />
        ) : (
          <ChatLab lang={lang} />
        )}

        {tab==='pdf' && (
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
              placeholder={t(lang, 'outfile_placeholder')}
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="primary"
              disabled={busy}
              onClick={onConvert}
            >
              {busy ? t(lang, 'converting') : t(lang, 'convert_btn')}
            </motion.button>
          </div>
          {message && <p className="message">{message}</p>}
        </motion.div>
        )}
      </div>
    </div>
  )
}

export default App
