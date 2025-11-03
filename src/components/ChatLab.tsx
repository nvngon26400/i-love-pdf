import { useRef, useState, useEffect } from 'react'
import { t, type Lang } from '../utils/i18n'

// API key is read from Vite env (set in .env.local)
// Never hardcode secrets in source files.
const OPENAI_KEY = (import.meta.env.VITE_OPENAI_KEY ?? '') as string

type ChatImage = { name: string; dataUrl: string }
type ChatTextFile = { name: string; content: string }
type ChatMsg = { role: 'user' | 'assistant'; content: string }

export default function ChatLab({ lang }: { lang: Lang }) {
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<ChatImage[]>([])
  const [files, setFiles] = useState<ChatTextFile[]>([])
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRefCam = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!busy && inputRef.current) inputRef.current.focus()
  }, [busy])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const onPickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list) return
    const arr: ChatImage[] = []
    for (const file of Array.from(list)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.readAsDataURL(file)
      })
      arr.push({ name: file.name, dataUrl })
    }
    setImages(arr)
  }

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list) return
    const arr: ChatTextFile[] = []
    for (const file of Array.from(list)) {
      // Only read text-like files
      const text = await new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve((r.result as string) ?? '')
        r.readAsText(file)
      })
      // Truncate very long files to avoid token overflow
      const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n...[truncated]' : text
      arr.push({ name: file.name, content: truncated })
    }
    setFiles(arr)
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      const v = videoRefCam.current
      if (!v) return
      v.srcObject = stream
      await v.play()
      setCameraOn(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không mở được camera'
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
    }
  }

  function stopCamera() {
    const v = videoRefCam.current
    const stream = (v?.srcObject as MediaStream | null)
    stream?.getTracks().forEach(t => t.stop())
    if (v) v.srcObject = null
    setCameraOn(false)
  }

  function capturePhoto() {
    const v = videoRefCam.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 640
    canvas.height = v.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/png')
    setImages(prev => [...prev, { name: 'camera.png', dataUrl }])
    stopCamera()
  }

  const callGpt = async () => {
    if (!prompt.trim()) return
    if (!OPENAI_KEY) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Chưa cấu hình API key. Tạo file .env.local với VITE_OPENAI_KEY và tải lại trang.' }])
      return
    }
    setBusy(true)
    try {
      const content: any[] = []
      // Combine text files into the prompt
      if (files.length) {
        const combined = files.map(f => `File: ${f.name}\n\n${f.content}`).join('\n\n---\n\n')
        content.push({ type: 'text', text: `${prompt}\n\nAttached files:\n\n${combined}` })
      } else {
        content.push({ type: 'text', text: prompt })
      }
      // Add images as image_url
      for (const img of images) {
        content.push({ type: 'image_url', image_url: { url: img.dataUrl } })
      }
      const fullMessages: any[] = [
        ...messages.map(m => ({ role: m.role, content: [{ type: 'text', text: m.content }] })),
        { role: 'user', content }
      ]

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: fullMessages,
          temperature: 0.2,
        }),
      })
      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(errText || 'GPT API error')
      }
      const data = await resp.json()
      const text = data?.choices?.[0]?.message?.content ?? ''
      setMessages(prev => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: text }])
      setPrompt('')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'API lỗi'
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h3>{t(lang,'chat_title')}</h3>
      <div className="two-col" style={{marginTop:12}}>
        <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:12}}>
          {messages.length === 0 ? (
            <>
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e)=>setPrompt(e.target.value)}
                placeholder={t(lang,'chat_prompt_placeholder')}
                style={{width:'100%', minHeight:120, borderRadius:8, border:'1px solid var(--card-border)', background:'var(--input-bg)', color:'inherit', padding:10}}
              />
              <div style={{display:'grid', gap:8, marginTop:10}}>
                <label>{t(lang,'chat_upload_images')}</label>
                <input type="file" accept="image/*" multiple capture="environment" onChange={onPickImages} />
                <label>{t(lang,'chat_upload_files')}</label>
                <input type="file" accept="text/*,application/json" multiple onChange={onPickFiles} />
                {!cameraOn ? (
                  <button onClick={startCamera}>{t(lang,'chat_open_camera')}</button>
                ) : (
                  <div style={{display:'grid', gap:8}}>
                    <video ref={videoRefCam} style={{width:'100%', borderRadius:8}} />
                    <div style={{display:'flex', gap:8}}>
                      <button className="primary" onClick={capturePhoto}>{t(lang,'chat_take_photo')}</button>
                      <button onClick={stopCamera}>{t(lang,'chat_close_camera')}</button>
                    </div>
                  </div>
                )}
                <button className="primary" disabled={busy} onClick={callGpt}>{busy ? '...' : t(lang,'chat_send')}</button>
              </div>
            </>
          ) : (
            <div style={{opacity:0.7, fontSize:13}}>
              {t(lang,'chat_result')} đang hiển thị phía bên phải. Tiếp tục chat ở ô dưới.
            </div>
          )}
        </div>

        <div className="controls" style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:12, display:'grid', gap:10}}>
          {messages.length > 0 && (
            <>
              <strong>{t(lang,'chat_result')}</strong>
              <div style={{display:'grid', gap:8, maxHeight:380, overflow:'auto'}}>
                {messages.map((m, idx) => (
                  <div key={idx} style={{
                    background: m.role==='user' ? 'color-mix(in oklab, var(--accent) 12%, transparent)' : 'color-mix(in oklab, var(--primary-from) 12%, transparent)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 10,
                    padding: 10
                  }}>
                    <div style={{opacity:0.7, fontSize:12}}>{m.role==='user' ? 'Bạn' : 'GPT'}</div>
                    <div style={{whiteSpace:'pre-wrap'}}>{m.content}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {messages.length > 0 && (
            <div>
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e)=>setPrompt(e.target.value)}
                placeholder={t(lang,'chat_prompt_placeholder')}
                style={{width:'100%', minHeight:80, borderRadius:8, border:'1px solid var(--card-border)', background:'var(--input-bg)', color:'inherit', padding:10}}
              />
              <div style={{display:'grid', gap:8, marginTop:8}}>
                <label>{t(lang,'chat_upload_images')}</label>
                <input type="file" accept="image/*" multiple capture="environment" onChange={onPickImages} />
                <label>{t(lang,'chat_upload_files')}</label>
                <input type="file" accept="text/*,application/json" multiple onChange={onPickFiles} />
                {!cameraOn ? (
                  <button onClick={startCamera}>{t(lang,'chat_open_camera')}</button>
                ) : (
                  <div style={{display:'grid', gap:8}}>
                    <video ref={videoRefCam} style={{width:'100%', borderRadius:8}} />
                    <div style={{display:'flex', gap:8}}>
                      <button className="primary" onClick={capturePhoto}>{t(lang,'chat_take_photo')}</button>
                      <button onClick={stopCamera}>{t(lang,'chat_close_camera')}</button>
                    </div>
                  </div>
                )}
                <button className="primary" disabled={busy} onClick={callGpt}>{busy ? '...' : t(lang,'chat_send')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}