const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  mobile: { type: String, trim: true, index: true },
  password: { type: String, required: true, select: false },
  avatar: { type: String, default: '' },
  
  // Platform / Root role or Org-level user
  isPlatformAdmin: { type: Boolean, default: false },
  organisationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', index: true, default: null },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  
  // Quick primary role code for UI display & fast routing (full permissions resolved via assignments)
  primaryRole: { 
    type: String, 
    enum: [
      'PLATFORM_OWNER', 
      'ORGANISATION_OWNER', 
      'PROPERTY_MANAGER', 
      'FINANCE_USER', 
      'SECURITY_GUARD', 
      'MAINTENANCE_STAFF', 
      'RESIDENT', 
      'TENANT', 
      'COWORKING_MEMBER', 
      'VENDOR', 
      'VIEWER',
      'TAX_INVOICE_USER'
    ], 
    default: 'VIEWER' 
  },

  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  isEmailVerified: { type: Boolean, default: true },
  isMobileVerified: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  refreshToken: { type: String, select: false, default: null },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
