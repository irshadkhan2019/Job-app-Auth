import { winstonLogger } from '@irshadkhan2019/job-app-shared';
import { Logger } from 'winston';
import { config } from '@auth/config';
import { Sequelize } from 'sequelize';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'authDatabaseServer', 'debug');

// where to connect sqldb url
export const sequelize: Sequelize = new Sequelize(config.MYSQL_DB!,  {
  dialect: 'mysql',
  logging: false,
  dialectOptions: {
    multipleStatements: true
  }
});

// get connected
export async function databaseConnection(): Promise<void> {
  try {
    await sequelize.authenticate();
    log.info('AuthService Mysql database connection has been established successfully.');
  } catch (error) {
    log.error('Auth Service - Unable to connect to database.');
    log.log('error', 'AuthService databaseConnection() method error:', error);
  }
}