'use client';

import { useId, useState } from 'react';

/**
 * Password input with a show/hide toggle (the "eye" icon), shared across
 * every password box in the product — issuer login/signup, staff login,
 * and the password-reset forms. `dark` swaps the label/icon color for the
 * staff login page's navy background (matches that page's existing white
 * label text).
 */
export function PasswordField({
  label,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  dark = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  dark?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <label htmlFor={id} className={`flex flex-col gap-1 text-sm ${dark ? 'text-white' : 'text-certified-ink'}`}>
      {label}
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-control border border-certified-border px-3 py-2 pr-10 text-certified-ink"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-certified-muted"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.4 19.4 0 0 1 4.22-5.61M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a19.5 19.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}
