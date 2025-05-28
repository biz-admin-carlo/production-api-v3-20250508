const Log = require('./model');

const fetchAllLogs = async () => {
  return await Log.find().sort({ createdAt: -1 }).lean();
};

module.exports = { fetchAllLogs };