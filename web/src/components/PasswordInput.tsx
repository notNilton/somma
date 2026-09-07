import { useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string
}

export default function PasswordInput({
  containerClassName = '',
  className = '',
  id,
  placeholder,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={`password-input-wrapper ${containerClassName}`}>
      <input
        {...props}
        id={id}
        type={showPassword ? 'text' : 'password'}
        className={`password-input-field ${className}`}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
        aria-pressed={showPassword}
        title={showPassword ? 'Ocultar senha' : 'Ver senha'}
      >
        {showPassword ? (
          /* Olho fechado / ocultar */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          /* Olho aberto / mostrar */
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
