// utils/Result.js

/**
 * Result Functor - Encapsula operações que podem falhar
 * Implementa as leis dos Functors e adiciona utilidades práticas
 */
class Result {
  constructor(value, error = null) {
    this._value = value;
    this._error = error;
    this._isSuccess = error === null;
  }

  /**
   * Método map - Transforma o valor se for sucesso
   * @param {Function} fn - Função para transformar o valor
   * @returns {Result} Novo Result com valor transformado ou erro
   */
  map(fn) {
    if (!this._isSuccess) return this;

    try {
      const newValue = fn(this._value);
      return Result.success(newValue);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * map para operações assíncronas
   * @param {Function} fn - Função assíncrona
   * @returns {Promise<Result>}
   */
  async mapAsync(fn) {
    if (!this._isSuccess) return this;

    try {
      const newValue = await fn(this._value);
      return Result.success(newValue);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * chain (flatMap) - Para composição de Results
   * @param {Function} fn - Função que retorna um Result
   * @returns {Result}
   */
  chain(fn) {
    if (!this._isSuccess) return this;
    return fn(this._value);
  }

  /**
   * chainAsync - chain para operações assíncronas
   * @param {Function} fn - Função que retorna Promise<Result>
   * @returns {Promise<Result>}
   */
  async chainAsync(fn) {
    if (!this._isSuccess) return this;
    return await fn(this._value);
  }

  /**
   * fold - Pattern matching para extrair valor
   * @param {Function} onFailure - Handler para erro
   * @param {Function} onSuccess - Handler para sucesso
   * @returns {*}
   */
  fold(onFailure, onSuccess) {
    if (!this._isSuccess) {
      return onFailure(this._error);
    }
    return onSuccess(this._value);
  }

  /**
   * tap - Efeito colateral apenas se sucesso
   * @param {Function} fn - Função com side effect
   * @returns {Result} Mesmo Result (não transforma)
   */
  tap(fn) {
    if (this._isSuccess) {
      try {
        fn(this._value);
      } catch (error) {
        // Ignora erros no tap (são logs normalmente)
      }
    }
    return this;
  }

  /**
   * catch - Adiciona handler de erro
   * @param {Function} handler - Função que processa erro
   * @returns {Result} Result com possível recuperação
   */
  catch(handler) {
    if (this._isSuccess) return this;

    try {
      const recovered = handler(this._error);
      return Result.success(recovered);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * getOrElse - Valor default se erro
   * @param {*} defaultValue - Valor padrão
   * @returns {*}
   */
  getOrElse(defaultValue) {
    return this._isSuccess ? this._value : defaultValue;
  }

  /**
   * getOrThrow - Extrai valor ou lança erro
   * @returns {*}
   * @throws {Error} Se for falha
   */
  getOrThrow() {
    if (!this._isSuccess) {
      throw this._error;
    }
    return this._value;
  }

  // Propriedades de leitura
  get isSuccess() {
    return this._isSuccess;
  }
  get isFailure() {
    return !this._isSuccess;
  }
  get value() {
    return this._value;
  }
  get error() {
    return this._error;
  }

  static success(value) {
    return new Result(value, null);
  }

  static failure(error) {
    return new Result(null, error);
  }

  /**
   * fromPromise - Converte Promise para Result
   * @param {Promise} promise
   * @returns {Promise<Result>}
   */
  static async fromPromise(promise) {
    try {
      const value = await promise;
      return Result.success(value);
    } catch (error) {
      return Result.failure(error);
    }
  }

  /**
   * fromTry - Executa função que pode lançar exceção
   * @param {Function} fn - Função que pode lançar erro
   * @returns {Result}
   */
  static fromTry(fn) {
    try {
      const value = fn();
      return Result.success(value);
    } catch (error) {
      return Result.failure(error);
    }
  }
}

export default Result;
