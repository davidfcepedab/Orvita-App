import rawTokens from "./ORBITA_DESIGN_TOKENS.json"

export type ThemeName = "arctic" | "carbon" | "sand"
export type LayoutMode = "compact" | "balanced" | "zen"

type DesignTokens = typeof rawTokens

type ThemeColors = DesignTokens["colors"][ThemeName]

type SemanticColors = DesignTokens["semantic"]

type FlatColorTokenKey = keyof ThemeColors

type TokenColorMap = Record<FlatColorTokenKey, string>

type TypedTokens = DesignTokens & {
  colors: Record<ThemeName, TokenColorMap>
  semantic: SemanticColors
}

export const designTokens = rawTokens as TypedTokens

export function getThemeColors(theme: ThemeName) {
  return designTokens.colors[theme]
}

export function getLayoutConfig(mode: LayoutMode) {
  const { spacing, layout } = designTokens

  switch (mode) {
    case "compact":
      return {
        mode,
        padding: spacing.sm,
        gap: spacing.sm,
        containerMaxWidth: layout["container-max-width"],
      }
    case "zen":
      return {
        mode,
        padding: spacing.lg,
        gap: spacing.lg,
        containerMaxWidth: layout["container-max-width"],
      }
    case "balanced":
    default:
      return {
        mode,
        padding: spacing.md,
        gap: spacing.md,
        containerMaxWidth: layout["container-max-width"],
      }
  }
}
