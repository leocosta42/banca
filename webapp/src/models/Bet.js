import mongoose from 'mongoose';

const BetSchema = new mongoose.Schema({
  event: { type: String, required: true },
  market: { type: String, required: true },
  odd: { type: Number, required: true },
  stake: { type: Number, required: true },
  result: { type: String, required: true, enum: ['green', 'red', 'cashout', 'pending'] },
  cashoutValue: { type: Number, default: 0 },
  pl: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

export default mongoose.models.Bet || mongoose.model('Bet', BetSchema);
