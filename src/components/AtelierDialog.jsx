import { useEffect, useRef } from 'react'

export default function AtelierDialog({ children, label, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    const node = dialog.current
    const previous = document.body.style.overflow
    node.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      node.close()
      document.body.style.overflow = previous
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="atelier-dialog"
      aria-label={label}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}
