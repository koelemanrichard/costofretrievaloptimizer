// supabase/functions/_shared/crypto.ts
// deno-lint-ignore-file no-explicit-any
const Deno = (globalThis as any).Deno;

// Helper to get the encryption key from environment variables
async function getCryptoKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('ENCRYPTION_SECRET');
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable not set.');
  }
  // The secret is Base64 encoded, so we need to decode it first.
  const keyData = atob(secret).split('').map(c => c.charCodeAt(0));
  const keyBuffer = new Uint8Array(keyData);
  
  return await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypts a plaintext string
export async function encrypt(text: string): Promise<string | null> {
  if (!text) return null;
  try {
    const key = await getCryptoKey();
    const encoded = new TextEncoder().encode(text);
    // The IV must be unique for every encryption with the same key.
    // 12 bytes is the recommended size for AES-GCM.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoded
    );
    
    // Combine IV and ciphertext for storage. We'll store it as a Base64 string.
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert the combined buffer to a Base64 string for easy storage in a text column.
    const combinedString = String.fromCharCode.apply(null, Array.from(combined));
    return btoa(combinedString);

  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Could not encrypt the data.');
  }
}

// Decrypts a Base64 encoded ciphertext string
export async function decrypt(encryptedText: string): Promise<string | null> {
  if (!encryptedText) return null;
  try {
    const key = await getCryptoKey();
    
    // Convert the Base64 string back to a Uint8Array
    const combinedString = atob(encryptedText);
    const combined = new Uint8Array(combinedString.length);
    for (let i = 0; i < combinedString.length; i++) {
        combined[i] = combinedString.charCodeAt(i);
    }
    
    // Extract the IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);

  } catch (error) {
    console.error('Decryption failed:', error);
    // It's safer to return null or throw an error than to return corrupted data.
    // Returning null is often easier for the calling function to handle gracefully.
    return null;
  }
}
