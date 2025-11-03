import { useEffect, useRef, useState } from 'react'
import { t, type Lang } from '../utils/i18n'

export default function VideoLab({ lang }: { lang: Lang }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const [file, setFile] = useState<File | null>(null)

  // Controls
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [text, setText] = useState('')
  const [fontSize, setFontSize] = useState(36)
  const [color, setColor] = useState('#ffffff')
  const [posX, setPosX] = useState(50)
  const [posY, setPosY] = useState(80)
  const [includeAudio, setIncludeAudio] = useState(true)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !file) return
    const url = URL.createObjectURL(file)
    video.src = url
    video.onloadedmetadata = () => {
      setEnd(Math.floor(video.duration))
    }
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = speed
  }, [speed])

  useEffect(() => {
    startRenderLoop()
    return stopRenderLoop
  }, [brightness, contrast, saturation, text, fontSize, color, posX, posY])

  function startRenderLoop() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.clearRect(0,0,canvas.width,canvas.height)
      ctx.filter = `brightness(${brightness/100}) contrast(${1 + contrast/100}) saturate(${1 + saturation/100})`
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      if (text) {
        ctx.filter = 'none'
        ctx.fillStyle = color
        ctx.font = `${fontSize}px sans-serif`
        ctx.textBaseline = 'top'
        ctx.fillText(text, (posX/100)*canvas.width, (posY/100)*canvas.height)
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }

  function stopRenderLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  async function exportVideo() {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    // Prepare streams
    const canvasStream = canvas.captureStream(30)
    let mixed = new MediaStream()
    const videoStream: MediaStream | null =
      typeof (video as any).captureStream === 'function'
        ? (video as any).captureStream()
        : null
    const audioTracks: MediaStreamTrack[] =
      includeAudio && videoStream ? (videoStream as MediaStream).getAudioTracks() : []
    mixed.addTrack(canvasStream.getVideoTracks()[0])
    audioTracks.forEach((track: MediaStreamTrack) => mixed.addTrack(track))

    const chunks: BlobPart[] = []
    const recorder = new MediaRecorder(mixed, { mimeType: 'video/webm;codecs=vp9,opus' })
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
    const stopPromise = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })

    // Play segment
    video.currentTime = start
    await video.play()
    recorder.start()
    const onTime = () => {
      if (video.currentTime >= end) {
        recorder.stop()
        video.pause()
        video.removeEventListener('timeupdate', onTime)
      }
    }
    video.addEventListener('timeupdate', onTime)
    await stopPromise

    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'edited.webm'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="panel">
      <h3>{t(lang,'video_lab_title')}</h3>
      <div className="dropzone" style={{marginTop:10}}>
        <input type="file" accept="video/*" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      </div>
      <div className="two-col" style={{marginTop:12}}>
        <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:8}}>
          <video ref={videoRef} controls style={{maxWidth:'100%', display:file?'block':'none'}} />
          <canvas ref={canvasRef} style={{maxWidth:'100%', marginTop:8}} />
        </div>
        <div className="controls" style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:12}}>
          <label>{t(lang,'start_time')}</label>
          <input type="number" min={0} value={start} onChange={(e)=>setStart(parseFloat(e.target.value)||0)} />
          <label>{t(lang,'end_time')}</label>
          <input type="number" min={0} value={end} onChange={(e)=>setEnd(parseFloat(e.target.value)||0)} />
          <label>{t(lang,'speed')}</label>
          <input type="range" min={0.25} max={2} step={0.05} value={speed} onChange={(e)=>setSpeed(parseFloat(e.target.value))} />
          <label>{t(lang,'brightness')}</label>
          <input type="range" min={0} max={200} value={brightness} onChange={(e)=>setBrightness(parseInt(e.target.value))} />
          <label>{t(lang,'contrast')}</label>
          <input type="range" min={-100} max={100} value={contrast} onChange={(e)=>setContrast(parseInt(e.target.value))} />
          <label>{t(lang,'saturation')}</label>
          <input type="range" min={-100} max={100} value={saturation} onChange={(e)=>setSaturation(parseInt(e.target.value))} />

          <label>{t(lang,'text_overlay')}</label>
          <input type="text" value={text} onChange={(e)=>setText(e.target.value)} />
          <label>{t(lang,'font_size')}</label>
          <input type="number" min={10} max={120} value={fontSize} onChange={(e)=>setFontSize(parseInt(e.target.value))} />
          <label>{t(lang,'color')}</label>
          <input type="color" value={color} onChange={(e)=>setColor(e.target.value)} />
          <label>{t(lang,'pos_x')}</label>
          <input type="range" min={0} max={100} value={posX} onChange={(e)=>setPosX(parseInt(e.target.value))} />
          <label>{t(lang,'pos_y')}</label>
          <input type="range" min={0} max={100} value={posY} onChange={(e)=>setPosY(parseInt(e.target.value))} />
          <label><input type="checkbox" checked={includeAudio} onChange={(e)=>setIncludeAudio(e.target.checked)} /> {t(lang,'include_audio')}</label>
          <button className="primary" onClick={exportVideo}>{t(lang,'export_video')}</button>
        </div>
      </div>
    </div>
  )
}