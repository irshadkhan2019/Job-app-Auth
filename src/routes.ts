import { Application } from 'express';
import { authRoutes } from '@auth/routes/auth';
import { verifyGatewayRequest } from '@irshadkhan2019/job-app-shared';

const BASE_PATH = '/api/v1/auth';

export function appRoutes(app: Application): void {
  console.log("auth service routes called /api/v1/auth")
  app.use(BASE_PATH,verifyGatewayRequest ,authRoutes());
}; 


//verifyGatewayRequest check for gateway token if exist next() called i.e authRoutes