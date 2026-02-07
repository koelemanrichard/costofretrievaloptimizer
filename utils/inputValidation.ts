// utils/inputValidation.ts

/**
 * Sanitize text input by trimming, truncating, and stripping HTML tags.
 */
export function sanitizeTextInput(input: string, maxLength = 500): string {
  return input.trim().slice(0, maxLength).replace(/<[^>]*>/g, '');
}

/**
 * Validate that a string is a valid URL.
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and sanitize external data against an expected schema.
 * Strips unexpected fields and coerces types where possible.
 */
export function sanitizeExternalData<T extends Record<string, unknown>>(
  data: unknown,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    // Return an empty object matching the schema with defaults
    const result: Record<string, unknown> = {};
    for (const [key, type] of Object.entries(schema)) {
      result[key] = getDefaultForType(type);
    }
    return result as T;
  }

  const input = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, expectedType] of Object.entries(schema)) {
    const value = input[key];

    if (value === undefined || value === null) {
      result[key] = getDefaultForType(expectedType);
      continue;
    }

    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType === expectedType) {
      result[key] = value;
    } else if (expectedType === 'string' && typeof value !== 'object') {
      // Coerce primitives to string
      result[key] = String(value);
    } else if (expectedType === 'number' && typeof value === 'string') {
      const parsed = Number(value);
      result[key] = isNaN(parsed) ? 0 : parsed;
    } else if (expectedType === 'boolean') {
      result[key] = Boolean(value);
    } else if (expectedType === 'object' && typeof value === 'string') {
      // Common AI failure: returns string instead of object
      try {
        const parsed = JSON.parse(value);
        result[key] = typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch {
        result[key] = {};
      }
    } else if (expectedType === 'array' && typeof value === 'string') {
      // Common AI failure: returns string instead of array
      try {
        const parsed = JSON.parse(value);
        result[key] = Array.isArray(parsed) ? parsed : [];
      } catch {
        result[key] = [];
      }
    } else {
      result[key] = getDefaultForType(expectedType);
    }
  }

  return result as T;
}

function getDefaultForType(type: string): unknown {
  switch (type) {
    case 'string': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'object': return {};
    case 'array': return [];
    default: return null;
  }
}
