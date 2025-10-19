import mongoose from 'mongoose';

const StaffSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  username:  { type: String, unique: true, required: true },
  email:     { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Staff', StaffSchema);
