import service from './client.service.js';

export default {
  getServices: async (req, res) => {
    res.json(await service.getServices());
  },

  getBookingStatus: async (req, res) => {
    res.json({ enabled: await service.getBookingStatus() });
  },

  getBlockedSlots: async (req, res) => {
    res.json(await service.getBlockedSlots());
  },

  addToCart: async (req, res) => {
    res.json(await service.addToCart(req.user.id, req.body.serviceId));
  },

  getCart: async (req, res) => {
    res.json(await service.getCart(req.user.id));
  },

  removeFromCart: async (req, res) => {
    const { serviceId } = req.params;
    res.json(await service.removeFromCart(req.user.id, serviceId));
  },

  getBookedAppointments: async (req, res, next) => {
    try {
       res.json(await service.getBookedAppointments(req.query.date));
    } catch (err) {
       next(err);
    }
  },

  bookAppointment: async (req, res) => {
    res.json(await service.bookAppointment(req.user, req.body));
  },

  myAppointments: async (req, res) => {
    res.json(await service.myAppointments(req.user.id));
  },

  getTheme: async (req, res) => {
    res.json(await service.getTheme());
  },

  cancelAppointment: async (req, res, next) => {
    try {
      const { id } = req.params;
      res.json(await service.cancelAppointment(req.user.id, id));
    } catch (err) {
      next(err);
    }
  }
};
