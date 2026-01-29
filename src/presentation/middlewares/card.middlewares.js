const cardMiddleware = {
  validateCard: (req, res, next) => {
    const { color, value, gameId } = req.body;

    const validColors = ['red', 'blue', 'green', 'yellow', 'black'];
    const validValues = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'skip',
      'reverse',
      'draw2',
      'wild',
      'wild_draw4',
    ];

    const specialCards = ['wild', 'wild_draw4'];

    const errors = [];

    if (!color) {
      errors.push('Color is required');
    } else if (!validColors.includes(color)) {
      errors.push(`Invalid color. Must be one of: ${validColors.join(', ')}`);
    }

    if (!value) {
      errors.push('Value is required');
    } else if (!validValues.includes(value)) {
      errors.push(`Invalid value. Must be one of: ${validValues.join(', ')}`);
    }

    if (!gameId) {
      errors.push('gameId is required');
    } else if (typeof gameId !== 'string') {
      errors.push('gameId must be a string');
    }

    if (color === 'black' && !specialCards.includes(value)) {
      errors.push('Black cards can only have values: wild, wild_draw4');
    }

    if (color !== 'black' && specialCards.includes(value)) {
      errors.push('Special cards (wild, wild_draw4) must be black color');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  },

  validateCardId: (req, res, next) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Card ID is required',
      });
    }

    if (isNaN(parseInt(id)) || parseInt(id) <= 0) {
      return res.status(400).json({
        error: 'Card ID must be a positive number',
      });
    }

    next();
  },

  validateQueryParams: (req, res, next) => {
    const { color, gameId, value, limit } = req.query;

    if (color && typeof color !== 'string') {
      return res.status(400).json({
        error: 'Color filter must be a string',
      });
    }

    if (gameId && typeof gameId !== 'string') {
      return res.status(400).json({
        error: 'gameId filter must be a string',
      });
    }

    if (value && typeof value !== 'string') {
      return res.status(400).json({
        error: 'Value filter must be a string',
      });
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum <= 0 || limitNum > 100) {
        return res.status(400).json({
          error: 'Limit must be a number between 1 and 100',
        });
      }
    }

    next();
  },

  logRequest: (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  },
};

export default cardMiddleware;
