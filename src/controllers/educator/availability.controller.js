const service = require("../../services/educator/availability.service");

exports.createAvailability = async (req, res, next) => {
  try {
    const { EducatorAvailability } = req.tenant.models;

    const data = await service.createAvailability({
      EducatorAvailability,
      currentUser: req.user,
      data: req.body,
    });

    res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.listAvailability = async (req, res, next) => {
  try {
    const { EducatorAvailability } = req.tenant.models;

    const data = await service.listAvailability({
      EducatorAvailability,
      educatorId: req.user.userId,
    });

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.updateAvailability = async (req, res, next) => {
  try {
    const { EducatorAvailability } = req.tenant.models;

    const data = await service.updateAvailability({
      EducatorAvailability,
      educatorId: req.user.userId,
      id: req.params.id,
      data: req.body,
    });

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.deleteAvailability = async (req, res, next) => {
  try {
    const { EducatorAvailability } = req.tenant.models;

    await service.deleteAvailability({
      EducatorAvailability,
      educatorId: req.user.userId,
      id: req.params.id,
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
