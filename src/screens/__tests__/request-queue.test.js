import { requestQueue } from '../requestQueue';

describe('RequestQueue', () => {
  afterEach(() => {
    requestQueue.clear();
  });

  it('processes requests sequentially', async () => {
    const order = [];
    const makeRequest = (id) => () => new Promise((resolve) => {
      setTimeout(() => {
        order.push(id);
        resolve(id);
      }, 10);
    });

    const results = await Promise.all([
      requestQueue.add(makeRequest(1)),
      requestQueue.add(makeRequest(2)),
      requestQueue.add(makeRequest(3)),
    ]);

    expect(order).toEqual([1, 2, 3]);
    expect(results).toEqual([1, 2, 3]);
  });

  it('retries requests on 409 error', async () => {
    jest.useFakeTimers();
    let attempt = 0;
    const request = jest.fn().mockImplementation(() => {
      attempt += 1;
      if (attempt === 1) {
        const error = new Error('Conflict');
        error.response = { status: 409 };
        return Promise.reject(error);
      }
      return Promise.resolve('ok');
    });

    const promise = requestQueue.add(request);
    jest.runAllTimers();
    await expect(promise).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
