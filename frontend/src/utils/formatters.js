export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === undefined || amount === null) return 'N/A';
  const num = Number(amount);
  if (isNaN(num)) return 'N/A';
  
  if (currency === 'INR') {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    return `₹${num.toLocaleString('en-IN')}`;
  }
  if (currency === 'AED') return `${num.toLocaleString()} AED`;
  if (currency === 'USDT' || currency === 'USD') return `$${num.toLocaleString()} ${currency}`;
  return `${currency} ${num.toLocaleString()}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};
