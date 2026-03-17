import service from './auth.service.js';

export default {
  register: async (req, res, next) => {
    try {
      res.status(201).json(await service.register(req.body));
    } catch (err) {
      next(err);
    }
  },

  login: async (req, res, next) => {
    try {
      res.json(await service.login(req.body));
    } catch (err) {
      next(err);
    }
  },

  adminLogin: async (req, res, next) => {
    try {
      res.json(await service.adminLogin(req.body));
    } catch (err) {
      next(err);
    }
  },

  googleLogin: async (req, res, next) => {
    try {
      res.json(await service.googleLogin(req.user));
    } catch (err) {
      next(err);
    }
  },

  updatePhone: async (req, res, next) => {
    try {
      const { phone } = req.body;
      const { id: userId } = req.user;
      res.json(await service.updatePhone(userId, phone));
    } catch (err) {
      next(err);
    }
  }
};
