import mongoose from 'mongoose';

const gameSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["Active", "Pause", "Ended"],
        required: true
    },
    maxPlayers: {
        type: Number,
        required: true
    },
    players: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player"
  }]},
  {
    timestamps: true
  }
    
)

const Game = mongoose.model('Game', gameSchema)

export default Game;