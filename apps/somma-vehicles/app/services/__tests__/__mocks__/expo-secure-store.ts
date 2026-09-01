const mockStore: Record<string, string> = {};

export const getItemAsync = jest.fn(async (key: string) => mockStore[key] ?? null);
export const setItemAsync = jest.fn(async (key: string, value: string) => {
  mockStore[key] = value;
});
export const deleteItemAsync = jest.fn(async (key: string) => {
  delete mockStore[key];
});

// Allow tests to reset the store
export function __resetStore() {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
}
