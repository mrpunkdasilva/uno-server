import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player', //conecta com a collection de jogadores
    required: true,
  },
  matchId: {
    type: String, // Identificador da partida
    required: true,
  },
  score: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const ScoreModel = mongoose.model('Score', scoreSchema);
