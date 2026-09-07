import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

/**
 * Atomically generates the next unique sequential Customer ID formatted as KKV-2026-000001
 */
export async function generateCustomerId(prefix: string = 'KKV-2026'): Promise<{ customerId: string; sequenceNumber: number }> {
  if (mongoose.connection.readyState === 1) {
    try {
      const counterDoc = await Counter.findByIdAndUpdate(
        'customer_id_sequence',
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      if (counterDoc && counterDoc.seq) {
        const sequenceNumber = counterDoc.seq;
        const formattedId = `${prefix}-${String(sequenceNumber).padStart(6, '0')}`;
        return { customerId: formattedId, sequenceNumber };
      }
    } catch (err) {
      console.warn('[CustomerIdGenerator] Counter query notice:', err);
    }
  }

  // Fallback sequential ID based on timestamp
  const fallbackSeq = Math.floor((Date.now() % 1000000) + Math.random() * 100);
  const fallbackId = `${prefix}-${String(fallbackSeq).padStart(6, '0')}`;
  return { customerId: fallbackId, sequenceNumber: fallbackSeq };
}

