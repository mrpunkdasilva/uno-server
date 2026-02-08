/**
 * Implementation of the Either Monad for functional error handling.
 * Represents a value that can be one of two types: Left (Failure) or Right (Success).
 */

/**
 * Represents the Failure path of the Either Monad.
 */
class Left {
  /**
   * Creates an instance of Left.
   * @param {any} value - The failure value or error message.
   */
  constructor(value) {
    this.value = value;
  }

  /**
   * Ignores the transformation function because this is the Failure state.
   * @returns {Left} Returns the current Left instance without changes.
   */
  map() {
    return this;
  }

  /**
   * Ignores the chain function because this is the Failure state.
   * @returns {Left} Returns the current Left instance.
   */
  chain() {
    return this;
  }

  /**
   * Executes the failure handler (first function).
   * @param {Function} f - The function to handle the failure value.
   * @returns {any} The result of the failure handler.
   */
  fold(f) {
    // Note: The second argument (g) is removed to avoid "no-unused-vars" error
    return f(this.value);
  }
}

/**
 * Represents the Success path of the Either Monad.
 */
class Right {
  /**
   * Creates an instance of Right.
   * @param {any} value - The success value.
   */
  constructor(value) {
    this.value = value;
  }

  /**
   * Applies a transformation function to the value inside Right.
   * @param {Function} fn - The function to transform the value.
   * @returns {Right} A new Right instance containing the transformed value.
   */
  map(fn) {
    return new Right(fn(this.value));
  }

  /**
   * Chains a function that returns another Either Monad.
   * @param {Function} fn - The function that returns an Either.
   * @returns {any} The result of the function applied to the value.
   */
  chain(fn) {
    return fn(this.value);
  }

  /**
   * Executes the success handler (second function).
   * @param {Function} f - The failure handler (ignored).
   * @param {Function} g - The success handler.
   * @returns {any} The result of the success handler.
   */
  fold(f, g) {
    return g(this.value);
  }
}

/**
 * Helper object to create Either instances.
 */
export const Either = {
  /**
   * Creates a Left (Failure) instance.
   * @param {any} val - The failure value.
   * @returns {Left} A new Left instance.
   */
  left: (val) => new Left(val),

  /**
   * Creates a Right (Success) instance.
   * @param {any} val - The success value.
   * @returns {Right} A new Right instance.
   */
  right: (val) => new Right(val),

  /**
   * Creates an Either instance from a nullable value.
   * Returns Left if null/undefined, otherwise Right.
   * @param {any} val - The value to check.
   * @returns {Left|Right} A Left or Right instance.
   */
  fromNullable: (val) =>
    val === null || val === undefined ? new Left(val) : new Right(val),
};
