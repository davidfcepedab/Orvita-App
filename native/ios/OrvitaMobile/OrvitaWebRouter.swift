import Combine
import Foundation

/// Resuelve `orvita://…` hacia rutas dentro de la web app.
final class OrvitaWebRouter: ObservableObject {
    @Published var targetURL: URL

    init() {
        self.targetURL = OrvitaConfig.webBaseURL
    }

    func handleOrvitaURL(_ url: URL) {
        guard url.scheme?.lowercased() == OrvitaConfig.urlScheme else { return }

        let host = (url.host ?? "").lowercased()
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")).lowercased()

        switch host {
        case "home", "":
            targetURL = OrvitaConfig.webBaseURL
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
            targetURL = OrvitaConfig.webBaseURL
        }
    }

    func loadHome() {
        targetURL = OrvitaConfig.webBaseURL
    }
}
