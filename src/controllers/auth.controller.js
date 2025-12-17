const authService = require("../services/auth.service");

async function adminLogin(req, res, next) {
  try {
    const { orgSlug, email, password } = req.body;
    const result = await authService.loginAdmin({ orgSlug, email, password });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
async function educatorLogin(req, res, next) {
  try {
    const { orgSlug, email, password } = req.body;
    const result = await authService.loginEducator({ orgSlug, email, password });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
async function superAdminLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.loginSuperAdmin({ email, password });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminLogin,
  educatorLogin,
  superAdminLogin,
};
