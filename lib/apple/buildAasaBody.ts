/**
 * Apple App Site Association (Password AutoFill / Universal Links).
 * @see https://developer.apple.com/documentation/xcode/supporting-associated-domains
 */
export function buildAppleAppSiteAssociationBody(appIds: string[]): Record<string, unknown> | null {
  const apps = appIds.map((id) => id.trim()).filter(Boolean)
  if (apps.length === 0) return null

  return {
    applinks: {
      apps: [],
      details: apps.map((appID) => ({
        appID,
        paths: ["/auth", "/auth/*", "/"],
      })),
    },
    webcredentials: {
      apps,
    },
  }
}
