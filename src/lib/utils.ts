import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone: string | undefined | null) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function validateCPF(cpf: string) {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

export function formatCPF(cpf: string) {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return cpf;
}

export function getWhatsAppUrl(phone: string | undefined | null, message?: string) {
  if (!phone) return '#';
  const cleaned = phone.replace(/\D/g, '');
  const baseUrl = `https://web.whatsapp.com/send?phone=55${cleaned}`;
  return message ? `${baseUrl}&text=${encodeURIComponent(message)}` : baseUrl;
}

/**
 * Checks whether an item's unit matches a user's unit.
 * Handles:
 * - Unrestricted / global access (empty user unit, "Todas", "Regional", etc.)
 * - Case insensitivity ("Resende" === "RESENDE")
 * - Trim and accent normalization
 * - Multiple units separated by commas, semicolons, slashes
 * - Substrings (e.g. "Resende" matches "Estácio Resende" or "UNESA RESENDE")
 */
export function matchesUnit(itemUnit?: string | null, userUnit?: string | null): boolean {
  if (!userUnit || !userUnit.trim()) {
    return true; // No unit restriction configured for user -> allow
  }
  const cleanUser = userUnit.trim().toLowerCase();
  if (
    cleanUser === "todas" ||
    cleanUser === "todas / regional" ||
    cleanUser.includes("todas") ||
    cleanUser.includes("regional") ||
    cleanUser.includes("global")
  ) {
    return true;
  }
  if (!itemUnit || !itemUnit.trim()) {
    return false;
  }
  const cleanItem = itemUnit.trim().toLowerCase();
  if (cleanItem === cleanUser) return true;

  // Split multiple units for users assigned to more than one unit (e.g., "Resende, Cabo Frio")
  const userUnits = cleanUser.split(/[,;/|]+/).map((u) => u.trim()).filter(Boolean);
  if (userUnits.length > 1) {
    return userUnits.some(
      (u) => cleanItem === u || cleanItem.includes(u) || u.includes(cleanItem)
    );
  }

  // Substring matching: e.g. "Resende" matches "Estácio Resende" or "UNESA Resende"
  return cleanItem.includes(cleanUser) || cleanUser.includes(cleanItem);
}
