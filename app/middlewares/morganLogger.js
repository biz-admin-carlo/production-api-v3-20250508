const morgan = require('morgan');
const os = require('os');
const { networkInterfaces } = require('os');
const Log = require('../modules/logs/model');

function getMacAddress() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (!net.internal && net.mac !== '00:00:00:00:00:00') {
        return net.mac;
      }
    }
  }
  return 'unknown';
}

const stream = {
  write: async (message) => {
    const parts = message.trim().split(' ');
    try {
      await Log.create({
        method: parts[0],
        url: parts[1],
        status: parseInt(parts[2]),
        responseTime: parseFloat(parts[3]),
        ip: parts[4],
        userAgent: parts.slice(5).join(' '),
        machineName: os.hostname(),
        macAddress: getMacAddress(),
        latitude: null,
        longitude: null
      });
    } catch (err) {
      console.error('❌ Failed to log request:', err.message);
    }
  }
};

module.exports = morgan(
  ':method :url :status :response-time :remote-addr :user-agent',
  { stream }
);
