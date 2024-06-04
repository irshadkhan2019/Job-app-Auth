import http from 'http';
import 'express-async-errors';
import { CustomError, IAuthPayload, IErrorResponse, winstonLogger } from '@irshadkhan2019/job-app-shared'
import { Logger } from 'winston';
import { config } from '@auth/config';
import { Application, Request, Response, NextFunction, json, urlencoded } from 'express';
import hpp from 'hpp';
import helmet from 'helmet';
import cors from 'cors';
import { verify } from 'jsonwebtoken';
import compression from 'compression';
import { checkConnection, createIndex } from '@auth/elasticsearch';
import { appRoutes } from '@auth/routes';
import { createConnection } from '@auth/queues/connection';
import { Channel } from 'amqplib';


const SERVER_PORT = 4002;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'authenticationServer', 'debug');

export let authChannel:Channel;

export function start(app: Application): void {
  securityMiddleware(app);
  standardMiddleware(app);
  routesMiddleware(app);
  startQueues();
  startElasticSearch();
  authErrorHandler(app);
  startServer(app);
}

function securityMiddleware(app: Application): void {
  app.set('trust proxy', 1);
  app.use(hpp());
  app.use(helmet());
  app.use(
    // request can come only from api gateway(api gw is client for auth service) 
    cors({
      origin: config.API_GATEWAY_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    })
  );

//   check if user is logged in (api gateway will add token in header-> Bearer 32422njnejhjk )
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      //split   ['Bearer','32422njnejhjk']
      const payload: IAuthPayload = verify(token, config.JWT_TOKEN!) as IAuthPayload;
      req.currentUser = payload;
    }
    next();
  });
}

function standardMiddleware(app: Application): void {
  app.use(compression());
  app.use(json({ limit: '200mb' })); //to send json data
  app.use(urlencoded({ extended: true, limit: '200mb' }));//to use req.body
}

function routesMiddleware(app: Application): void {
   appRoutes(app);
}

async function startQueues(): Promise<void> {
  authChannel=await createConnection() as Channel;
}

function startElasticSearch(): void {
  checkConnection();
  createIndex('gigs');

}

function authErrorHandler(app: Application): void {
    // catch all erros 
  app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
    // log it to elastic search
    log.log('error', `AuthService ${error.comingFrom}:`, error);
    // send custom error to client
    if (error instanceof CustomError) {
      res.status(error.statusCode).json(error.serializeErrors());
    }
    next();
  });
}

function startServer(app: Application): void {
  try {
    const httpServer: http.Server = new http.Server(app);
    log.info(`Authentication server has started with process id ${process.pid}`);
    httpServer.listen(SERVER_PORT, () => {
      log.info(`Authentication server running on port ${SERVER_PORT}`);
    });
  } catch (error) {
    log.log('error', 'AuthService startServer() method error:', error);
  }
}