import Foundation
import SwiftUI

// MARK: - Estado del shell (@Observable)

/// Estado compartido del contenedor nativo: pestaña/columna activa y preferencias de UI.
@Observable
final class OrvitaShellState {
    /// Panel visible; en iPhone suele ir ligado a `TabView`, en iPad/macOS a `NavigationSplitView`.
    var selectedPane: OrvitaPane = .home

    /// Ajuste de accesibilidad: reduce transparencias del material (fase 2: leer de UserDefaults).
    var reduceTransparency: Bool = false

    func select(_ pane: OrvitaPane) {
        selectedPane = pane
    }
}
