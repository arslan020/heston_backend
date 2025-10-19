// backend/models/Appraisal.js
import mongoose from 'mongoose';

const FaultSchema = new mongoose.Schema({
  idx: Number,
  part: String,
  damage: String,
  detail: String,
  note: String,
  coords: { x: Number, y: Number },
}, { _id: false });

const AppraisalSchema = new mongoose.Schema({
  reg: String,
  vehicle: String,
  make: String,
  model: String,
  year: String,
  colour: String,
  transmission: String,
  mileage: String,
  fuelType: String,
  engineSize: String,
  co2: String,
  euroStatus: String,
  regDate: String,
  artEndDate: String,
  motStatus: String,
  revenueWeight: String,
  taxDueDate: String,
  taxStatus: String,
  wheelplan: String,
  yearOfManufacture: String,
  dateOfLastV5CIssued: String,

  ownerName: String,
  ownerContact: String,

  overallGrade: String,
  conditionMeter: Number,

  tyres: [{
    position: String,
    treadDepth: String,
    condition: String,
  }],

  lightsCheck: Boolean,
  mirrorsCheck: Boolean,
  wipersCheck: Boolean,
  engineStartSmooth: Boolean,
  steeringAlignment: Boolean,
  brakePerformance: Boolean,
  gearShiftQuality: Boolean,
  testDriveNotes: String,

  faults: {
    exterior: [FaultSchema],
    interior: [FaultSchema],
  },

  submittedBy: String,
  date: String,
}, { timestamps: true });

export default mongoose.model('Appraisal', AppraisalSchema);
