export default function Ornament({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 220 50" aria-hidden="true">
      <path d="M4 25h48c7 0 12-5 12-12 0-5-4-9-9-9-6 0-10 5-10 10 0 11 10 19 21 19h28c12 0 22-9 22-21 0 12 10 21 22 21h28c11 0 21-8 21-19 0-5-4-10-10-10-5 0-9 4-9 9 0 7 5 12 12 12h36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M106 14l10 11-10 11-10-11 10-11Z" fill="currentColor" opacity=".18"/>
      <circle cx="110" cy="25" r="2.7" fill="currentColor"/>
    </svg>
  )
}
