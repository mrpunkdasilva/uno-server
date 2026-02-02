import CardRepository from '../../infra/repositories/card.repository.js';
import cardResponseDtoSchema from '../../presentation/dtos/cardResponse.dto.js';

/**
 * Service class for managing card operations including CRUD operations,
 * filtering, and data validation. Ensures data integrity through DTO validation.
 */
class CardService {
  /**
   * Initializes the CardService with a CardRepository instance.
   * @param {CardRepository} cardRepository
   */
  constructor(cardRepository) {
    this.cardRepository = cardRepository || new CardRepository();
  }

  /**
   * Retrieves all cards from the database with optional filters
   * @param {Object} filters - Optional filters for querying cards
   * @returns {Promise<Array>} Array of all card objects formatted as response DTOs
   * @throws {Error} When database operation fails
   */
  async findAll(filters = {}) {
    const cards = await this.cardRepository.findByFilters(filters);
    return cards.map((card) => {
      const cardObject = card.toObject();
      const dataToReturn = {
        ...cardObject,
        id: cardObject._id.toString(),
      };
      return cardResponseDtoSchema.parse(dataToReturn);
    });
  }

  /**
   * Creates a new card with the provided card data
   * @param {Object} cardData - The data for creating a new card
   * @returns {Promise<Object>} The created card object formatted as response DTO
   * @throws {Error} When creation fails
   */
  async create(cardData) {
    const newCard = await this.cardRepository.create(cardData);
    const cardObject = newCard.toObject();
    const dataToReturn = {
      ...cardObject,
      id: cardObject._id.toString(),
    };

    const responseDto = cardResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  /**
   * Retrieves a card by their ID
   * @param {string} id - The ID of the card to retrieve
   * @returns {Promise<Object>} The card object formatted as response DTO
   * @throws {Error} When card is not found
   */
  async findById(id) {
    const card = await this.cardRepository.findById(id);
    if (!card) {
      throw new Error('Card not found');
    }

    const cardObject = card.toObject();
    const dataToReturn = {
      ...cardObject,
      id: cardObject._id.toString(),
    };

    const responseDto = cardResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  /**
   * Updates an existing card with new data
   * @param {string} id - The ID of the card to update
   * @param {Object} cardData - The data to update the card with
   * @returns {Promise<Object>} The updated card object formatted as response DTO
   * @throws {Error} When card is not found or update fails
   */
  async update(id, cardData) {
    const card = await this.cardRepository.findById(id);
    if (!card) {
      throw new Error('Card not found');
    }

    const updatedCard = await this.cardRepository.update(id, cardData);
    const cardObject = updatedCard.toObject();
    const dataToReturn = {
      ...cardObject,
      id: cardObject._id.toString(),
    };

    const responseDto = cardResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  /**
   * Deletes a card by their ID
   * @param {string} id - The ID of the card to delete
   * @returns {Promise<Object>} The deleted card object
   * @throws {Error} When card is not found or deletion fails
   */
  async delete(id) {
    const card = await this.cardRepository.findById(id);
    if (!card) {
      throw new Error('Card not found');
    }
    return await this.cardRepository.delete(id);
  }

  /**
   * Initializes a standard UNO deck for a given game
   * @param {string} gameId - The ID of the game
   * @returns {Promise<Array>} Array of created card objects formatted as response DTOs
   * @throws {Error} When deck initialization fails
   */
  async initializeGameDeck(gameId) {
    const cards = await this.cardRepository.initializeGameDeck(gameId);
    return cards.map((card) => {
      const cardObject = card.toObject();
      const dataToReturn = {
        ...cardObject,
        id: cardObject._id.toString(),
      };
      return cardResponseDtoSchema.parse(dataToReturn);
    });
  }

  /**
   * Gets cards for a given game with optional filters
   * @param {string} gameId - The ID of the game
   * @param {Object} filters - Optional filters for querying cards
   * @returns {Promise<Array>} Array of card objects formatted as response DTOs
   * @throws {Error} When database operation fails
   */
  async getCardsByGame(gameId, filters = {}) {
    const cards = await this.cardRepository.getCardsByGame(gameId, filters);
    return cards.map((card) => {
      const cardObject = card.toObject();
      const dataToReturn = {
        ...cardObject,
        id: cardObject._id.toString(),
      };
      return cardResponseDtoSchema.parse(dataToReturn);
    });
  }

  /**
   * Draws a single card from the deck for a game
   * @param {string} gameId - The ID of the game
   * @returns {Promise<Object>} The drawn card object formatted as response DTO
   * @throws {Error} When no cards are available to draw
   */
  async drawCard(gameId) {
    const card = await this.cardRepository.drawCardFromDeck(gameId);
    if (!card) {
      throw new Error('No cards available to draw');
    }

    const cardObject = card.toObject();
    const dataToReturn = {
      ...cardObject,
      id: cardObject._id.toString(),
    };

    const responseDto = cardResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  /**
   * Marks a card as discarded
   * @param {string} cardId - The ID of the card to discard
   * @returns {Promise<Object>} The discarded card object formatted as response DTO
   * @throws {Error} When card is not found
   */
  async discardCard(cardId) {
    const card = await this.cardRepository.discardCard(cardId);
    if (!card) {
      throw new Error('Card not found');
    }

    const cardObject = card.toObject();
    const dataToReturn = {
      ...cardObject,
      id: cardObject._id.toString(),
    };

    const responseDto = cardResponseDtoSchema.parse(dataToReturn);
    return responseDto;
  }

  /**
   * Count cards matching filters
   * @param {Object} filters - Optional filters for counting cards
   * @returns {Promise<number>} The count of cards matching the filters
   * @throws {Error} When database operation fails
   */
  async countCards(filters = {}) {
    return await this.cardRepository.countByFilters(filters);
  }
}

export default CardService;
