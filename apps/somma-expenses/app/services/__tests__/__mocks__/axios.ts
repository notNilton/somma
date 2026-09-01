const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();

const mockInstance = {
  defaults: { baseURL: "" },
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  get: mockGet,
  post: mockPost,
  put: mockPut,
};

export const __mockInstance = mockInstance;

export function create() {
  return mockInstance;
}
create.defaults = mockInstance.defaults;
create.interceptors = mockInstance.interceptors;
create.get = mockGet;
create.post = mockPost;
create.put = mockPut;

export default create;