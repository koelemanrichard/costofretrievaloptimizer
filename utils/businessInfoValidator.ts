export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateBusinessInfoForAnalysis(businessInfo: any): ValidationResult {
  const errors: string[] = [];

  if (!businessInfo?.language) errors.push('Language is required. Set it in Business Info.');
  if (!businessInfo?.industry) errors.push('Industry is required. Set it in Business Info.');
  if (!businessInfo?.audience) errors.push('Target audience is required. Set it in Business Info.');

  return { valid: errors.length === 0, errors };
}

export function validatePillarsForAnalysis(pillars: any): ValidationResult {
  const errors: string[] = [];

  if (!pillars?.centralEntity?.trim()) errors.push('Central Entity (CE) is required. Define it in SEO Pillars.');
  if (!pillars?.sourceContext?.trim()) errors.push('Source Context (SC) is required. Define it in SEO Pillars.');
  if (!pillars?.centralSearchIntent?.trim()) errors.push('Central Search Intent (CSI) is required. Define it in SEO Pillars.');

  return { valid: errors.length === 0, errors };
}
