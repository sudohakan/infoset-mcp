const PRIORITY_MAP = {
  1: { label: 'Low', emoji: '🟢' },
  2: { label: 'Medium', emoji: '🟡' },
  3: { label: 'High', emoji: '🟠' },
  4: { label: 'Urgent', emoji: '🔴' },
};

const STATUS_MAP = {
  1: 'Open',
  2: 'Pending',
  3: 'Resolved',
  4: 'Closed',
};

function getPriorityInfo(priority) {
  return PRIORITY_MAP[priority] || PRIORITY_MAP[2];
}

function getStatusText(status) {
  return STATUS_MAP[status] || 'Unknown';
}

function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

module.exports = {
  PRIORITY_MAP,
  STATUS_MAP,
  getPriorityInfo,
  getStatusText,
  truncate,
};
