const mongoose = require("mongoose");
require("dotenv").config();
const OrganizationSchema = require("../models/master/Organization.model");
const SuperAdminSchema = require("../models/master/SuperAdmin.model");

const baseUri = process.env.MONGO_BASE_URI;
const masterDbName = process.env.MASTER_DB_NAME;

if (!baseUri) {
  throw new Error("MONGO_BASE_URI is not set in .env");
}

const masterConnection = mongoose.createConnection(`${baseUri}/${masterDbName}`);

const Organization = masterConnection.model("Organization", OrganizationSchema);
const SuperAdmin = masterConnection.model("SuperAdmin", SuperAdminSchema);

module.exports = {
  masterConnection,
  Organization,
  SuperAdmin,
};
