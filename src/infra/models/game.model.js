import mongoose from 'mongoose';

const gameSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      required: true,
    },
    status: {
      type: String,
      // Added 'Waiting' to allow new players to join
      enum: ['Waiting', 'Active', 'Pause', 'Ended'],
      default: 'Waiting',
      required: true,
    },
    maxPlayers: {
      type: Number,
      required: true,
    },
    players: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Player',
          required: true,
        },
        ready: {
          type: Boolean,
          default: false,
        },
        position: {
          type: Number,
          default: 0,
        },
      },
    ],
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Player',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Game = mongoose.model('Game', gameSchema);

export default Game;
