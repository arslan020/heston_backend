import mongoose from 'mongoose';

const StaffSchema = new mongoose.Schema({
  firstName: { type: String, required: false, default: undefined },
  lastName:  { type: String, required: false, default: undefined },
  username:  { type: String, required: true, unique: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  resetPasswordToken: { type: String, default: null },
resetPasswordExpires: { type: Date, default: null },

}, { timestamps: true });

export default mongoose.model('Staff', StaffSchema);
