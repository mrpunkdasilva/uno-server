import mongoose from 'mongoose';

const gameSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    rules: {
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
    endedAt: {
      type: Date,
      default: null,
    },
    // NOVO: Pilha de descarte
    discardPile: [
      {
        cardId: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          enum: ['red', 'blue', 'green', 'yellow', 'wild'],
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ['number', 'action', 'wild'],
          required: true,
        },
        playedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Player',
        },
        playedAt: {
          type: Date,
          default: Date.now,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],
    initialCard: {
      color: {
        type: String,
        enum: ['red', 'blue', 'green', 'yellow'],
        default: 'blue',
      },
      value: {
        type: String,
        default: '0',
      },
      type: {
        type: String,
        enum: ['number'],
        default: 'number',
      },
    },
    deck: [
      {
        cardId: String,
        color: String,
        value: String,
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Game = mongoose.model('Game', gameSchema);

export default Game;
