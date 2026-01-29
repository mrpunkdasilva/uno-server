import Card from '../models/card.model.js';

class CardRepository {
  async create(cardData) {
    try {
      const card = new Card(cardData);
      const savedCard = await card.save();
      return savedCard.toObject();
    } catch (error) {
      console.error('Error creating card:', error.message);
      throw new Error(`Failed to create card: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const card = await Card.findById(id);
      return card ? card.toObject() : null;
    } catch (error) {
      console.error('Error finding card by ID:', error.message);
      throw new Error(`Failed to find card: ${error.message}`);
    }
  }

  async update(id, cardData) {
    try {
      const updatedCard = await Card.findByIdAndUpdate(
        id,
        { 
          ...cardData, 
          updatedAt: Date.now() 
        },
        { 
          new: true, 
          runValidators: true 
        }
      );
      return updatedCard ? updatedCard.toObject() : null;
    } catch (error) {
      console.error('Error updating card:', error.message);
      throw new Error(`Failed to update card: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await Card.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error deleting card:', error.message);
      throw new Error(`Failed to delete card: ${error.message}`);
    }
  }

  async findAll() {
    try {
      const cards = await Card.find({});
      return cards.map(card => card.toObject());
    } catch (error) {
      console.error('Error finding all cards:', error.message);
      throw new Error(`Failed to find cards: ${error.message}`);
    }
  }

  async findByFilters(filters = {}) {
    try {
      const query = {};
      
      if (filters.color) query.color = filters.color;
      if (filters.gameId) query.gameId = filters.gameId;
      if (filters.value) query.value = filters.value;
      if (filters.playerId) query.playerId = filters.playerId;
      if (filters.isInDeck !== undefined) query.isInDeck = filters.isInDeck;
      if (filters.isDiscarded !== undefined) query.isDiscarded = filters.isDiscarded;
      
      let queryBuilder = Card.find(query);
      
      if (filters.sortBy) {
        const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
        queryBuilder = queryBuilder.sort({ [filters.sortBy]: sortOrder });
      }
      
      if (filters.limit && !isNaN(filters.limit)) {
        queryBuilder = queryBuilder.limit(parseInt(filters.limit));
      }
      
      if (filters.skip && !isNaN(filters.skip)) {
        queryBuilder = queryBuilder.skip(parseInt(filters.skip));
      }
      
      const cards = await queryBuilder.exec();
      return cards.map(card => card.toObject());
    } catch (error) {
      console.error('Error filtering cards:', error.message);
      throw new Error(`Failed to filter cards: ${error.message}`);
    }
  }

  async countByFilters(filters = {}) {
    try {
      const query = {};
      
      if (filters.color) query.color = filters.color;
      if (filters.gameId) query.gameId = filters.gameId;
      if (filters.value) query.value = filters.value;
      
      return await Card.countDocuments(query);
    } catch (error) {
      console.error('Error counting cards:', error.message);
      throw new Error(`Failed to count cards: ${error.message}`);
    }
  }

  async initializeGameDeck(gameId) {
    try {
      console.log(`Initializing deck for game: ${gameId}`);
      
      const colors = ['red', 'blue', 'green', 'yellow'];
      const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      const specials = ['skip', 'reverse', 'draw2'];
      
      const cardsToCreate = [];
      
      // Números (0-9) - 1 carta do 0, 2 cartas dos outros números
      colors.forEach(color => {
        numbers.forEach(number => {
          const count = number === '0' ? 1 : 2;
          for (let i = 0; i < count; i++) {
            cardsToCreate.push({
              color,
              value: number,
              gameId,
              isInDeck: true,
              isDiscarded: false
            });
          }
        });
      });
      
      // Cartas especiais (skip, reverse, draw2) - 2 de cada
      colors.forEach(color => {
        specials.forEach(special => {
          for (let i = 0; i < 2; i++) {
            cardsToCreate.push({
              color,
              value: special,
              gameId,
              isInDeck: true,
              isDiscarded: false
            });
          }
        });
      });
      
      // Cartas pretas (wild cards) - 4 de cada
      const wildCards = ['wild', 'wild_draw4'];
      wildCards.forEach(wild => {
        for (let i = 0; i < 4; i++) {
          cardsToCreate.push({
            color: 'black',
            value: wild,
            gameId,
            isInDeck: true,
            isDiscarded: false
          });
        }
      });
      
      // Inserir todas as cartas de uma vez
      if (cardsToCreate.length > 0) {
        const result = await Card.insertMany(cardsToCreate);
        console.log(`Created ${result.length} cards for game ${gameId}`);
        return result.map(card => card.toObject());
      }
      
      return [];
    } catch (error) {
      console.error('Error initializing game deck:', error.message);
      throw new Error(`Failed to initialize deck: ${error.message}`);
    }
  }

  async getCardsByGame(gameId, filters = {}) {
    try {
      const query = { gameId, ...filters };
      const cards = await Card.find(query);
      return cards.map(card => card.toObject());
    } catch (error) {
      console.error('Error getting cards by game:', error.message);
      throw new Error(`Failed to get game cards: ${error.message}`);
    }
  }

  async drawCardFromDeck(gameId) {
    try {
      const card = await Card.findOneAndUpdate(
        { gameId, isInDeck: true },
        { isInDeck: false, updatedAt: Date.now() },
        { new: true }
      );
      return card ? card.toObject() : null;
    } catch (error) {
      console.error('Error drawing card:', error.message);
      throw new Error(`Failed to draw card: ${error.message}`);
    }
  }

  async discardCard(cardId) {
    try {
      const card = await Card.findByIdAndUpdate(
        cardId,
        { isDiscarded: true, updatedAt: Date.now() },
        { new: true }
      );
      return card ? card.toObject() : null;
    } catch (error) {
      console.error('Error discarding card:', error.message);
      throw new Error(`Failed to discard card: ${error.message}`);
    }
  }
}

export default CardRepository;