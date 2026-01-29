import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      enum: ['red', 'blue', 'green', 'yellow', 'black'],
      required: true,
    },
    type: {
      type: String,
      enum: ['number', 'skip', 'reverse', 'draw_two', 'wild', 'wild_draw_four'],
      required: true,
    },
    number: {
      type: Number,
      min: 0,
      max: 9,
      default: null,
    },
    playerId: {
      type: String,
      default: null,
    },
    gameId: {
      type: String,
      required: true,
    },
    isInDeck: {
      type: Boolean,
      default: true,
    },
    isDiscarded: {
      type: Boolean,
      default: false,
    },
    orderIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Método para verificar se pode jogar
cardSchema.methods.canBePlayedOn = function (otherCard) {
  if (!otherCard) return true;
  if (this.color === 'black') return true;
  if (this.color === otherCard.color) return true;
  if (
    this.type === 'number' &&
    otherCard.type === 'number' &&
    this.number === otherCard.number
  )
    return true;
  if (this.type === otherCard.type && this.type !== 'number') return true;
  return false;
};

// Cria o modelo
const Card = mongoose.model('Card', cardSchema);

export default Card;
