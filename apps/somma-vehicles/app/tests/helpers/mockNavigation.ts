/**
 * Test helpers for mocking navigation.
 */
import { router } from "expo-router";

export function mockRouter() {
  return {
    push: jest.spyOn(router, "push").mockImplementation(jest.fn()),
    replace: jest.spyOn(router, "replace").mockImplementation(jest.fn()),
    back: jest.spyOn(router, "back").mockImplementation(jest.fn()),
  };
}

export function mockNavigation() {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    canGoBack: jest.fn(() => true),
    getId: jest.fn(),
    getState: jest.fn(),
    getParent: jest.fn(),
  };
}

/**
 * Mock useLocalSearchParams for expo-router
 */
export function mockLocalSearchParams<T extends Record<string, string>>(params: T) {
  jest.mock("expo-router", () => ({
    ...jest.requireActual("expo-router"),
    useLocalSearchParams: () => params,
  }));
}
