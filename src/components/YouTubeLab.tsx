import { useEffect, useMemo, useState } from 'react'
import { t, type Lang } from '../utils/i18n'

function parseYouTubeId(input: string): { id: string | null; start: number } {
  const trimmed = input.trim()
  if (!trimmed) return { id: null, start: 0 }
  // If it's just an ID
  const idOnly = /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : null
  if (idOnly) return { id: idOnly, start: 0 }
  try {
    const url = new URL(trimmed)
    const host = url.hostname.replace('www.', '')
    let id: string | null = null
    let start = 0
    if (host === 'youtu.be') {
      id = url.pathname.slice(1) || null
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname.startsWith('/watch')) {
        id = url.searchParams.get('v')
      } else if (url.pathname.startsWith('/shorts/')) {
        id = url.pathname.split('/')[2] || null
      } else if (url.pathname.startsWith('/embed/')) {
        id = url.pathname.split('/')[2] || null
      }
    }
    const tParam = url.searchParams.get('t') || url.searchParams.get('start')
    if (tParam) {
      const m = /^(\d+)(s)?$/.exec(tParam)
      if (m) start = parseInt(m[1])
    }
    return { id: id ?? null, start }
  } catch {
    return { id: null, start: 0 }
  }
}

export default function YouTubeLab({ lang }: { lang: Lang }) {
  const [input, setInput] = useState('')
  const parsed = useMemo(() => parseYouTubeId(input), [input])
  const [touched, setTouched] = useState(false)
  const canOpen = !!parsed.id
  const isLikelyUrl = useMemo(() => {
    const s = input.trim()
    if (!s) return false
    // nhận diện chuỗi giống URL YouTube; nếu không giống URL thì coi như từ khóa
    return /^(https?:\/\/|www\.)|youtube\.com|youtu\.be/.test(s)
  }, [input])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [related, setRelated] = useState<PipedVideo[]>([])
  const embedUrl = useMemo(() => {
    const id = selectedId ?? parsed.id
    if (!id) return null
    const params = new URLSearchParams({ autoplay: '0', modestbranding: '1', rel: '0' })
    if (parsed.start > 0) params.set('start', String(parsed.start))
    return `https://www.youtube.com/embed/${id}?${params.toString()}`
  }, [selectedId, parsed])

  // Feed & search via Piped API (public, no key)
  type PipedVideo = {
    title: string
    thumbnail: string
    duration: number
    uploaded: string
    uploaderName: string
    uploaderUrl: string
    url: string // /watch?v=ID
    id: string
    category?: string
    views?: number
  }
  // Fallback các endpoint Piped API (có CORS, trả JSON)
  const PIPED_BASES = [
    'https://pipedapi.kavin.rocks',
    'https://piped.video/api/v1',
    'https://pipedapi.in.projectsegfau.lt',
    'https://pipedapi.k-v.run'
  ]
  const [videos, setVideos] = useState<PipedVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [mode, setMode] = useState<'trending' | 'search'>('trending')
  const [page, setPage] = useState(1)
  const [likeState, setLikeState] = useState<'like'|'dislike'|''>('')
  const [channelName, setChannelName] = useState('')
  const [channelUrl, setChannelUrl] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [shareMsg, setShareMsg] = useState('')

  async function fetchJsonSafe<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      throw new Error('API trả về HTML (không phải JSON)')
    }
  }

  async function pipedGet<T>(path: string): Promise<T> {
    let lastErr: unknown = null
    for (const base of PIPED_BASES) {
      const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`
      try {
        return await fetchJsonSafe<T>(url)
      } catch (e) {
        lastErr = e
        // thử base tiếp theo
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }

  useEffect(() => {
    // initial trending for VN region
    (async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await pipedGet<PipedVideo[]>(`/trending?region=VN&page=1`)
        setVideos(data)
        setMode('trending')
        setPage(1)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function onSearch() {
    const q = input.trim()
    if (!q) return
    try {
      setLoading(true)
      setError(null)
      const data = await pipedGet<any>(`/search?q=${encodeURIComponent(q)}&filter=videos&page=1`)
      const items: PipedVideo[] = Array.isArray(data) ? data : (data.items ?? [])
      setVideos(items)
      setSelectedId(null)
      setMode('search')
      setPage(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const categories = useMemo(() => ['all','top','music','gaming','animation'], [])

  const shownVideos = useMemo(() => {
    // Khi dùng API category, ta không lọc client-side nữa mà hiển thị dữ liệu đã được server trả về.
    return videos
  }, [videos])

  async function changeCategory(cat: string) {
    try {
      setLoading(true)
      setError(null)
      setFilterCat(cat)
      setMode('trending')
      setPage(1)
      setSelectedId(null)
      const url = cat === 'all'
        ? `/trending?region=VN&page=1`
        : `/trending?region=VN&category=${encodeURIComponent(cat)}&page=1`
      const data = await pipedGet<PipedVideo[]>(url)
      setVideos(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function extractIdFromVideo(v: PipedVideo): string | null {
    if (v.id && /^[a-zA-Z0-9_-]{11}$/.test(v.id)) return v.id
    if (v.url) {
      try {
        const y = new URL('https://www.youtube.com' + v.url)
        const vid = y.searchParams.get('v')
        if (vid) return vid
        const parts = y.pathname.split('/').filter(Boolean)
        if (parts[0] === 'shorts' && parts[1]) return parts[1]
      } catch {
        // ignore
      }
    }
    return null
  }

  async function fetchVideoDetails(id: string) {
    try {
      setLoading(true)
      setError(null)
      // streams endpoint cung cấp relatedStreams và comments
      const data: any = await pipedGet<any>(`/streams/${encodeURIComponent(id)}`)
      // cập nhật thông tin kênh hiện tại
      const cuName = data.uploaderName ?? data.uploader ?? ''
      const cuUrl = data.uploaderUrl ?? ''
      setChannelName(cuName)
      setChannelUrl(cuUrl)
      const likeKey = `ytLike:${id}`
      const ls = localStorage.getItem(likeKey) as 'like'|'dislike'|null
      setLikeState(ls || '')
      const subKey = cuUrl ? `ytSub:${cuUrl}` : ''
      setSubscribed(!!(subKey && localStorage.getItem(subKey)==='1'))
      const rel: PipedVideo[] = (data.relatedStreams ?? data.related ?? []).map((r: any) => ({
        title: r.title,
        thumbnail: r.thumbnail,
        duration: r.duration ?? 0,
        uploaded: r.uploaded ?? '',
        uploaderName: r.uploaderName ?? r.uploader ?? '',
        uploaderUrl: r.uploaderUrl ?? '',
        url: r.url ?? (r.id ? `/watch?v=${r.id}` : ''),
        id: r.id ?? '',
        category: r.category ?? '',
        views: r.views ?? r.viewCount
      }))
      setRelated(rel)
      // bỏ xử lý bình luận
    } catch (e) {
      // Thử fallback endpoint /video/<id>
      try {
        const d2: any = await pipedGet<any>(`/video/${encodeURIComponent(id)}`)
        const rel: PipedVideo[] = (d2.relatedStreams ?? d2.related ?? []).map((r: any) => ({
          title: r.title,
          thumbnail: r.thumbnail,
          duration: r.duration ?? 0,
          uploaded: r.uploaded ?? '',
          uploaderName: r.uploaderName ?? r.uploader ?? '',
          uploaderUrl: r.uploaderUrl ?? '',
          url: r.url ?? (r.id ? `/watch?v=${r.id}` : ''),
          id: r.id ?? '',
          category: r.category ?? '',
          views: r.views ?? r.viewCount
        }))
        setRelated(rel)
        // bỏ bình luận khi endpoint phụ
        // nếu endpoint video không trả kênh thì xóa thông tin
        setChannelName(d2.uploaderName ?? d2.uploader ?? '')
        setChannelUrl(d2.uploaderUrl ?? '')
        const likeKey = `ytLike:${id}`
        const ls = localStorage.getItem(likeKey) as 'like'|'dislike'|null
        setLikeState(ls || '')
        const subKey = (d2.uploaderUrl ?? '') ? `ytSub:${d2.uploaderUrl}` : ''
        setSubscribed(!!(subKey && localStorage.getItem(subKey)==='1'))
      } catch (e2) {
        setError((e instanceof Error ? e.message : String(e)) + ' / ' + (e2 instanceof Error ? e2.message : String(e2)))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedId) fetchVideoDetails(selectedId)
  }, [selectedId])


  function toggleLike(kind: 'like'|'dislike') {
    if (!selectedId) return
    const likeKey = `ytLike:${selectedId}`
    let next: 'like'|'dislike'|'' = kind
    if (likeState === kind) next = ''
    setLikeState(next)
    if (next) localStorage.setItem(likeKey, next)
    else localStorage.removeItem(likeKey)
  }

  function toggleSubscribe() {
    if (!channelUrl) return
    const subKey = `ytSub:${channelUrl}`
    const next = !subscribed
    setSubscribed(next)
    localStorage.setItem(subKey, next ? '1' : '0')
  }

  async function doShare() {
    const id = selectedId ?? parsed.id
    if (!id) return
    const link = `https://www.youtube.com/watch?v=${id}`
    try {
      await navigator.clipboard.writeText(link)
      setShareMsg(t(lang,'youtube_copied'))
    } catch {
      const ta = document.createElement('textarea')
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setShareMsg(t(lang,'youtube_copied'))
    }
    setTimeout(()=>setShareMsg(''), 1500)
  }

  async function loadMore() {
    try {
      setLoading(true)
      setError(null)
      const nextPage = page + 1
      let newItems: PipedVideo[] = []
      if (mode === 'trending') {
        const catParam = filterCat === 'all' ? '' : `&category=${encodeURIComponent(filterCat)}`
        newItems = await pipedGet<PipedVideo[]>(`/trending?region=VN${catParam}&page=${nextPage}`)
      } else {
        const q = input.trim()
        const data = await pipedGet<any>(`/search?q=${encodeURIComponent(q)}&filter=videos&page=${nextPage}`)
        newItems = Array.isArray(data) ? data : (data.items ?? [])
      }
      setVideos(prev => [...prev, ...newItems])
      setPage(nextPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <h3>{t(lang, 'youtube_lab_title')}</h3>
      <div className="yt-search">
        <input
          className="yt-input"
          type="text"
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          onBlur={()=>setTouched(true)}
          placeholder={t(lang, 'youtube_search_placeholder')}
          onKeyDown={(e)=>{ if(e.key==='Enter') onSearch() }}
        />
        <button className="primary" onClick={onSearch}>🔎 {t(lang,'youtube_search')}</button>
        {canOpen && (
          <button onClick={()=>setSelectedId(parsed.id!)}>▶︎ {t(lang,'youtube_open_video')}</button>
        )}
        {!canOpen && touched && isLikelyUrl && (
          <p className="message" style={{gridColumn:'1 / -1'}}>{t(lang, 'youtube_invalid_url')}</p>
        )}
      </div>

      {embedUrl && (
        <div style={{marginTop:12}}>
          <div style={{position:'relative', paddingBottom:'56.25%', height:0, border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden', background:'var(--card-bg)'}}>
            <iframe
              title="YouTube Player"
              src={embedUrl}
              style={{position:'absolute', top:0, left:0, width:'100%', height:'100%'}}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8, flexWrap:'wrap'}}>
            {channelName && (
              <a href={channelUrl || undefined} target="_blank" rel="noopener" style={{fontWeight:600}}>
                {channelName}
              </a>
            )}
            <button onClick={toggleSubscribe} className="primary">
              {subscribed ? t(lang,'youtube_unsubscribe') : t(lang,'youtube_subscribe')}
            </button>
            <button onClick={()=>toggleLike('like')} style={{background: likeState==='like' ? 'var(--accent)' : undefined}}>
              👍 {t(lang,'youtube_like')}
            </button>
            <button onClick={()=>toggleLike('dislike')} style={{background: likeState==='dislike' ? 'var(--accent)' : undefined}}>
              👎 {t(lang,'youtube_dislike')}
            </button>
            <button onClick={doShare}>🔗 {t(lang,'youtube_share')}</button>
            <a href={`https://www.youtube.com/watch?v=${selectedId ?? parsed.id ?? ''}`} target="_blank" rel="noopener" style={{textDecoration:'none'}}>
              🔴 {t(lang,'youtube_open_on_youtube')}
            </a>
            {shareMsg && <span style={{opacity:0.8}}>{shareMsg}</span>}
          </div>
        </div>
      )}

      <h4 style={{marginTop:16}}>{t(lang,'youtube_trending')}</h4>
      <div className="tabs" style={{margin:'8px 0'}}>
        {categories.map(cat => (
          <button
            key={cat}
            className={filterCat===cat?'active':''}
            onClick={()=>changeCategory(cat)}
          >
            {cat==='all' ? t(lang,'youtube_filter_all') :
             cat==='top' ? t(lang,'youtube_filter_top') :
             cat==='music' ? t(lang,'youtube_filter_music') :
             cat==='gaming' ? t(lang,'youtube_filter_gaming') :
             cat==='animation' ? t(lang,'youtube_filter_animation') : cat}
          </button>
        ))}
      </div>
      {error && <p className="message">{error}</p>}

      {selectedId && (
        <div style={{marginTop:16}}>
          <h4>{t(lang,'youtube_related')}</h4>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
            {related.map(v => (
              <div key={(v.id||v.url)+'rel'} style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden', cursor:'pointer'}} onClick={()=>{ const id = extractIdFromVideo(v); if (id) setSelectedId(id); }}>
                <img src={v.thumbnail} alt={v.title} crossOrigin="anonymous" style={{width:'100%', display:'block'}} />
                <div style={{padding:8}}>
                  <div style={{fontWeight:600, lineHeight:1.3}}>{v.title}</div>
                  <div style={{opacity:0.8, fontSize:12}}>{v.uploaderName}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bỏ phần bình luận và đăng nhập */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
        {shownVideos.map(v => (
          <div key={v.id || v.url} style={{background:'var(--card-bg)', border:'1px solid var(--card-border)', borderRadius:12, overflow:'hidden', cursor:'pointer'}} onClick={()=>{ const id = extractIdFromVideo(v); if (id) setSelectedId(id); else setError('Không lấy được ID video'); }}>
            <img src={v.thumbnail} alt={v.title} crossOrigin="anonymous" style={{width:'100%', display:'block'}} />
            <div style={{padding:8}}>
              <div style={{fontWeight:600, lineHeight:1.3}}>{v.title}</div>
              <div style={{opacity:0.8, fontSize:12}}>{v.uploaderName}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{gridColumn:'1 / -1', textAlign:'center', opacity:0.8}}>Đang tải…</div>
        )}
        {shownVideos.length > 0 && (
          <div style={{gridColumn:'1 / -1', display:'flex', justifyContent:'center'}}>
            <button className="primary" onClick={loadMore} disabled={loading} aria-busy={loading}>
              {t(lang,'youtube_show_more')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}