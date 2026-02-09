import { describe, it, expect, jest } from '@jest/globals';
import { Result, ResultAsync } from '../../../src/core/utils/Result.js';

describe('Result', () => {
  it('should create a successful Result with Result.success', () => {
    const successResult = Result.success(42);
    expect(successResult.isSuccess).toBe(true);
    expect(successResult.isFailure).toBe(false);
    expect(successResult.value).toBe(42);
    expect(successResult.error).toBeNull();
  });

  it('should create a failed Result with Result.failure from an Error object', () => {
    const error = new Error('Something went wrong');
    const failureResult = Result.failure(error);
    expect(failureResult.isSuccess).toBe(false);
    expect(failureResult.isFailure).toBe(true);
    expect(failureResult.value).toBeNull();
    expect(failureResult.error).toBe(error);
  });

  it('should create a failed Result with Result.failure from a string', () => {
    const failureResult = Result.failure('Something went wrong');
    expect(failureResult.isSuccess).toBe(false);
    expect(failureResult.isFailure).toBe(true);
    expect(failureResult.value).toBeNull();
    expect(failureResult.error).toBeInstanceOf(Error);
    expect(failureResult.error.message).toBe('Something went wrong');
  });

  describe('map', () => {
    it('should apply the function to the value if successful', () => {
      const result = Result.success(10).map((x) => x * 2);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should not apply the function if failed', () => {
      const error = new Error('Failed');
      const result = Result.failure(error).map((x) => x * 2);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should catch errors thrown by the map function', () => {
      const error = new Error('Map error');
      const result = Result.success(10).map(() => {
        throw error;
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('chain', () => {
    it('should apply the function that returns another Result if successful', () => {
      const result = Result.success(10)
        .chain((x) => Result.success(x * 2))
        .chain((y) => Result.success(y + 1));
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(21);
    });

    it('should not apply the function if failed', () => {
      const error = new Error('Failed');
      const result = Result.failure(error).chain((x) => Result.success(x * 2));
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should catch errors thrown by the chain function', () => {
      const error = new Error('Chain error');
      const result = Result.success(10).chain(() => {
        throw error;
      });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('fold', () => {
    it('should execute onSuccess for successful Result', () => {
      const result = Result.success(10);
      const output = result.fold(
        (err) => `Error: ${err.message}`,
        (val) => `Success: ${val}`,
      );
      expect(output).toBe('Success: 10');
    });

    it('should execute onFailure for failed Result', () => {
      const error = new Error('Failed');
      const result = Result.failure(error);
      const output = result.fold(
        (err) => `Error: ${err.message}`,
        (val) => `Success: ${val}`,
      );
      expect(output).toBe('Error: Failed');
    });
  });

  describe('tap', () => {
    it('should execute the function if successful and return the same Result', () => {
      const fn = jest.fn();
      const result = Result.success(10).tap(fn);
      expect(fn).toHaveBeenCalledWith(10);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should not execute the function if failed', () => {
      const fn = jest.fn();
      const error = new Error('Failed');
      Result.failure(error).tap(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should not change the result if the tap function throws an error', () => {
      const error = new Error('Tap error');
      const result = Result.success(10).tap(() => { throw error; });
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });
  });

  describe('tapError', () => {
    it('should execute the function if failed and return the same Result', () => {
      const fn = jest.fn();
      const error = new Error('Failed');
      const result = Result.failure(error).tapError(fn);
      expect(fn).toHaveBeenCalledWith(error);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should not execute the function if successful', () => {
      const fn = jest.fn();
      Result.success(10).tapError(fn);
      expect(fn).not.toHaveBeenCalled();
    });

    it('should not change the result if the tapError function throws an error', () => {
      const error = new Error('TapError error');
      const originalError = new Error('Original error');
      const result = Result.failure(originalError).tapError(() => { throw error; });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(originalError);
    });
  });

  describe('catch', () => {
    it('should recover from failure if handler returns a value', () => {
      const error = new Error('Failed');
      const result = Result.failure(error).catch((err) => `Recovered from ${err.message}`);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('Recovered from Failed');
    });

    it('should propagate success if not failed', () => {
      const result = Result.success(10).catch(() => 'Recovered');
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should propagate new failure if handler throws error', () => {
      const originalError = new Error('Original');
      const newError = new Error('New error');
      const result = Result.failure(originalError).catch(() => { throw newError; });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(newError);
    });
  });

  describe('mapError', () => {
    it('should transform the error if failed', () => {
      const originalError = new Error('Failed');
      const newError = new Error('Transformed');
      const result = Result.failure(originalError).mapError(() => newError);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(newError);
    });

    it('should not do anything if successful', () => {
      const result = Result.success(10).mapError(() => new Error('Transformed'));
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should propagate new failure if mapper throws error', () => {
      const originalError = new Error('Original');
      const mapError = new Error('Map error');
      const result = Result.failure(originalError).mapError(() => { throw mapError; });
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(mapError);
    });
  });

  describe('getOrElse', () => {
    it('should return value if successful', () => {
      const result = Result.success(10).getOrElse(0);
      expect(result).toBe(10);
    });

    it('should return default value if failed', () => {
      const result = Result.failure('Error').getOrElse(0);
      expect(result).toBe(0);
    });

    it('should execute default function if failed', () => {
      const result = Result.failure(new Error('Error')).getOrElse((err) => `Default: ${err.message}`);
      expect(result).toBe('Default: Error');
    });
  });

  describe('getOrThrow', () => {
    it('should return value if successful', () => {
      const result = Result.success(10).getOrThrow();
      expect(result).toBe(10);
    });

    it('should throw error if failed', () => {
      const error = new Error('Failed');
      expect(() => Result.failure(error).getOrThrow()).toThrow(error);
    });
  });

  describe('fromPromise', () => {
    it('should return a successful Result from a resolved promise', async () => {
      const promise = Promise.resolve(42);
      const result = await Result.fromPromise(promise);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should return a failed Result from a rejected promise', async () => {
      const error = new Error('Promise rejected');
      const promise = Promise.reject(error);
      const result = await Result.fromPromise(promise);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('fromAsync', () => {
    it('should return a successful Result from a successful async function', async () => {
      const fn = async () => 42;
      const result = await Result.fromAsync(fn);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should return a failed Result from a failed async function', async () => {
      const error = new Error('Async function failed');
      const fn = async () => {
        throw error;
      };
      const result = await Result.fromAsync(fn);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });
});

describe('ResultAsync', () => {
  describe('map', () => {
    it('should apply the function to the value if successful (sync fn)', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .map((x) => x * 2)
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should apply the function to the value if successful (async fn)', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .map(async (x) => Promise.resolve(x * 2))
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(20);
    });

    it('should not apply the function if failed', async () => {
      const error = new Error('Failed');
      const result = await new ResultAsync(Promise.resolve(Result.failure(error)))
        .map((x) => x * 2)
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should catch errors thrown by the map function (sync)', async () => {
      const error = new Error('Map error');
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .map(() => {
          throw error;
        })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should catch errors thrown by the map function (async)', async () => {
      const error = new Error('Map error');
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .map(async () => {
          throw error;
        })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('chain', () => {
    it('should apply the function that returns another Result if successful (sync fn)', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .chain((x) => Result.success(x * 2))
        .chain((y) => Result.success(y + 1))
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(21);
    });

    it('should apply the function that returns another Result if successful (async fn)', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .chain(async (x) => Promise.resolve(Result.success(x * 2)))
        .chain((y) => Result.success(y + 1))
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(21);
    });

    it('should not apply the function if failed', async () => {
      const error = new Error('Failed');
      const result = await new ResultAsync(Promise.resolve(Result.failure(error)))
        .chain((x) => Result.success(x * 2))
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should catch errors thrown by the chain function (sync)', async () => {
      const error = new Error('Chain error');
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .chain(() => {
          throw error;
        })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should catch errors thrown by the chain function (async)', async () => {
      const error = new Error('Chain error');
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .chain(async () => {
          throw error;
        })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('fold', () => {
    it('should execute onSuccess for successful ResultAsync', async () => {
      const resultAsync = new ResultAsync(Promise.resolve(Result.success(10)));
      const output = await resultAsync.fold(
        (err) => `Error: ${err.message}`,
        (val) => `Success: ${val}`,
      );
      expect(output).toBe('Success: 10');
    });

    it('should execute onFailure for failed ResultAsync', async () => {
      const error = new Error('Failed');
      const resultAsync = new ResultAsync(Promise.resolve(Result.failure(error)));
      const output = await resultAsync.fold(
        (err) => `Error: ${err.message}`,
        (val) => `Success: ${val}`,
      );
      expect(output).toBe('Error: Failed');
    });
  });

  describe('tap', () => {
    it('should execute the function if successful and return the same ResultAsync', async () => {
      const fn = jest.fn();
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .tap(fn)
        .toResult();
      expect(fn).toHaveBeenCalledWith(10);
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should not execute the function if failed', async () => {
      const fn = jest.fn();
      const error = new Error('Failed');
      await new ResultAsync(Promise.resolve(Result.failure(error))).tap(fn).toResult();
      expect(fn).not.toHaveBeenCalled();
    });

    it('should not change the result if the tap function throws an error (sync)', async () => {
      const error = new Error('Tap error');
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .tap(() => { throw error; })
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should not change the result if the tap function throws an error (async)', async () => {
      const error = new Error('Tap error');
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .tap(async () => { throw error; })
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });
  });

  describe('tapError', () => {
    it('should execute the function if failed and return the same ResultAsync', async () => {
      const fn = jest.fn();
      const error = new Error('Failed');
      const result = await new ResultAsync(Promise.resolve(Result.failure(error)))
        .tapError(fn)
        .toResult();
      expect(fn).toHaveBeenCalledWith(error);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should not execute the function if successful', async () => {
      const fn = jest.fn();
      await new ResultAsync(Promise.resolve(Result.success(10))).tapError(fn).toResult();
      expect(fn).not.toHaveBeenCalled();
    });

    it('should not change the result if the tapError function throws an error (sync)', async () => {
      const error = new Error('TapError error');
      const originalError = new Error('Original error');
      const result = await new ResultAsync(Promise.resolve(Result.failure(originalError)))
        .tapError(() => { throw error; })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(originalError);
    });

    it('should not change the result if the tapError function throws an error (async)', async () => {
      const error = new Error('TapError error');
      const originalError = new Error('Original error');
      const result = await new ResultAsync(Promise.resolve(Result.failure(originalError)))
        .tapError(async () => { throw error; })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(originalError);
    });
  });

  describe('catch', () => {
    it('should recover from failure if handler returns a value (sync)', async () => {
      const error = new Error('Failed');
      const result = await new ResultAsync(Promise.resolve(Result.failure(error)))
        .catch((err) => `Recovered from ${err.message}`)
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('Recovered from Failed');
    });

    it('should recover from failure if handler returns a value (async)', async () => {
      const error = new Error('Failed');
      const result = await new ResultAsync(Promise.resolve(Result.failure(error)))
        .catch(async (err) => Promise.resolve(`Recovered from ${err.message}`))
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe('Recovered from Failed');
    });

    it('should propagate success if not failed', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .catch(() => 'Recovered')
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should propagate new failure if handler throws error (sync)', async () => {
      const originalError = new Error('Original');
      const newError = new Error('New error');
      const result = await new ResultAsync(Promise.resolve(Result.failure(originalError)))
        .catch(() => { throw newError; })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(newError);
    });

    it('should propagate new failure if handler throws error (async)', async () => {
      const originalError = new Error('Original');
      const newError = new Error('New error');
      const result = await new ResultAsync(Promise.resolve(Result.failure(originalError)))
        .catch(async () => { throw newError; })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(newError);
    });
  });

  describe('mapError', () => {
    it('should transform the error if failed', async () => {
      const originalError = new Error('Failed');
      const newError = new Error('Transformed');
      const result = await new ResultAsync(Promise.resolve(Result.failure(originalError)))
        .mapError(() => newError)
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(newError);
    });

    it('should not do anything if successful', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .mapError(() => new Error('Transformed'))
        .toResult();
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(10);
    });

    it('should propagate new failure if mapper throws error', async () => {
      const originalError = new Error('Original');
      const mapError = new Error('Map error');
      const result = await new ResultAsync(Promise.resolve(Result.failure(originalError)))
        .mapError(() => { throw mapError; })
        .toResult();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe(mapError);
    });
  });

  describe('getOrElse', () => {
    it('should return value if successful', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .getOrElse(0);
      expect(result).toBe(10);
    });

    it('should return default value if failed', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.failure('Error')))
        .getOrElse(0);
      expect(result).toBe(0);
    });

    it('should execute default function if failed', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.failure(new Error('Error'))))
        .getOrElse((err) => `Default: ${err.message}`);
      expect(result).toBe('Default: Error');
    });
  });

  describe('getOrThrow', () => {
    it('should return value if successful', async () => {
      const result = await new ResultAsync(Promise.resolve(Result.success(10)))
        .getOrThrow();
      expect(result).toBe(10);
    });

    it('should throw error if failed', async () => {
      const error = new Error('Failed');
      const resultAsync = new ResultAsync(Promise.resolve(Result.failure(error)));
      await expect(resultAsync.getOrThrow()).rejects.toThrow(error);
    });
  });

  describe('toResult', () => {
    it('should return the wrapped Result', async () => {
      const successResult = Result.success(42);
      const resultAsync = new ResultAsync(Promise.resolve(successResult));
      const result = await resultAsync.toResult();
      expect(result).toBe(successResult);
    });
  });
});
