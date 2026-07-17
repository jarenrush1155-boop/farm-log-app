'use client';

type PinFieldProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
};

export default function PinField({
  value,
  onChange,
  label = 'Enter PIN to Save/Edit',
  className = 'w-full p-3 border rounded-lg',
}: PinFieldProps) {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="off"
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      aria-label={label}
    />
  );
}
