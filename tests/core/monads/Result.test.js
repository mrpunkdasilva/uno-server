const Result = require('../../../src/core/monads/Result');

describe('Result Monad', () => {
  test('should create a success result', () => {
    const result = Result.ok('success');

    expect(result.ok).toBe(true);
    expect(result.value).toBe('success');
  });

  test('should create a failure result', () => {
    const error = { status: 404, message: 'Game not found' };
    const result = Result.fail(error);

    expect(result.ok).toBe(false);
    expect(result.value).toEqual(error);
  });

  test('map should transform value when success', () => {
    const result = Result.ok(2).map((x) => x * 2);

    expect(result.ok).toBe(true);
    expect(result.value).toBe(4);
  });

  test('map should not run when failure', () => {
    const result = Result.fail('error').map((x) => x * 2);

    expect(result.ok).toBe(false);
    expect(result.value).toBe('error');
  });

  test('fold should execute success function', () => {
    const result = Result.ok('ok');

    const response = result.fold(
      () => 'error',
      (value) => value,
    );

    expect(response).toBe('ok');
  });

  test('fold should execute failure function', () => {
    const result = Result.fail('fail');

    const response = result.fold(
      (error) => error,
      () => 'success',
    );

    expect(response).toBe('fail');
  });
});
