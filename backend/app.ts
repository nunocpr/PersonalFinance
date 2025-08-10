// app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Routes
import authRoutes from "./routes/auth.routes";
import accountRoutes from "./routes/accounts.routes";
import transactionsRouter from './routes/transactions.routes';
import accountsRouter from './routes/accounts.routes';
import errorHandler from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use('/api/transactions', transactionsRouter);
app.use('/api/accounts', accountsRouter);

// Error handling
app.use(errorHandler);

export default app;