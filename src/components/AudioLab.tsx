import { useEffect, useRef, useState } from 'react'
import { t, type Lang } from '../utils/i18n'

export default function AudioLab({ lang }: { lang: Lang }) {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Controls
  const [gain, setGain] = useState(100) // percent
  const [speed, setSpeed] = useState(1)
  const [lowpass, setLowpass] = useState(8000)
  const [highpass, setHighpass] = useState(0)
  const [style, setStyle] = useState<'pop_female'|'pop_male'|'ballad'|'rock'|'rap'>('pop_female')
  const [reverbOn, setReverbOn] = useState(true)
  const [chorusOn, setChorusOn] = useState(false)

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        const arr = await blob.arrayBuffer()
        const ctx = new AudioContext()
        const buf = await ctx.decodeAudioData(arr.slice(0))
        setBuffer(buf)
        drawWaveform(buf)
        setRecording(false)
      }
      recorder.start()
      setRecording(true)
    } catch (err) {
      alert(t(lang, 'mic_not_allowed'))
      console.error(err)
    }
  }

  const stopRecord = () => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  const drawWaveform = (buf: AudioBuffer) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const ch = buf.getChannelData(0)
    const w = canvas.width = canvas.clientWidth
    const h = canvas.height = 120
    ctx.clearRect(0,0,w,h)
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 1
    ctx.beginPath()
    const step = Math.max(1, Math.floor(ch.length / w))
    for (let x=0; x<w; x++) {
      const i = x * step
      const v = ch[i] || 0
      const y = (v * 0.5 + 0.5) * h
      if (x===0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const playProcessed = async () => {
    if (!buffer) return
    const ctx = new AudioContext()
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = speed
    const { input, output } = buildVoiceChain(ctx, { gain, lowpass, highpass, style, reverbOn, chorusOn })
    src.connect(input)
    output.connect(ctx.destination)
    src.start()
  }

  const exportProcessedWav = async () => {
    if (!buffer) return
    // Render offline with filters applied
    const duration = buffer.duration / speed
    const sampleRate = 44100
    const offline = new OfflineAudioContext(buffer.numberOfChannels, Math.ceil(duration*sampleRate), sampleRate)
    const src = offline.createBufferSource()
    src.buffer = buffer
    src.playbackRate.value = speed
    const { input, output } = buildVoiceChain(offline, { gain, lowpass, highpass, style, reverbOn, chorusOn })
    src.connect(input)
    output.connect(offline.destination)
    src.start()
    const rendered = await offline.startRendering()
    const wav = audioBufferToWav(rendered)
    const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'audio-edited.wav'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Convert AudioBuffer → WAV ArrayBuffer
  function audioBufferToWav(abuf: AudioBuffer) {
    const numOfChan = abuf.numberOfChannels
    const length = abuf.length * numOfChan * 2 + 44
    const buffer = new ArrayBuffer(length)
    const view = new DataView(buffer)
    const channels: Float32Array[] = []
    for (let i=0; i<numOfChan; i++) channels.push(abuf.getChannelData(i))
    let offset = 0

    function writeString(s: string) {
      for (let i=0; i<s.length; i++) view.setUint8(offset++, s.charCodeAt(i))
    }
    function writeUint32(d: number) { view.setUint32(offset, d, true); offset += 4 }
    function writeUint16(d: number) { view.setUint16(offset, d, true); offset += 2 }

    writeString('RIFF')
    writeUint32(length - 8)
    writeString('WAVE')
    writeString('fmt ')
    writeUint32(16)
    writeUint16(1)
    writeUint16(numOfChan)
    writeUint32(abuf.sampleRate)
    writeUint32(abuf.sampleRate * numOfChan * 2)
    writeUint16(numOfChan * 2)
    writeUint16(16)
    writeString('data')
    writeUint32(abuf.length * numOfChan * 2)

    // Interleave
    let pos = 0
    for (let i=0; i<abuf.length; i++) {
      for (let ch=0; ch<numOfChan; ch++) {
        let sample = Math.max(-1, Math.min(1, channels[ch][i]))
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        view.setInt16(44 + pos, sample, true)
        pos += 2
      }
    }

    return buffer
  }

  return (
    <div className="panel">
      <h3>{t(lang,'audio_lab_title')}</h3>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        {!recording ? (
          <button className="primary" onClick={startRecord}>{t(lang,'start_recording')}</button>
        ) : (
          <button className="primary" onClick={stopRecord}>{t(lang,'stop_recording')}</button>
        )}
        {audioUrl && (
          <button onClick={playProcessed}>{t(lang,'play_processed')}</button>
        )}
        {audioUrl && (
          <button onClick={exportProcessedWav}>{t(lang,'download_audio')}</button>
        )}
      </div>

      <div style={{marginTop:10}}>
        <audio ref={audioRef} controls src={audioUrl ?? undefined} style={{width:'100%', display: audioUrl ? 'block' : 'none'}} />
        <canvas ref={canvasRef} style={{width:'100%', background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:8, marginTop:8}} />
      </div>

      <div className="controls" style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, padding:12, marginTop:12, display:'grid', gap:8}}>
        <label>{t(lang,'voice_style')}</label>
        <select value={style} onChange={(e)=>setStyle(e.target.value as any)}>
          <option value="pop_female">{t(lang,'style_pop_female')}</option>
          <option value="pop_male">{t(lang,'style_pop_male')}</option>
          <option value="ballad">{t(lang,'style_ballad')}</option>
          <option value="rock">{t(lang,'style_rock')}</option>
          <option value="rap">{t(lang,'style_rap')}</option>
        </select>
        <label><input type="checkbox" checked={reverbOn} onChange={(e)=>setReverbOn(e.target.checked)} /> {t(lang,'reverb')}</label>
        <label><input type="checkbox" checked={chorusOn} onChange={(e)=>setChorusOn(e.target.checked)} /> {t(lang,'chorus')}</label>
        <label>{t(lang,'gain')}</label>
        <input type="range" min={0} max={200} value={gain} onChange={(e)=>setGain(parseInt(e.target.value))} />
        <label>{t(lang,'speed')}</label>
        <input type="range" min={0.5} max={2} step={0.05} value={speed} onChange={(e)=>setSpeed(parseFloat(e.target.value))} />
        <label>{t(lang,'lowpass')}</label>
        <input type="range" min={500} max={12000} step={10} value={lowpass} onChange={(e)=>setLowpass(parseInt(e.target.value))} />
        <label>{t(lang,'highpass')}</label>
        <input type="range" min={0} max={2000} step={5} value={highpass} onChange={(e)=>setHighpass(parseInt(e.target.value))} />
      </div>
    </div>
  )
}

