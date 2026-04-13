import Foundation

// MARK: - Navegación principal (shell nativo)

/// Destinos de alto nivel: centro (`/`), módulo día (`/inicio`), capital nativo.
enum OrvitaPane: String, CaseIterable, Identifiable, Hashable {
    case home
    case inicio
    case capital

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: "Centro"
        case .inicio: "Tu día"
        case .capital: "Capital"
        }
    }

    var symbolName: String {
        switch self {
        case .home: "circle.hexagongrid.fill"
        case .inicio: "calendar.badge.clock"
        case .capital: "chart.xyaxis.line"
        }
    }

    var accessibilityLabel: String {
        switch self {
        case .home: "Centro de control, inicio"
        case .inicio: "Tu día, agenda y hábitos"
        case .capital: "Métricas de capital operativo"
        }
    }
}
