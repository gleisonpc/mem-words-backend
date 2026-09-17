import type { RequestHandler } from 'express';

import * as userService from '../services/user.service.js';
import { UnauthorizedError } from '../errors/AppError.js';

/** GET /users/me */
export const getMe: RequestHandler = async (req, res, next) => {
  try {
    if (req.user === undefined) {
      throw new UnauthorizedError('Token de acesso ausente.');
    }

    res.status(200).json({ user: await userService.findUserById(req.user.id) });
  } catch (error) {
    next(error);
  }
};

/** PATCH /users/:id */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'] as string;
    res.status(200).json({ user: await userService.updateUser(id, req.body) });
  } catch (error) {
    next(error);
  }
};

/** DELETE /users/:id */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const { currentPassword } = req.body as { currentPassword: string };
    await userService.deleteUser(req.params['id'] as string, currentPassword);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
