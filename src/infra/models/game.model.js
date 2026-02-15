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
        hand: {
          type: [mongoose.Schema.Types.Mixed], // Array of card objects
          default: [],
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
    currentPlayerIndex: {
      type: Number,
      default: 0,
    },
    turnDirection: {
      type: Number,
      enum: [1, -1],
      default: 1, // 1 for clockwise, -1 for counter-clockwise
    },
    currentColor: {
      type: String,
      default: null, // Will be set by played cards, especially Wilds
    },
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
        cardId: { type: String, required: true },
        color: { type: String, required: true },
        value: { type: String, required: true },
        type: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// --- Instance Methods ---

/**
 * Advances the turn to the next player based on the game's turn direction.
 */
gameSchema.methods.advanceTurn = function () {
  const numPlayers = this.players.length;
  if (numPlayers === 0) return;
  this.currentPlayerIndex =
    (this.currentPlayerIndex + this.turnDirection + numPlayers) % numPlayers;
};

/**
 * Reverses the direction of play.
 */
gameSchema.methods.reverseDirection = function () {
  this.turnDirection *= -1;
};

/**
 * Gets the next player in turn order without advancing the turn.
 * @returns {object|null} The next player object or null if no players.
 */
gameSchema.methods.getNextPlayer = function () {
  const numPlayers = this.players.length;
  if (numPlayers === 0) return null;
  const nextPlayerIndex =
    (this.currentPlayerIndex + this.turnDirection + numPlayers) % numPlayers;
  return this.players[nextPlayerIndex];
};

/**
 * Sets the current color of the game, used after a Wild card is played.
 * @param {string} color - The color to set.
 */
gameSchema.methods.setCurrentColor = function (color) {
  this.currentColor = color;
};

const Game = mongoose.model('Game', gameSchema);

export default Game;
