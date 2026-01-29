import CardRepository from '../../infra/repositories/card.repository.js';

class CardService {
  constructor() {
    this.cardRepository = new CardRepository();
  }

  async create(cardData) {
    return await this.cardRepository.create(cardData);
  }

  async findById(id) {
    return await this.cardRepository.findById(id);
  }

  async update(id, cardData) {
    return await this.cardRepository.update(id, cardData);
  }

  async delete(id) {
    return await this.cardRepository.delete(id);
  }

  async findAll(filters = {}) {
    return await this.cardRepository.findByFilters(filters);
  }

  async initializeGameDeck(gameId) {
    return await this.cardRepository.initializeGameDeck(gameId);
  }

  async getCardsByGame(gameId, filters = {}) {
    return await this.cardRepository.getCardsByGame(gameId, filters);
  }

  async drawCard(gameId) {
    return await this.cardRepository.drawCardFromDeck(gameId);
  }

  async discardCard(cardId) {
    return await this.cardRepository.discardCard(cardId);
  }

  async countCards(filters = {}) {
    return await this.cardRepository.countByFilters(filters);
  }
}

export default CardService;