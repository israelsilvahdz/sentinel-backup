import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza una cadena de texto eliminando acentos y convirtiéndola a minúsculas
 * para facilitar búsquedas y comparaciones.
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalizar espacios múltiples
}

export function generateKeyFromData(data: string): string {
    // Simple non-crypto hash.
    let hash = 0;
    if (data.length === 0) return hash.toString();
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

export function xorCipher(data: string, key: string): string {
    if (!key) return data;
    return data.split('').map((char, i) => {
        return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
    }).join('');
}
