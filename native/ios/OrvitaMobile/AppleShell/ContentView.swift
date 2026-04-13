import SwiftUI

// MARK: - Compatibilidad (raíz real: OrvitaRootView)

/// Punto de entrada legado; el shell usa `OrvitaRootView` desde `OrvitaMobileApp`.
struct ContentView: View {
    var body: some View {
        OrvitaRootView()
    }
}

#Preview {
    ContentView()
        .environment(OrvitaShellState())
        .environment(OrvitaWebRouter())
}
