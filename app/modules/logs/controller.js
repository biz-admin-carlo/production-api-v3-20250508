const { fetchAllLogs, fetchLogLocations, fetchBizCategoryLogs } = require('./service');

const getAllLogs = async (req, res, next) => {
  try {
    const logs = await fetchAllLogs();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      total: logs.length,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

const getLogLocations = async (req, res, next) => {
  try {
    const logs = await fetchLogLocations();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      total: logs.length,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

const getBizCategoryLogs = async (req, res, next) => {
  try {
    const logs = await fetchBizCategoryLogs();
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      total: logs.length,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllLogs,
  getLogLocations,
  getBizCategoryLogs
};
