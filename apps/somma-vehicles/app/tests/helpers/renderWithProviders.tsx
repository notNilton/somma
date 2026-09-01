/**
 * Test helper: renders a React component wrapped with necessary providers.
 *
 * Use this in component tests that need AuthContext, navigation, or other providers.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { AuthProvider } from "@/context/AuthContext";

interface RenderWithProvidersOptions {
  /** Wrapper components to apply around the tree */
  wrappers?: React.ComponentType<{ children: React.ReactNode }>[];
}

/**
 * Default set of providers matching the real app setup.
 */
function DefaultProviders({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

/**
 * Renders a component wrapped with the standard app providers (AuthContext, etc.).
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { wrappers = [] } = options;

  const AllProviders = wrappers.reduceRight(
    (acc: React.ComponentType<{ children: React.ReactNode }>, Wrapper: React.ComponentType<{ children: React.ReactNode }>) => {
      const Inner = acc;
      return ({ children }: { children: React.ReactNode }) => (
        <Wrapper>
          <Inner>{children}</Inner>
        </Wrapper>
      );
    },
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
  );

  // Wrap with default providers first, then custom wrappers
  const tree = (
    <DefaultProviders>
      <AllProviders>{ui}</AllProviders>
    </DefaultProviders>
  );

  return render(tree);
}

export { render };
