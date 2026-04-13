import SwiftUI

// MARK: - Raíz adaptativa (Tab iPhone / Split iPad)

/// - iPhone: dos pestañas (web + capital nativo); “Tu día” (`/inicio`) vía menú en la toolbar web.
/// - iPad / ancho regular: `NavigationSplitView` con Centro, Tu día (misma instancia web, distinta URL) y Capital nativo.
struct OrvitaRootView: View {
    @Environment(OrvitaShellState.self) private var shell
    @Environment(OrvitaWebRouter.self) private var router

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        Group {
            if horizontalSizeClass == .compact {
                phoneTabs
            } else {
                padSplit
            }
        }
        .tint(.accentColor)
        // iPad: solo sincroniza URL al alternar Centro ↔ Tu día en la barra lateral.
        // No recargar al volver desde Capital (preserva historial del WKWebView).
        .onChange(of: shell.selectedPane) { oldPane, newPane in
            syncWebURLForSplitView(oldPane: oldPane, newPane: newPane)
        }
        // iPhone ↔ iPad multitarea: TabView solo admite .home y .capital como tags.
        .onChange(of: horizontalSizeClass) { _, newClass in
            reconcileSelectionForSizeClass(newClass)
        }
        .onAppear {
            if horizontalSizeClass != .compact, shell.selectedPane == .inicio {
                router.loadInicio()
            }
        }
    }

    /// Ajusta selección inválida (p. ej. Tu día en layout compacto) sin romper TabView.
    private func reconcileSelectionForSizeClass(_ newClass: UserInterfaceSizeClass?) {
        guard (newClass ?? .regular) == .compact else { return }
        if shell.selectedPane == .inicio {
            shell.selectedPane = .home
            router.loadHome()
        }
    }

    /// Transiciones web exclusivas del split view; en iPhone la URL la controla el menú de `OrvitaWebContentView`.
    private func syncWebURLForSplitView(oldPane: OrvitaPane, newPane: OrvitaPane) {
        guard horizontalSizeClass != .compact else { return }
        switch (oldPane, newPane) {
        case (.home, .inicio):
            router.loadInicio()
        case (.inicio, .home):
            router.loadHome()
        default:
            break
        }
    }

    // MARK: iPhone

    private var phoneTabs: some View {
        TabView(selection: Bindable(shell).selectedPane) {
            NavigationStack {
                OrvitaWebContentView()
            }
            .tabItem {
                Label(OrvitaPane.home.title, systemImage: OrvitaPane.home.symbolName)
            }
            .tag(OrvitaPane.home)

            NavigationStack {
                OperationalCapitalOverviewView()
            }
            .tabItem {
                Label(OrvitaPane.capital.title, systemImage: OrvitaPane.capital.symbolName)
            }
            .tag(OrvitaPane.capital)
        }
    }

    // MARK: iPad / macOS (Catalyst)

    private var padSplit: some View {
        NavigationSplitView {
            List(selection: Bindable(shell).selectedPane) {
                Section("Centro") {
                    ForEach([OrvitaPane.home, .inicio], id: \.self) { pane in
                        Label(pane.title, systemImage: pane.symbolName)
                            .tag(pane)
                            .accessibilityLabel(pane.accessibilityLabel)
                    }
                }
                Section("Métricas") {
                    Label(OrvitaPane.capital.title, systemImage: OrvitaPane.capital.symbolName)
                        .tag(OrvitaPane.capital)
                        .accessibilityLabel(OrvitaPane.capital.accessibilityLabel)
                }
            }
            .navigationTitle("Órvita")
            .listStyle(.sidebar)
        } detail: {
            detailPane
                .navigationSplitViewColumnWidth(min: 320, ideal: 420)
        }
    }

    @ViewBuilder
    private var detailPane: some View {
        switch shell.selectedPane {
        case .home, .inicio:
            NavigationStack {
                OrvitaWebContentView()
            }
        case .capital:
            NavigationStack {
                OperationalCapitalOverviewView()
            }
        }
    }
}

#Preview("Raíz") {
    OrvitaRootView()
        .environment(OrvitaShellState())
        .environment(OrvitaWebRouter())
}
