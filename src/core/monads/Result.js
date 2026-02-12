/**
 *
 */
class Result {
  /**
   *
   * @param ok
   * @param value
   */
  constructor(ok, value) {
    this.ok = ok;
    this.value = value;
  }

  /**
   *
   * @param value
   */
  static ok(value) {
    return new Result(true, value);
  }

  /**
   *
   * @param error
   */
  static fail(error) {
    return new Result(false, error);
  }

  /**
   *
   * @param fn
   */
  map(fn) {
    return this.ok ? Result.ok(fn(this.value)) : this;
  }

  /**
   *
   * @param onFail
   * @param onSuccess
   */
  fold(onFail, onSuccess) {
    return this.ok ? onSuccess(this.value) : onFail(this.value);
  }
}

module.exports = Result;
