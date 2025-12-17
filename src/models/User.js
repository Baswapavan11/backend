
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'EDUCATOR', 'LEARNER'], required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
