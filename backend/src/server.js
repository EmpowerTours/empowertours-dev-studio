const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const generateRoutes = require('./routes/generate');
const creditsRoutes = require('./routes/credits');
const nftRoutes = require('./routes/nft');
const compileRoutes = require('./routes/compile');
const githubRoutes = require('./routes/github');
const previewRoutes = require('./routes/preview');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/generate', authMiddleware, generateRoutes);
app.use('/api/credits', authMiddleware, creditsRoutes);
app.use('/api/nft', authMiddleware, nftRoutes);
app.use('/api/compile', compileRoutes); // Public endpoint for compilation
app.use('/api/github', githubRoutes); // GitHub integration
app.use('/api/preview', previewRoutes); // Live preview server

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 EmpowerTours Dev Studio Backend`);
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Network: ${process.env.NETWORK || 'monadTestnet'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});

module.exports = app;
