'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { safeHex } from '@/lib/settings/formUtils';

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

export function BrandColorRow({ label, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <Label className="text-gray-700">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={safeHex(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-gray-200 bg-white p-1"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          className="max-w-[140px] font-mono text-sm"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
