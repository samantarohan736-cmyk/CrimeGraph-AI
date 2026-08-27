import React from 'react';
import { getSeverityColor } from '../../utils/colors';

export default function AlertBadge({ severity }) {
  const s = (severity || 'MEDIUM').toUpperCase();
  return (
    <span className={`neo-badge text-[10px] uppercase ${getSeverityColor(s)}`}>
      {s}
    </span>
  );
}
