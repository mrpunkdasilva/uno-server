import cardResponseDtoSchema from '../../presentation/dtos/cardResponse.dto.js';
import { Either } from '../monads/Either.js';

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
    this.cardRepository = cardRepository;
  }

  /**
   * Converts a card document to a response DTO object.
   * @param {Object} card - The card document from repository
   * @returns {Object} Card object formatted as response DTO
   * @privat  e
   */
  _convertToResponseDto(card) {
    const cardObject = card.toObject();
    const dataToReturn = {
      ...cardObject,
      id: cardObject._id.toString(),
    };
    return cardResponseDtoSchema.parse(dataToReturn);
  }

  /**
   * Retrieves all cards from the database with optional filters
   * @param {Object} filters - Optional filters for querying cards
   * @returns {Promise<Array>} Array of all card objects formatted as response DTOs
   * @throws {Error} When database operation fails
   */
  async findAll(filters = {}) {
    const cards = await this.cardRepository.findByFilters(filters);
    return cards.map((card) => this._convertToResponseDto(card));
  }

  /**
   * Creates a new card with the provided card data
   * @param {Object} cardData - The data for creating a new card
   * @returns {Promise<Object>} The created card object formatted as response DTO
   * @throws {Error} When creation fails
   */
  async create(cardData) {
    const newCard = await this.cardRepository.create(cardData);
    return this._convertToResponseDto(newCard);
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
    return this._convertToResponseDto(card);
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
    return this._convertToResponseDto(updatedCard);
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
    return cards.map((card) => this._convertToResponseDto(card));
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
    return cards.map((card) => this._convertToResponseDto(card));
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
    return this._convertToResponseDto(card);
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

    return this._convertToResponseDto(card);
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

  /**
   * Validates if a card can be played on top of another card using Functional Programming.
   * Uses the Either Monad to encapsulate Success (Right) or Failure (Left) without throwing exceptions.
   * @param {Object} cardToPlay - The card the player wants to put down { color, value, type }
   * @param {Object} topCard - The current card on the discard pile { color, value, type }
   * @returns {Object} An Either instance (Left with error message or Right with boolean true)
   */
  canPlayCard(cardToPlay, topCard) {
    // Functional validation chain
    return Either.fromNullable(cardToPlay)
      .chain(() => Either.fromNullable(topCard))
      .map(() => true) // Just to ensure both exist before proceeding
      .chain(() => {
        // Rule 1: Wild cards can always be played
        if (cardToPlay.color === 'wild' || cardToPlay.type === 'wild') {
          return Either.right(true);
        }

        // Rule 2: Match by color
        if (cardToPlay.color === topCard.color) {
          return Either.right(true);
        }

        // Rule 3: Match by value/symbol
        if (cardToPlay.value === topCard.value) {
          return Either.right(true);
        }

        // If no rules match, return Left (Failure)
        return Either.left(
          'The card does not match the color or value of the top card.',
        );
      });
  }

  /**
   * Formats the card name for display purposes using Functor transformations.
   * * @param {Object} card - The card object
   * @param card
   * @returns {string} The formatted name or 'Unknown Card'
   */
  formatCardName(card) {
    return Either.fromNullable(card)
      .map((c) => `${c.color.toUpperCase()} ${c.value}`) // Map: Transform data safely
      .fold(
        () => 'Unknown Card', // Left handler (if card is null)
        (name) => name, // Right handler (success)
      );
  }
}

export default CardService;
