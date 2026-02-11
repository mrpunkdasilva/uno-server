/**
 * Controller class for handling player-related HTTP requests.
 * Manages player CRUD operations including creation, retrieval, updating, and deletion.
 */
class PlayerController {
  /**
   * Initializes the PlayerController with a PlayerService instance.
   * Dependency Injection applied here (DIP).
   * @param {PlayerService} playerService - The injected player service
   */
  constructor(playerService) {
    this.playerService = playerService;
  }

  /**
   * Retrieves all players from the database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and players data or error message
   */
  async getAllPlayers(req, res) {
    const result = await this.playerService.getAllPlayers();

    result.fold(
      (error) => {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      },
      (players) => {
        res.status(200).json({
          success: true,
          data: players,
        });
      },
    );
  }

  /**
   * Creates a new player with the provided player data
   * @param {Object} req - Express request object containing player creation data in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and created player data or error message
   */
  async createPlayer(req, res) {
    const { email, password, username } = req.body;
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: 'Email, password and username are required',
      });
    }

    const result = await this.playerService.createPlayer(req.body);

    result.fold(
      (error) => {
        const status = error.message.includes('already exists') ? 409 : 400;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (player) => {
        res.status(201).json({
          success: true,
          data: player,
        });
      },
    );
  }

  /**
   * Retrieves a player by their ID
   * @param {Object} req - Express request object containing player ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and player data or error message
   */
  async getPlayerById(req, res) {
    const result = await this.playerService.getPlayerById(req.params.id);

    result.fold(
      (error) => {
        const status = error.message === 'Player not found' ? 404 : 500;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (player) => {
        res.status(200).json({
          success: true,
          data: player,
        });
      },
    );
  }

  /**
   * Retrieves a player by their email
   * @param {Object} req - Express request object containing player email in query
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and player data or error message
   */
  async getPlayerByEmail(req, res) {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const result = await this.playerService.getPlayerByEmail(email);

    result.fold(
      (error) => {
        const status = error.message === 'Player not found' ? 404 : 500;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (player) => {
        res.status(200).json({
          success: true,
          data: player,
        });
      },
    );
  }

  /**
   * Retrieves a player by their username
   * @param {Object} req - Express request object containing player username in query
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and player data or error message
   */
  async getPlayerByUsername(req, res) {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const result = await this.playerService.getPlayerByUsername(username);

    result.fold(
      (error) => {
        const status = error.message === 'Player not found' ? 404 : 500;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (player) => {
        res.status(200).json({
          success: true,
          data: player,
        });
      },
    );
  }

  /**
   * Updates an existing player with new data
   * @param {Object} req - Express request object containing player ID in params and update data in body
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and updated player data or error message
   */
  async updatePlayer(req, res) {
    const result = await this.playerService.updatePlayer(
      req.params.id,
      req.body,
    );

    result.fold(
      (error) => {
        let status = 400;
        if (error.message === 'Player not found') {
          status = 404;
        } else if (error.message.includes('already in use')) {
          status = 409;
        }
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      (player) => {
        res.status(200).json({
          success: true,
          data: player,
        });
      },
    );
  }

  /**
   * Deletes a player by their ID
   * @param {Object} req - Express request object containing player ID in params
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response with success status and deletion message or error message
   */
  async deletePlayer(req, res) {
    const result = await this.playerService.deletePlayer(req.params.id);

    result.fold(
      (error) => {
        const status = error.message === 'Player not found' ? 404 : 500;
        res.status(status).json({
          success: false,
          message: error.message,
        });
      },
      () => {
        res.status(200).json({
          success: true,
          message: 'Player deleted successfully',
        });
      },
    );
  }
}

export default PlayerController;
