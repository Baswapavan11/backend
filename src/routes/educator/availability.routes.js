const express = require("express");
const router = express.Router();

const auth = require("../../middleware/auth.middleware");
const tenant = require("../../middleware/tenant.middleware");
const role = require("../../middleware/role.middleware");
const ctrl = require("../../controllers/educator/availability.controller");

router.use(auth, tenant, role(["educator"]));

router.post("/", ctrl.createAvailability);
router.get("/", ctrl.listAvailability);
router.patch("/:id", ctrl.updateAvailability);
router.delete("/:id", ctrl.deleteAvailability);

module.exports = router;
