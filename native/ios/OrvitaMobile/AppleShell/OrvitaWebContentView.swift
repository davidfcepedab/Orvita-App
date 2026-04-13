import SwiftUI

// MARK: - Contenedor web (WKWebView + cromo nativo)

/// Envuelve la web con jerarquía clara: título, menú de secciones y material ligero (HIG: claridad sin ruido).
struct OrvitaWebContentView: View {
    @Environment(OrvitaWebRouter.self) private var router
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    private var urlBinding: Binding<URL> {
        Binding(
            get: { router.targetURL },
            set: { router.targetURL = $0 }
        )
    }

    var body: some View {
        OrvitaWebView(url: urlBinding)
            .ignoresSafeArea(edges: .bottom)
            .navigationTitle("Órvita")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if horizontalSizeClass == .compact {
                    ToolbarItem(placement: .topBarTrailing) {
                        SectionPickerMenu()
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
    }
}

// MARK: - Menú rápido (iPhone: `/inicio` sin segunda instancia web)

private struct SectionPickerMenu: View {
    @Environment(OrvitaWebRouter.self) private var router

    var body: some View {
        Menu {
            Button {
                router.loadHome()
            } label: {
                Label("Centro", systemImage: "circle.hexagongrid.fill")
            }
            Button {
                router.loadInicio()
            } label: {
                Label("Tu día", systemImage: "calendar.badge.clock")
            }
        } label: {
            Label("Secciones", systemImage: "ellipsis.circle")
        }
        .accessibilityLabel("Cambiar sección de la app web")
    }
}
