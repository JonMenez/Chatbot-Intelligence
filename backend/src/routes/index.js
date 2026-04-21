const express = require('express');

const homeRoutes = require('./homeRoutes');
const chatRoutes = require('./chatRoutes');
const ragRoutes = require('./ragRoutes');
const healthRoutes = require('./healthRoutes');
const documentRoutes = require('./documentRoutes');

const router = express.Router();

router.use(homeRoutes);
router.use(chatRoutes);
router.use(ragRoutes);
router.use(healthRoutes);
router.use(documentRoutes);

module.exports = router;

