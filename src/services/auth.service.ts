import { AuthModel } from '@auth/models/auth.schema';
import { config } from '@auth/config';

import { publishDirectMessage } from '@auth/queues/auth.producer';
import { authChannel } from '@auth/server';
import { IAuthBuyerMessageDetails, IAuthDocument, firstLetterUppercase, lowerCase, winstonLogger } from '@irshadkhan2019/job-app-shared';
import { sign } from 'jsonwebtoken';
import { omit } from 'lodash'
import { Model, Op } from 'sequelize';
import { Logger } from 'winston';

const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'authService', 'debug');

export async function createAuthUser(data: IAuthDocument): Promise<IAuthDocument | undefined> {
  try {
    const result: Model = await AuthModel.create(data);
    const messageDetails: IAuthBuyerMessageDetails = {
      username: result.dataValues.username!,
      email: result.dataValues.email!,
      profilePicture: result.dataValues.profilePicture!,
      country: result.dataValues.country!,
      createdAt: result.dataValues.createdAt!,
      type: 'auth'
    };
    // send to queue
    await publishDirectMessage(
      authChannel,
      'jobber-buyer-update', //exchange
      'user-buyer', //routing key
      JSON.stringify(messageDetails), //msg
      'Buyer details sent to buyer service.' //log
    );
    // dont want to return pass so omit
    const userData: IAuthDocument = omit(result.dataValues, ['password']) as IAuthDocument;
    return userData;
  } catch (error) {
    log.error(error);
  }
}

export async function getAuthUserById(authId: number): Promise<IAuthDocument | undefined> {
  try {
    const user: Model = await AuthModel.findOne({
      where: { id: authId }, //find user by id
      attributes: {
        exclude: ['password']
      }
    }) as Model;
    return user?.dataValues;
  } catch (error) {
    log.error(error);
  }
}

export async function getUserByUsernameOrEmail(username: string, email: string): Promise<IAuthDocument | undefined> {
  try {
    const user: Model = await AuthModel.findOne({
      where: {
        [Op.or]: [{ username: firstLetterUppercase(username)}, { email: lowerCase(email)}]
      },
    }) as Model;
    return user?.dataValues;
  } catch (error) {
    log.error(error);
  }
}

export async function getUserByUsername(username: string): Promise<IAuthDocument | undefined> {
  try {
    const user: Model = await AuthModel.findOne({
      where: { username: firstLetterUppercase(username) },
    }) as Model;
    return user?.dataValues;
  } catch (error) {
    log.error(error);
  }
}

export async function getUserByEmail(email: string): Promise<IAuthDocument | undefined> {
  try {
    const user: Model = await AuthModel.findOne({
      where: { email: lowerCase(email) },
    }) as Model;
    return user?.dataValues;
  } catch (error) {
    log.error(error);
  }
}

// used when we wants to verify users email
export async function getAuthUserByVerificationToken(token: string): Promise<IAuthDocument | undefined> {
  try {
    const user: Model = await AuthModel.findOne({
      where: { emailVerificationToken: token },
      attributes: {
        exclude: ['password']
      }
    }) as Model;
    return user?.dataValues;
  } catch (error) {
    log.error(error);
  }
}

// when user wants to update pass
export async function getAuthUserByPasswordToken(token: string): Promise<IAuthDocument | undefined> {
  try {
    const user: Model = await AuthModel.findOne({
      where: {
        [Op.and]: [{ passwordResetToken: token}, { passwordResetExpires: { [Op.gt]: new Date() }}]
      },
    }) as Model;
    return user?.dataValues;
  } catch (error) {
    log.error(error);
  }
}

// update data methods
// when users verify their email
export async function updateVerifyEmailField(authId: number, emailVerified: number, emailVerificationToken?: string): Promise<void> {
  try {
    await AuthModel.update(
     { //what field to update
        emailVerified, //shorthand notation
        emailVerificationToken
      },
      { where: { id: authId }}, //which doc to update
    );
  } catch (error) {
    log.error(error);
  }
}

// user change pass after logged in
export async function updatePasswordToken(authId: number, token: string, tokenExpiration: Date): Promise<void> {
  try {
    await AuthModel.update(
      {
        passwordResetToken: token,
        passwordResetExpires: tokenExpiration
      },
      { where: { id: authId }},
    );
  } catch (error) {
    log.error(error);
  }
}

export async function updatePassword(authId: number, password: string): Promise<void> {
  try {
    await AuthModel.update(
      {
        password,
        passwordResetToken: '',
        passwordResetExpires: new Date()
      },
      { where: { id: authId }},
    );
  } catch (error) {
    log.error(error);
  }
}


// sign  our JWT token where user fields id,emai,username is added
export function signToken(id: number, email: string, username: string): string {
  return sign(
    {
      id,
      email,
      username
    },
    config.JWT_TOKEN!
  );
}