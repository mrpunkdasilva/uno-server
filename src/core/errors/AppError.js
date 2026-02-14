/**
 *
 */
class AppError extends Error {
  /**
   *
   * @param message
   * @param statusCode
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export default AppError;
