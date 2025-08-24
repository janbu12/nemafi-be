import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { router } from '../routes/index.js';
import { errorHandler } from '../middlewares/errorHandler.js';


export const web = express();


web.use(helmet());
web.use(cors());
web.use(express.json());


web.use('/api', router);

web.use(errorHandler);