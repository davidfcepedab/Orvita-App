import Foundation

// MARK: - Deep links y rutas web

/// Rutas resueltas hacia la web app. `@Observable` para integrarse con SwiftUI sin `ObservableObject`.
@Observable
final class OrvitaWebRouter {
    /// URL del `WKWebView` compartido (Centro `/` y Tu día `/inicio` comparten instancia en split view).
    var targetURL: URL

    init() {
        self.targetURL = OrvitaConfig.webBaseURL
    }

    func handleOrvitaURL(_ url: URL) {
        guard url.scheme?.lowercased() == OrvitaConfig.urlScheme else { return }

        let host = (url.host ?? "").lowercased()
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased()

        switch host {
        case "home", "":
            loadHome()
        case "checkin":
            let fragment: String
            switch path {
            case "manana", "mañana":
                fragment = "checkin-manana"
            case "dia", "día":
                fragment = "checkin-dia"
            case "noche":
                fragment = "checkin-noche"
            default:
                fragment = "checkin-manana"
            }
            var components = URLComponents(url: OrvitaConfig.webBaseURL.appendingPathComponent("checkin"), resolvingAgainstBaseURL: false)
            components?.fragment = fragment
            if let u = components?.url {
                targetURL = u
            }
        default:
            loadHome()
        }
    }

    func loadHome() {
        targetURL = OrvitaConfig.webBaseURL
    }

    /// Módulo día / agenda / hábitos — ruta canónica en web: `/inicio`.
    func loadInicio() {
        targetURL = OrvitaConfig.webBaseURL.appendingPathComponent("inicio")
    }

    /// Sincroniza la URL con el panel del shell (sidebar / detalle).
    func applyPane(_ pane: OrvitaPane) {
        switch pane {
        case .home:
            loadHome()
        case .inicio:
            loadInicio()
        case .capital:
            break
        }
    }
}
