import CardRepository from '../../infra/repositories/card.repository.js';

/**
 *
 */
class CardService {
  /**
   *
   */
  constructor() {
    this.cardRepository = new CardRepository();
  }

  /**
   *
   * @param cardData
   */
  async create(cardData) {
    return await this.cardRepository.create(cardData);
  }

  /**
   *
   * @param id
   */
  async findById(id) {
    return await this.cardRepository.findById(id);
  }

  /**
   *
   * @param id
   * @param cardData
   */
  async update(id, cardData) {
    return await this.cardRepository.update(id, cardData);
  }

  /**
   *
   * @param id
   */
  async delete(id) {
    return await this.cardRepository.delete(id);
  }

  /**
   *
   * @param filters
   */
  async findAll(filters = {}) {
    return await this.cardRepository.findByFilters(filters);
  }

  /**
   *
   * @param gameId
   */
  async initializeGameDeck(gameId) {
    return await this.cardRepository.initializeGameDeck(gameId);
  }

  /**
   *
   * @param gameId
   * @param filters
   */
  async getCardsByGame(gameId, filters = {}) {
    return await this.cardRepository.getCardsByGame(gameId, filters);
  }

  /**
   *
   * @param gameId
   */
  async drawCard(gameId) {
    return await this.cardRepository.drawCardFromDeck(gameId);
  }

  /**
   *
   * @param cardId
   */
  async discardCard(cardId) {
    return await this.cardRepository.discardCard(cardId);
  }

  /**
   *
   * @param filters
   */
  async countCards(filters = {}) {
    return await this.cardRepository.countByFilters(filters);
  }
}

export default CardService;
