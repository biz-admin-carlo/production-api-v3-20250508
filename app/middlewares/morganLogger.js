const morgan = require('morgan');
const os = require('os');
const { networkInterfaces } = require('os');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

morgan.token('coords', (req) => {
  const { latitude, longitude } = req.clientLocation || {};
  return `${latitude ?? 'null'},${longitude ?? 'null'}`;
});

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
    const parts  = message.trim().split(' ');
    const coords = parts.pop();                    
    const [latRaw, lonRaw] = coords.split(',');

    const [method, url, status, responseTime, ip, ...uaParts] = message.trim().split(' ');
    const userAgent = uaParts.join(' ');

    try {
      await prisma.requestLog.create({
        data: {
          method,
          url,
          status: parseInt(status, 10),
          responseTime: parseFloat(responseTime),
          ip,
          userAgent,
          machineName: os.hostname(),
          macAddress: getMacAddress(),
          latitude     : latRaw !== 'null' ? Number(latRaw) : null,
          longitude    : lonRaw !== 'null' ? Number(lonRaw) : null,
        },
      });

    } catch (err) {
      console.error('❌ Failed to log request:', err.message);
    }
  },
};

module.exports = morgan(
  ':method :url :status :response-time :remote-addr :user-agent :coords',
  { stream }
);
