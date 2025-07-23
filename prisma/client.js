const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

let prisma;

if (!globalForPrisma.prisma) {
  prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], 
  });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma; 
  }
} else {
  prisma = globalForPrisma.prisma;
}

module.exports = prisma;
