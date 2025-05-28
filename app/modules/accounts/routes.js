const express = require('express');
const { getAllBiz, createBiz, editBiz } = require('./controller');
const privilegedOnly = require('../../middlewares/privilegedOnly');

const router = express.Router();

// router.put('/edit-biz/', privilegedOnly, editBiz);
router.get('/get-bizness/', privilegedOnly, getAllBiz);
router.post('/create-biz/', privilegedOnly, createBiz);

module.exports = router;
