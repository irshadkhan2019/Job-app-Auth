import { Application } from 'express';
import { authRoutes } from '@auth/routes/auth';
import { verifyGatewayRequest } from '@irshadkhan2019/job-app-shared';
import { currentUserRoutes } from '@auth/routes/current-user';
import { healthRoutes } from '@auth/routes/health';

const BASE_PATH = '/api/v1/auth';

export function appRoutes(app: Application): void {
  app.use('',healthRoutes());

  app.use(BASE_PATH,verifyGatewayRequest ,authRoutes());
  app.use(BASE_PATH,verifyGatewayRequest ,currentUserRoutes());
}; 


//verifyGatewayRequest check for gateway token if exist next() called i.e authRoutes