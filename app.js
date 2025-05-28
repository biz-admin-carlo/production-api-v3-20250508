const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');

const errorHandler = require('./app/middlewares/errorHandler');
const { generalLimiter } = require('./app/middlewares/rateLimiter');
const safeSanitize = require('./app/middlewares/safeSanitize');
const mongoLogger = require('./app/middlewares/morganLogger');
const socketManager = require('./app/utils/socketManager');

dotenv.config();

const app = express();

const allowedOrigins = ['http://localhost:3000', 'https://mybizsolutions.us'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
  optionsSuccessStatus: 204
}));

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Register Socket.IO globally
socketManager.setIO(io);

// ───── Webhook (Stripe uses raw body, must be registered before express.json) ─────
const stripeWebhook = require('./app/webhooks/stripeWebhook');

app.use(
  '/api/v2/stripe/webhook',
  bodyParser.raw({ type: 'application/json' }),
  stripeWebhook
);

// ───── Middleware Setup ─────
app.use(helmet());
app.use(safeSanitize);
app.use(generalLimiter);
app.use(cors());
app.use(express.json());
app.use(mongoLogger);

// Attach client geo location from headers
app.use((req, res, next) => {
  req.clientLocation = {
    latitude: req.headers['x-latitude'] || null,
    longitude: req.headers['x-longitude'] || null,
  };
  next();
});

// ───── API Routes ─────
app.use('/api/v2', require('./app/router'));

// ───── Test Route ─────
app.get('/', (req, res) => {
  console.log('✅ Root route hit');
  res.send('API is running!');
});

// ───── Error Handler ─────
app.use(errorHandler);

// ───── MongoDB Connection ─────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ───── Start Server ─────
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
