import type { Release } from "@/types/releases";

export function createMockRelease(overrides: Partial<Release> = {}): Release {
  return {
    version: "1.0.0",
    date: "2026-01-01",
    changes: ["Initial release"],
    ...overrides,
  };
}

export function createMockReleaseList(count: number = 3): Release[] {
  return Array.from({ length: count }, (_, i) =>
    createMockRelease({
      version: `1.0.${i + 1}`,
      date: `2026-0${i + 1}-01`,
      changes: [`Feature ${i + 1}`, `Bugfix ${i + 1}`],
    }),
  );
}
