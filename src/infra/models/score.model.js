import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player', //conecta com a collection de jogadores
    required: [true, 'playerId is required'],
  },
  matchId: {
    type: String, // Identificador da partida
    required: [true, 'matchId is required'],
  },
  score: {
    type: Number,
    required: [true, 'score is required'],
    min: [0, 'score cannot be negative'], // impede pontuação negativa
  },
  createdAt: {
    type: Date,
    default: Date.now, // define automaticamente a data de criação
  },
});

// índice para melhorar buscas por matchId (útil na listagem de pontuações por partida)
scoreSchema.index({ matchId: 1 });

export const ScoreModel = mongoose.model('Score', scoreSchema);
