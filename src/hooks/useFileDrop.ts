import { useState, type DragEvent } from 'react'
import { toast } from '@/store/toast'

const MAX_BYTES = 20 * 1024 * 1024

export function useFileDrop(onText: (text: string, file: File) => void) {
  const [dragging, setDragging] = useState(false)

  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes('Files')

  return {
    dragging,
    handlers: {
      onDragEnter: (event: DragEvent) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        setDragging(true)
      },
      onDragOver: (event: DragEvent) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      },
      onDragLeave: (event: DragEvent) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setDragging(false)
      },
      onDrop: async (event: DragEvent) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (!file) return
        if (file.size > MAX_BYTES) {
          toast(`${file.name} is larger than 20 MB`, 'error')
          return
        }
        onText(await file.text(), file)
        toast(`Loaded ${file.name}`)
      },
    },
  }
}
