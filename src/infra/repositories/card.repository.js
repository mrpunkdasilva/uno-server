import Card from '../models/card.model.js';

/**
 * Repository class for managing card data operations in the database.
 * Follows Option B: return Mongoose documents and allow higher layers to handle errors.
 */
class CardRepository {
  /**
   * Creates a new card document.
   * @param {Object} cardData
   * @returns {Promise<Document>} Mongoose Document for the created card
   */
  async create(cardData) {
    const card = new Card(cardData);
    return await card.save();
  }

  /**
   * Finds a card by its ID.
   * @param {string} id
   * @returns {Promise<Document|null>}
   */
  async findById(id) {
    return await Card.findById(id);
  }

  /**
   * Updates a card by its ID.
   * @param {string} id
   * @param {Object} cardData
   * @returns {Promise<Document|null>}
   */
  async update(id, cardData) {
    return await Card.findByIdAndUpdate(
      id,
      {
        ...cardData,
        updatedAt: Date.now(),
      },
      {
        new: true,
        runValidators: true,
      },
    );
  }

  /**
   * Deletes a card by its ID.
   * @param {string} id
   * @returns {Promise<Document|null>}
   */
  async delete(id) {
    return await Card.findByIdAndDelete(id);
  }

  /**
   * Returns all cards.
   * @returns {Promise<Array<Document>>}
   */
  async findAll() {
    return await Card.find({});
  }

  /**
   * Finds cards matching provided filters.
   * Supported filters: color, gameId, value, playerId, isInDeck, isDiscarded, sortBy, sortOrder, limit, skip
   * Note: this method returns Mongoose documents.
   * @param {Object} filters
   * @returns {Promise<Array<Document>>}
   */
  async findByFilters(filters = {}) {
    const query = {};

    if (filters.color) query.color = filters.color;
    if (filters.gameId) query.gameId = filters.gameId;
    if (filters.type) query.type = filters.type;
    if (filters.number !== undefined) query.number = filters.number;
    if (filters.value) query.value = filters.value;
    if (filters.playerId) query.playerId = filters.playerId;
    if (filters.isInDeck !== undefined) query.isInDeck = filters.isInDeck;
    if (filters.isDiscarded !== undefined)
      query.isDiscarded = filters.isDiscarded;

    let queryBuilder = Card.find(query);

    if (filters.sortBy) {
      const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
      queryBuilder = queryBuilder.sort({ [filters.sortBy]: sortOrder });
    }

    if (filters.limit && !isNaN(filters.limit)) {
      queryBuilder = queryBuilder.limit(parseInt(filters.limit, 10));
    }

    if (filters.skip && !isNaN(filters.skip)) {
      queryBuilder = queryBuilder.skip(parseInt(filters.skip, 10));
    }

    return await queryBuilder.exec();
  }

  /**
   * Counts documents matching provided filters.
   * Supported filters: color, gameId, value
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async countByFilters(filters = {}) {
    const query = {};

    if (filters.color) query.color = filters.color;
    if (filters.gameId) query.gameId = filters.gameId;
    if (filters.type) query.type = filters.type;
    if (filters.number !== undefined) query.number = filters.number;
    if (filters.value) query.value = filters.value;

    return await Card.countDocuments(query);
  }

  /**
   * Initializes a standard UNO deck for a given game.
   * Note: This implementation mirrors existing logic in the codebase and returns
   * Mongoose documents for the inserted cards.
   * @param {string} gameId
   * @returns {Promise<Array<Document>>}
   */
  async initializeGameDeck(gameId) {
    console.log(`Initializing deck for game: ${gameId}`);

    const colors = ['red', 'blue', 'green', 'yellow'];
    const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const specials = ['skip', 'reverse', 'draw2'];

    const cardsToCreate = [];

    // Números (0-9) - 1 carta do 0, 2 cartas dos outros números
    colors.forEach((color) => {
      numbers.forEach((number) => {
        const count = number === '0' ? 1 : 2;
        for (let i = 0; i < count; i++) {
          cardsToCreate.push({
            color,
            type: 'number',
            number: parseInt(number, 10),
            playerId: null,
            gameId,
            isInDeck: true,
            isDiscarded: false,
            orderIndex: 0,
          });
        }
      });
    });

    // Cartas especiais (skip, reverse, draw_two) - 2 de cada
    const specialMap = {
      skip: 'skip',
      reverse: 'reverse',
      draw2: 'draw_two',
    };

    colors.forEach((color) => {
      specials.forEach((special) => {
        const mapped = specialMap[special] || special;
        for (let i = 0; i < 2; i++) {
          cardsToCreate.push({
            color,
            type: mapped,
            number: null,
            playerId: null,
            gameId,
            isInDeck: true,
            isDiscarded: false,
            orderIndex: 0,
          });
        }
      });
    });

    // Cartas pretas (wild cards) - 4 de cada
    const wildCards = [
      { raw: 'wild', type: 'wild' },
      { raw: 'wild_draw4', type: 'wild_draw_four' },
    ];
    wildCards.forEach((w) => {
      for (let i = 0; i < 4; i++) {
        cardsToCreate.push({
          color: 'black',
          type: w.type,
          number: null,
          playerId: null,
          gameId,
          isInDeck: true,
          isDiscarded: false,
          orderIndex: 0,
        });
      }
    });

    // Embaralhar o array e atribuir orderIndex sequencial (Fisher–Yates)
    for (let i = cardsToCreate.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = cardsToCreate[i];
      cardsToCreate[i] = cardsToCreate[j];
      cardsToCreate[j] = tmp;
    }

    // Atribui orderIndex conforme a ordem embaralhada (0..N-1)
    for (let idx = 0; idx < cardsToCreate.length; idx++) {
      cardsToCreate[idx].orderIndex = idx;
    }

    if (cardsToCreate.length > 0) {
      return await Card.insertMany(cardsToCreate);
    }

    return [];
  }

  /**
   * Gets cards for a given game. Returns Mongoose documents.
   * @param {string} gameId
   * @param {Object} filters
   * @returns {Promise<Array<Document>>}
   */
  async getCardsByGame(gameId, filters = {}) {
    const query = { gameId, ...filters };
    return await Card.find(query);
  }

  /**
   * Draws a single card from the deck for a game.
   * Current behavior: finds any card with isInDeck=true and sets isInDeck=false.
   * Higher layers should handle ordering/shuffle behavior.
   * @param {string} gameId
   * @returns {Promise<Document|null>}
   */
  async drawCardFromDeck(gameId) {
    const card = await Card.findOneAndUpdate(
      { gameId, isInDeck: true },
      { isInDeck: false, updatedAt: Date.now() },
      { new: true },
    );
    return card;
  }

  /**
   * Marks a card as discarded.
   * @param {string} cardId
   * @returns {Promise<Document|null>}
   */
  async discardCard(cardId) {
    const card = await Card.findByIdAndUpdate(
      cardId,
      { isDiscarded: true, updatedAt: Date.now() },
      { new: true },
    );
    return card;
  }
}

export default CardRepository;
