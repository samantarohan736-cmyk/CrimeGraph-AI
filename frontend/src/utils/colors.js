export const ENTITY_COLORS = {
  Person: '#00F0FF',      // Electric Cyan
  Phone: '#D8B4FE',       // Lilac Purple
  Vehicle: '#FF9E64',     // Tangerine Orange
  Location: '#4EEDA4',    // Mint Green
  Organization: '#FFE600',// Cyber Yellow
  Case: '#FF6B8B',        // Coral Pink
  Crime: '#FF2A6D',       // Hot Magenta
  Transaction: '#FFE600', // Cyber Yellow
  Document: '#CBD5E1',    // Slate Cream
  Evidence: '#00F0FF',    // Electric Cyan
  Entity: '#E2E8F0'       // Default
};

export const COMMUNITY_COLORS = [
  '#00F0FF', // Electric Cyan
  '#4EEDA4', // Mint Green
  '#D8B4FE', // Lilac Purple
  '#FFE600', // Cyber Yellow
  '#FF6B8B', // Coral Pink
  '#FF9E64', // Tangerine Orange
  '#38BDF8'  // Sky Blue
];

export const getPriorityColor = (score) => {
  if (score >= 80) return '#FF6B8B'; // Coral Pink
  if (score >= 60) return '#FFE600'; // Cyber Yellow
  if (score >= 40) return '#00F0FF'; // Electric Cyan
  return '#CBD5E1';                  // Slate
};

export const getSeverityColor = (severity) => {
  const s = (severity || 'MEDIUM').toUpperCase();
  if (s === 'HIGH' || s === 'CRITICAL') return 'bg-brutal-pink text-black';
  if (s === 'MEDIUM') return 'bg-brutal-yellow text-black';
  return 'bg-brutal-lime text-black';
};
