import { useEffect, useRef, useState } from 'react'
import { t, type Lang } from '../utils/i18n'

type Mode = 'edit' | 'ai_enhance' | 'ai_process'

export default function ImageLab({ lang }: { lang: Lang }) {
  const [mode, setMode] = useState<Mode>('edit')
  const [file, setFile] = useState<File | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [sharpenOn, setSharpenOn] = useState(false)
  const [denoiseOn, setDenoiseOn] = useState(false)

  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (imgRef.current) {
        imgRef.current.src = reader.result as string
        imgRef.current.onload = () => draw()
      }
    }
    reader.readAsDataURL(file)
  }, [file])

  useEffect(() => { draw() }, [brightness, contrast, saturation, flipH, flipV, rotation, sharpenOn, denoiseOn, mode])

  function draw() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.complete) return
    const ctx = canvas.getContext('2d')!

    // Base size
    const baseW = img.naturalWidth
    const baseH = img.naturalHeight
    canvas.width = baseW
    canvas.height = baseH

    // Transform
    ctx.save()
    ctx.translate(canvas.width/2, canvas.height/2)
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(img, -baseW/2, -baseH/2)
    ctx.restore()

    // Filters via CSS-like approach
    if (brightness !== 100 || contrast !== 0 || saturation !== 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const b = (brightness - 100) / 100
      const c = contrast / 100
      const s = saturation / 100
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i+1], bgr = data[i+2]
        // brightness
        r += 255*b; g += 255*b; bgr += 255*b
        // contrast
        r = ((r-128)*(1+c))+128; g = ((g-128)*(1+c))+128; bgr = ((bgr-128)*(1+c))+128
        // saturation (approx)
        const avg = (r+g+bgr)/3
        r = avg + (r-avg)*(1+s)
        g = avg + (g-avg)*(1+s)
        bgr = avg + (bgr-avg)*(1+s)
        data[i] = Math.max(0, Math.min(255, r))
        data[i+1] = Math.max(0, Math.min(255, g))
        data[i+2] = Math.max(0, Math.min(255, bgr))
      }
      ctx.putImageData(imageData, 0, 0)
    }

    // AI Enhance: sharpen & denoise
    if (mode !== 'edit') {
      if (sharpenOn) applyKernel(ctx, canvas, [0, -1, 0, -1, 5, -1, 0, -1, 0])
      if (denoiseOn) applyKernel(ctx, canvas, [1/9,1/9,1/9,1/9,1/9,1/9,1/9,1/9,1/9])
    }
  }

  function applyKernel(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, kernel: number[]) {
    const w = canvas.width, h = canvas.height
    const src = ctx.getImageData(0, 0, w, h)
    const dst = ctx.createImageData(w, h)
    const s = src.data, d = dst.data
    const k = kernel
    const get = (x:number,y:number,c:number) => {
      x = Math.max(0, Math.min(w-1, x))
      y = Math.max(0, Math.min(h-1, y))
      return s[(y*w + x)*4 + c]
    }
    for (let y=0;y<h;y++) {
      for (let x=0;x<w;x++) {
        for (let c=0;c<3;c++) {
          const val = 
            get(x-1,y-1,c)*k[0] + get(x,y-1,c)*k[1] + get(x+1,y-1,c)*k[2] +
            get(x-1,y,c)*k[3]   + get(x,y,c)*k[4]   + get(x+1,y,c)*k[5]   +
            get(x-1,y+1,c)*k[6] + get(x,y+1,c)*k[7] + get(x+1,y+1,c)*k[8]
          d[(y*w + x)*4 + c] = Math.max(0, Math.min(255, val))
        }
        d[(y*w + x)*4 + 3] = s[(y*w + x)*4 + 3]
      }
    }
    ctx.putImageData(dst, 0, 0)
  }

  function onUpscale2x() {
    const canvas = canvasRef.current
    if (!canvas) return
    const tmp = document.createElement('canvas')
    tmp.width = canvas.width * 2
    tmp.height = canvas.height * 2
    const tctx = tmp.getContext('2d')!
    tctx.imageSmoothingEnabled = true
    tctx.imageSmoothingQuality = 'high'
    tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height)
    canvas.width = tmp.width
    canvas.height = tmp.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(tmp, 0, 0)
  }

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = 'processed.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="panel">
      <h3>{t(lang,'image_lab_title')}</h3>
      <div className="tabbar">
        <button className={mode==='edit'?'active':''} onClick={()=>setMode('edit')}>{t(lang,'image_edit')}</button>
        <button className={mode==='ai_enhance'?'active':''} onClick={()=>setMode('ai_enhance')}>{t(lang,'image_ai_enhance')}</button>
        <button className={mode==='ai_process'?'active':''} onClick={()=>setMode('ai_process')}>{t(lang,'image_ai_process')}</button>
      </div>

      <div className="dropzone" style={{marginTop:10}}>
        <input type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
      </div>

      <div className="two-col" style={{marginTop:12}}>
        <div style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:8}}>
          <img ref={imgRef} alt="preview" style={{display:'none'}} />
          <canvas ref={canvasRef} style={{maxWidth:'100%'}} />
        </div>
        <div className="controls" style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:12}}>
          <label>{t(lang,'brightness')}</label>
          <input type="range" min={0} max={200} value={brightness} onChange={(e)=>setBrightness(parseInt(e.target.value))} />
          <label>{t(lang,'contrast')}</label>
          <input type="range" min={-100} max={100} value={contrast} onChange={(e)=>setContrast(parseInt(e.target.value))} />
          <label>{t(lang,'saturation')}</label>
          <input type="range" min={-100} max={100} value={saturation} onChange={(e)=>setSaturation(parseInt(e.target.value))} />
          <label>{t(lang,'rotate')} (°)</label>
          <input type="number" value={rotation} onChange={(e)=>setRotation(parseInt(e.target.value)||0)} />
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button onClick={()=>setFlipH(v=>!v)}>{t(lang,'flip_h')}</button>
            <button onClick={()=>setFlipV(v=>!v)}>{t(lang,'flip_v')}</button>
          </div>
          {mode!=='edit' && (
            <div style={{marginTop:10, display:'grid', gap:8}}>
              <label><input type="checkbox" checked={sharpenOn} onChange={(e)=>setSharpenOn(e.target.checked)} /> {t(lang,'sharpen')}</label>
              <label><input type="checkbox" checked={denoiseOn} onChange={(e)=>setDenoiseOn(e.target.checked)} /> {t(lang,'denoise')}</label>
              <button onClick={onUpscale2x}>{t(lang,'upscale2x')}</button>
            </div>
          )}
          <button className="primary" style={{marginTop:12}} onClick={download}>{t(lang,'download_image')}</button>
        </div>
      </div>
    </div>
  )
}