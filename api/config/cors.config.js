export const corsConfig = {
  origin: process.env.CORS_ORIGINS,
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}