import type { RequestHandler } from 'express';

import * as authService from '../services/auth.service.js';
import * as userService from '../services/user.service.js';

/** POST /auth/register */
export const register: RequestHandler = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

/** POST /auth/login */
export const login: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await authService.login(req.body));
  } catch (error) {
    next(error);
  }
};

/** POST /auth/refresh */
export const refresh: RequestHandler = async (req, res, next) => {
  try {
    res.status(200).json(await authService.refresh(req.body.refreshToken));
  } catch (error) {
    next(error);
  }
};

/** POST /auth/logout */
export const logout: RequestHandler = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
