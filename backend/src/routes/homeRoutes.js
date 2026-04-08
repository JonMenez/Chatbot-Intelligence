const express = require('express');
const { renderHomePage } = require('../pages/homePage');

const router = express.Router();

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderHomePage());
});

module.exports = router;