// Xây dựng chuỗi xử lý để mô phỏng phong cách giọng ca sĩ phổ biến
function buildVoiceChain(ctx: BaseAudioContext, opts: { gain: number; lowpass: number; highpass: number; style: 'pop_female'|'pop_male'|'ballad'|'rock'|'rap'; reverbOn: boolean; chorusOn: boolean }) {
  const input = ctx.createGain()
  const output = ctx.createGain()

  // Cơ bản: highpass + lowpass + gain
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = opts.highpass
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opts.lowpass
  const g = ctx.createGain(); g.gain.value = opts.gain/100

  // EQ theo phong cách
  const eq1 = ctx.createBiquadFilter(); eq1.type='peaking'
  const eq2 = ctx.createBiquadFilter(); eq2.type='peaking'
  const eq3 = ctx.createBiquadFilter(); eq3.type='peaking'
  const sat = ctx.createWaveShaper(); sat.curve = makeSaturationCurve(1.4)

  switch (opts.style) {
    case 'pop_female':
      eq1.frequency.value = 3200; eq1.gain.value = 4; eq1.Q.value = 1
      eq2.frequency.value = 250; eq2.gain.value = -3; eq2.Q.value = 1
      eq3.frequency.value = 9000; eq3.gain.value = 2; eq3.Q.value = 0.7
      break
    case 'pop_male':
      eq1.frequency.value = 1800; eq1.gain.value = 3; eq1.Q.value = 1
      eq2.frequency.value = 120; eq2.gain.value = -2; eq2.Q.value = 1
      eq3.frequency.value = 6000; eq3.gain.value = 2; eq3.Q.value = 0.7
      break
    case 'ballad':
      eq1.frequency.value = 1100; eq1.gain.value = 3; eq1.Q.value = 0.8
      eq2.frequency.value = 300; eq2.gain.value = -2; eq2.Q.value = 1
      eq3.frequency.value = 8000; eq3.gain.value = 1.5; eq3.Q.value = 0.7
      break
    case 'rock':
      eq1.frequency.value = 2200; eq1.gain.value = 5; eq1.Q.value = 1
      eq2.frequency.value = 90; eq2.gain.value = -3; eq2.Q.value = 1
      eq3.frequency.value = 4500; eq3.gain.value = 2; eq3.Q.value = 1.2
      break
    case 'rap':
      eq1.frequency.value = 120; eq1.gain.value = 3; eq1.Q.value = 1.1
      eq2.frequency.value = 5000; eq2.gain.value = -2; eq2.Q.value = 1
      eq3.frequency.value = 1500; eq3.gain.value = 2; eq3.Q.value = 0.9
      break
  }

  // Wet/Dry mix
  const dry = ctx.createGain(); dry.gain.value = 0.7
  const wet = ctx.createGain(); wet.gain.value = 0.3

  // Reverb
  const convolver = ctx.createConvolver()
  if (opts.reverbOn) {
    convolver.buffer = makeImpulseResponse(ctx, 2.2, 2)
  } else {
    convolver.buffer = makeImpulseResponse(ctx, 0.001, 0.001) // hầu như không vang
  }

  // Chorus (hai delay được mod bằng oscillator)
  const chorusMix = ctx.createGain(); chorusMix.gain.value = opts.chorusOn ? 0.35 : 0
  const delay1 = ctx.createDelay(); delay1.delayTime.value = 0.015
  const osc1 = ctx.createOscillator(); osc1.frequency.value = 0.8
  const depth1 = ctx.createGain(); depth1.gain.value = 0.008
  osc1.connect(depth1).connect(delay1.delayTime); osc1.start()
  const delay2 = ctx.createDelay(); delay2.delayTime.value = 0.022
  const osc2 = ctx.createOscillator(); osc2.frequency.value = 1.1
  const depth2 = ctx.createGain(); depth2.gain.value = 0.006
  osc2.connect(depth2).connect(delay2.delayTime); osc2.start()

  // Graph routing
  input.connect(hp).connect(lp).connect(eq1).connect(eq2).connect(eq3).connect(sat)
  // Dry
  sat.connect(g).connect(dry).connect(output)
  // Wet path
  sat.connect(delay1).connect(chorusMix)
  sat.connect(delay2).connect(chorusMix)
  chorusMix.connect(convolver).connect(wet).connect(output)

  return { input, output }
}

function makeImpulseResponse(ctx: BaseAudioContext, seconds: number, decay: number) {
  const rate = ctx.sampleRate
  const length = Math.max(1, Math.floor(seconds * rate))
  const impulse = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random()*2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

function makeSaturationCurve(amount: number) {
  const samples = 1024
  const curve = new Float32Array(samples)
  const k = amount
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  return curve
}