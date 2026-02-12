import React from 'react';
import { Label } from '../ui/Label';

export type WebsiteType = 'ecommerce' | 'saas' | 'b2b' | 'blog' | 'local-business' | 'other';

export interface WebsiteTypeSelectorProps {
  value: WebsiteType;
  onChange: (type: WebsiteType) => void;
  disabled?: boolean;
}

const WEBSITE_TYPE_OPTIONS: { value: WebsiteType; label: string; description: string }[] = [
  { value: 'ecommerce', label: 'E-commerce', description: 'Online store \u2014 checks product schema, pricing, availability' },
  { value: 'saas', label: 'SaaS', description: 'Software service \u2014 checks feature comparisons, docs structure' },
  { value: 'b2b', label: 'B2B', description: 'Business-to-business \u2014 checks case studies, service schema' },
  { value: 'blog', label: 'Blog', description: 'Content blog \u2014 checks article schema, author info, dates' },
  { value: 'local-business', label: 'Local Business', description: 'Local service \u2014 checks NAP, local schema' },
  { value: 'other', label: 'Other', description: 'General website \u2014 default rules only' },
];

export const WebsiteTypeSelector: React.FC<WebsiteTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div>
      <Label htmlFor="website-type-select">Website Type</Label>
      <select
        id="website-type-select"
        value={value}
        onChange={(e) => onChange(e.target.value as WebsiteType)}
        disabled={disabled}
        className={`w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
      >
        {WEBSITE_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} — {option.description}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-xs text-gray-500">
        Website type determines which industry-specific rules apply.
      </p>
    </div>
  );
};
