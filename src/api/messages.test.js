// src/api/messages.test.js
describe('messages api', () => {
  let mockClient;
  let api;
  let axiosCreateMock;

  const loadModule = () => {
    jest.resetModules();

    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      interceptors: { response: { use: jest.fn() } }, // <- IMPORTANT
    };

    // Provide a concrete axios mock that always returns mockClient
    jest.doMock('axios', () => {
      axiosCreateMock = jest.fn(() => mockClient);
      return {
        __esModule: true,
        default: { create: axiosCreateMock },
        create: axiosCreateMock, // cover both default.create and named create
      };
    });

    api = require('./messages'); // require AFTER mocking axios
  };

  beforeEach(() => loadModule());

  test('sanity: file loaded', () => {
    expect(api).toBeTruthy();
  });

  // ... your other tests here (sendMessage, addReaction, etc.) ...
});
