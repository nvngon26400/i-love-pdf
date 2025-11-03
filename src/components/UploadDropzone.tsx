import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Props {
  accept?: string
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
}

export default function UploadDropzone({ accept, multiple, onFilesSelected }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [names, setNames] = useState<string[]>([])

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const out: File[] = Array.from(files)
    setNames(out.map((f) => f.name))
    onFilesSelected(out)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="dropzone" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
      <div className="drop-hint">
        Kéo thả file vào đây hoặc{' '}
        <button className="link" onClick={() => inputRef.current?.click()}>
          chọn file
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="file-list"
      >
        {names.length > 0 ? names.join(', ') : 'Chưa chọn file'}
      </motion.div>
    </div>
  )
}