/**
 * @class CardActionStrategy
 * @description Base class for card action strategies. This class defines the interface
 * that all concrete card action strategies must implement.
 * It is not meant to be instantiated directly.
 */
class CardActionStrategy {
  /**
   * Determines if the action can be executed.
   * This method can be overridden by subclasses to add specific validation logic.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   * @param {Card} gameContext.card - The card that was played.
   * @param _gameContext
   * @returns {boolean} - True if the action can be executed, otherwise false.
   */
  canExecute() {
    return true;
  }

  /**
   * Executes the card's action.
   * This method must be overridden by subclasses.
   * @param {object} gameContext - The context of the game.
   * @param {Game} gameContext.game - The current game state.
   * @param {Card} gameContext.card - The card that was played.
   * @param _gameContext
   * @throws {Error} if not implemented in the subclass.
   */
  execute() {
    throw new Error('The "execute" method must be implemented by subclasses.');
  }
}

export { CardActionStrategy };
