
const mongoose = require('mongoose');

const orgSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['B2C', 'B2B', 'WHITE_LABEL'] }
}, { timestamps: true });

module.exports = mongoose.model('Organization', orgSchema);
