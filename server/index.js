import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { seedDatabase } from './seed.js';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.startsWith('/health')) {
      console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'UPI QR Payment Gateway Server', time: new Date() });
});

app.use('/api', apiRoutes);
// Also mount directly so any call made without /api prefix works seamlessly
app.use(apiRoutes);

// In production: Serve frontend build if client/dist exists
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../client/dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

async function startServer() {
  try {
    await connectDB();
    await seedDatabase();
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`=================================================`);
        console.log(`🚀 UPI QR Payment Server running on port ${PORT}`);
        console.log(`🌐 Base URL: http://localhost:${PORT}`);
        console.log(`⚡ Health:   http://localhost:${PORT}/health`);
        console.log(`=================================================`);
      });
    }
  } catch (error) {
    console.error('Fatal: Failed to start server:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
}

// In standard Node.js environment, launch listener
if (!process.env.VERCEL) {
  startServer();
} else {
  // In Vercel serverless environment, connect DB on load
  connectDB().catch((err) => console.error('Vercel DB init error:', err));
}

export default app;
