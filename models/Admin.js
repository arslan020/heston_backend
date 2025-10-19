import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Admin', AdminSchema);
