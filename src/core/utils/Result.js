/**
 * Result Functor - Encapsula operações que podem falhar
 * Implementa as leis dos Functors e adiciona utilidades práticas
 * Suporta encadeamento elegante de operações síncronas e assíncronas
 */
class Result {
  /**
   * Cria uma nova instância de Result
   * @param {*} value - O valor de sucesso
   * @param {Error|null} error - O erro, ou null para sucesso
   */
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
   * chain (flatMap) - Para composição de Results
   * @param {Function} fn - Função que retorna um Result
   * @returns {Result}
   */
  chain(fn) {
    if (!this._isSuccess) return this;

    try {
      return fn(this._value);
    } catch (error) {
      return Result.failure(error);
    }
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
   * tapError - Efeito colateral apenas se falha
   * @param {Function} fn - Função com side effect
   * @returns {Result} Mesmo Result (não transforma)
   */
  tapError(fn) {
    if (this._isSuccess) return this;

    try {
      fn(this._error);
    } catch (error) {
      // Ignora erros no tapError
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
   * mapError - Transforma o erro se houver falha
   * @param {Function} fn - Função para transformar o erro
   * @returns {Result}
   */
  mapError(fn) {
    if (this._isSuccess) return this;

    try {
      const newError = fn(this._error);
      return Result.failure(newError);
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
    if (this._isSuccess) return this._value;
    return typeof defaultValue === 'function'
      ? defaultValue(this._error)
      : defaultValue;
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

  /**
   * Converte para ResultAsync para operações assíncronas encadeadas
   * @returns {ResultAsync}
   */
  toAsync() {
    return new ResultAsync(Promise.resolve(this));
  }

  /**
   * Indica se o Result é um sucesso
   * @returns {boolean}
   */
  get isSuccess() {
    return this._isSuccess;
  }

  /**
   * Indica se o Result é uma falha
   * @returns {boolean}
   */
  get isFailure() {
    return !this._isSuccess;
  }

  /**
   * Obtém o valor de sucesso
   * @returns {*}
   */
  get value() {
    return this._value;
  }

  /**
   * Obtém o erro
   * @returns {Error|null}
   */
  get error() {
    return this._error;
  }

  /**
   * Cria um Result de sucesso
   * @param {*} value - O valor de sucesso
   * @returns {Result}
   */
  static success(value) {
    return new Result(value, null);
  }

  /**
   * Cria um Result de falha
   * @param {Error|string} error - O erro
   * @returns {Result}
   */
  static failure(error) {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    return new Result(null, errorObj);
  }

  /**
   * fromPromise - Converte Promise para Result
   * @param {Promise} promise - A Promise a converter
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
   * fromAsync - Executa função assíncrona que pode lançar exceção
   * @param {Function} fn - Função assíncrona que pode lançar erro
   * @returns {Promise<Result>}
   */
  static async fromAsync(fn) {
    try {
      const value = await fn();
      return Result.success(value);
    } catch (error) {
      return Result.failure(error);
    }
  }
}

/**
 * ResultAsync - Encapsula uma Promise<Result> para permitir encadeamento elegante
 * Detecta automaticamente se funções retornam valores síncronos ou assíncronos
 */
class ResultAsync {
  /**
   * Cria uma nova instância de ResultAsync
   * @param {Promise<Result>} promiseResult - A Promise que resolve para um Result
   */
  constructor(promiseResult) {
    this._promise = Promise.resolve(promiseResult);
  }

  /**
   * map - Transforma o valor se for sucesso
   * Detecta automaticamente se a função é síncrona ou assíncrona
   * @param {Function} fn - Função para transformar o valor
   * @returns {ResultAsync}
   */
  map(fn) {
    const promise = this._promise.then((result) => {
      if (!result.isSuccess) return result;

      try {
        const newValue = fn(result.value);

        // Se retornar Promise, aguarda
        if (newValue instanceof Promise) {
          return newValue
            .then((val) => Result.success(val))
            .catch((error) => Result.failure(error));
        }

        return Result.success(newValue);
      } catch (error) {
        return Result.failure(error);
      }
    });

    return new ResultAsync(promise);
  }

  /**
   * chain (flatMap) - Para composição de Results
   * Detecta automaticamente se a função retorna Promise<Result> ou Result
   * @param {Function} fn - Função que retorna Result ou Promise<Result>
   * @returns {ResultAsync}
   */
  chain(fn) {
    const promise = this._promise.then((result) => {
      if (!result.isSuccess) return result;

      try {
        const newResult = fn(result.value);

        // Se retornar Promise, aguarda
        if (newResult instanceof Promise) {
          return newResult.catch((error) => Result.failure(error));
        }

        return newResult;
      } catch (error) {
        return Result.failure(error);
      }
    });

    return new ResultAsync(promise);
  }

  /**
   * tap - Efeito colateral apenas se sucesso
   * Detecta automaticamente se a função é síncrona ou assíncrona
   * @param {Function} fn - Função com side effect
   * @returns {ResultAsync}
   */
  tap(fn) {
    const promise = this._promise.then((result) => {
      if (!result.isSuccess) return result;

      try {
        const effectResult = fn(result.value);

        // Se retornar Promise, aguarda
        if (effectResult instanceof Promise) {
          return effectResult.then(() => result).catch(() => result);
        }

        return result;
      } catch (error) {
        // Ignora erros no tap
        return result;
      }
    });

    return new ResultAsync(promise);
  }

  /**
   * tapError - Efeito colateral apenas se falha
   * @param {Function} fn - Função com side effect
   * @returns {ResultAsync}
   */
  tapError(fn) {
    const promise = this._promise.then((result) => {
      if (result.isSuccess) return result;

      try {
        const effectResult = fn(result.error);

        // Se retornar Promise, aguarda
        if (effectResult instanceof Promise) {
          return effectResult.then(() => result).catch(() => result);
        }

        return result;
      } catch (error) {
        // Ignora erros no tapError
        return result;
      }
    });

    return new ResultAsync(promise);
  }

  /**
   * catch - Adiciona handler de erro
   * Detecta automaticamente se a função é síncrona ou assíncrona
   * @param {Function} handler - Função que processa erro
   * @returns {ResultAsync}
   */
  catch(handler) {
    const promise = this._promise.then((result) => {
      if (result.isSuccess) return result;

      try {
        const recovered = handler(result.error);

        // Se retornar Promise, aguarda
        if (recovered instanceof Promise) {
          return recovered
            .then((val) => Result.success(val))
            .catch((error) => Result.failure(error));
        }

        return Result.success(recovered);
      } catch (error) {
        return Result.failure(error);
      }
    });

    return new ResultAsync(promise);
  }

  /**
   * mapError - Transforma o erro se houver falha
   * @param {Function} fn - Função para transformar o erro
   * @returns {ResultAsync}
   */
  mapError(fn) {
    const promise = this._promise.then((result) => {
      if (result.isSuccess) return result;

      try {
        const newError = fn(result.error);
        return Result.failure(newError);
      } catch (error) {
        return Result.failure(error);
      }
    });

    return new ResultAsync(promise);
  }

  /**
   * fold - Pattern matching para extrair valor
   * @param {Function} onFailure - Handler para erro
   * @param {Function} onSuccess - Handler para sucesso
   * @returns {Promise<*>}
   */
  async fold(onFailure, onSuccess) {
    const result = await this._promise;

    if (result.isSuccess) {
      return onSuccess(result.value);
    }

    return onFailure(result.error);
  }

  /**
   * getOrElse - Valor default se erro
   * @param {*} defaultValue - Valor padrão
   * @returns {Promise<*>}
   */
  async getOrElse(defaultValue) {
    const result = await this._promise;

    if (result.isSuccess) return result.value;

    return typeof defaultValue === 'function'
      ? defaultValue(result.error)
      : defaultValue;
  }

  /**
   * getOrThrow - Extrai valor ou lança erro
   * @returns {Promise<*>}
   * @throws {Error} Se for falha
   */
  async getOrThrow() {
    const result = await this._promise;

    if (!result.isSuccess) {
      throw result.error;
    }

    return result.value;
  }

  /**
   * Aguarda a Promise<Result> e retorna o Result
   * @returns {Promise<Result>}
   */
  async toResult() {
    return this._promise;
  }
}

export { Result, ResultAsync };
export default Result;
