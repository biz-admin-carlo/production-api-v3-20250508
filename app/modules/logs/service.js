const prisma = require('../../../prisma/client');

const fetchAllLogs = async () => {
  return await prisma.requestLog.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      method: true,
      url: true,
      status: true,
      responseTime: true,
      ip: true,
      machineName: true,
      createdAt: true,
    },
  });
};

const fetchLogLocations = async () => {
  return await prisma.requestLog.findMany({
    orderBy: { createdAt: 'desc' },
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      method: true,
      url: true,
      ip: true,
      latitude: true,
      longitude: true,
      createdAt: true,
    },
  });
};

const fetchBizCategoryLogs = async () => {
  return await prisma.requestLog.findMany({
    orderBy: { createdAt: 'desc' },
    where: {
      url: {
        startsWith: '/api/v2/biz/category/',
      },
    },
    select: {
      id: true,
      method: true,
      url: true,
      status: true,
      responseTime: true,
      ip: true,
      createdAt: true,
    },
  });
};

module.exports = {
  fetchAllLogs,
  fetchLogLocations,
  fetchBizCategoryLogs
};
