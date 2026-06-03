import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value) + ' смн.';
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getExpiryStatus(expiryDate: string | Date | null): 'expired' | 'critical' | 'warning' | 'ok' {
  if (!expiryDate) return 'ok';
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays < 30) return 'critical';
  if (diffDays < 90) return 'warning';
  return 'ok';
}

export function getExpiryBadgeClass(status: string): string {
  switch (status) {
    case 'expired': return 'status-red';
    case 'critical': return 'status-red';
    case 'warning': return 'status-yellow';
    default: return 'status-green';
  }
}

export function getExpiryLabel(status: string): string {
  switch (status) {
    case 'expired': return 'Просрочен';
    case 'critical': return '< 30 дней';
    case 'warning': return '< 90 дней';
    default: return 'В норме';
  }
}
