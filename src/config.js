const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const REQUIRED_FIELDS = [
  'INFOSET_BASE_URL',
  'INFOSET_EMAIL',
  'INFOSET_PASSWORD',
];

function loadConfig() {
  const missing = REQUIRED_FIELDS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env variables: ${missing.join(', ')}`);
  }

  return {
    infosetBaseUrl: process.env.INFOSET_BASE_URL,
    infosetEmail: process.env.INFOSET_EMAIL,
    infosetPassword: process.env.INFOSET_PASSWORD,
  };
}

module.exports = loadConfig();
