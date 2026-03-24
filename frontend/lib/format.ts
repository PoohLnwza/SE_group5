export function formatDate(dateString: string | null, locale = 'th-TH') {
  if (!dateString) {
    return '-';
  }

  return new Date(dateString).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(timeString: string | null, locale = 'th-TH') {
  if (!timeString) {
    return '-';
  }

  return new Date(timeString).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoney(value: number, currency = 'THB', locale = 'th-TH') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function titleCase(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
