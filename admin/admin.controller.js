import service from './admin.service.js';

export default {
  getAppointments: async (req, res) => {
    res.json(await service.getAppointments());
  },

  addService: async (req, res) => {
    res.json(await service.addService(req.body));
  },

  updateService: async (req, res) => {
    res.json(await service.updateService(req.params.id, req.body));
  },

  deleteService: async (req, res) => {
    res.json(await service.deleteService(req.params.id));
  },

  uploadImage: async (req, res, next) => {
    try {
      const { fileName, fileType, content } = req.body;
      const result = await service.uploadImage({ fileName, fileType, content });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  blockSlot: async (req, res) => {
    res.json(await service.blockSlot(req.body));
  },

  deleteBlockedSlot: async (req, res) => {
    res.json(await service.deleteBlockedSlot(req.params.id));
  },

  getBlockedSlots: async (req, res, next) => {
    try {
      const data = await service.getBlockedSlots();
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  toggleBooking: async (req, res) => {
    res.json(await service.toggleBooking(req.body.enabled));
  },

  updateAppointmentStatus: async (req, res) => {
    res.json(await service.updateAppointmentStatus(req.params.id, req.body.status, req.body.reason));
  },

  testEmail: async (req, res) => {
    // expects { email } in body
    const { email } = req.body;
    res.json(await service.testEmail(email));
  },

  getTheme: async (req, res) => {
    res.json(await service.getTheme());
  },

  updateTheme: async (req, res) => {
    res.json(await service.updateTheme(req.body));
  }
};
