const express = require('express');
const cors = require('cors');

const routes = require('./routes');

function createApp() {
  const app = express();

  // CORS configuration - Permissive for development
  app.use(
    cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        '*',
      ],
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: false,
    })
  );

  // Increase payload size limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.use(routes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.path,
      method: req.method,
      availableEndpoints: ['/chat (POST)', '/health (GET)', '/ (GET)'],
    });
  });

  return app;
}

module.exports = {
  createApp,
};

