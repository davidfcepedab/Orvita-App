import Foundation

// MARK: - Sesión compartida con WidgetKit (App Group)

/// Escribe el mismo JSON que espera la extensión (`widget_session.json`):
/// `accessToken` + `apiBaseURL` para `GET /api/mobile/widget-summary` con `Authorization: Bearer`.
///
/// Requiere **App Groups** en el target de la app: `OrvitaConfig.widgetAppGroupIdentifier`.
enum OrvitaWidgetSessionStore {
    private static let fileName = "widget_session.json"
    private static let relativeDir = "Library/Application Support/Orvita"

    /// Sincroniza desde el cuerpo del mensaje `orvitaAuth` (WKScriptMessage).
    static func syncFromWebMessage(_ body: Any) {
        guard let dict = body as? [String: Any] else { return }
        let token = (dict["accessToken"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let originString = (dict["apiBaseURL"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let base = URL(string: originString ?? "") ?? OrvitaConfig.webBaseURL
        write(accessToken: token, apiBaseURL: base)
    }

    static func write(accessToken: String, apiBaseURL: URL) {
        guard let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: OrvitaConfig.widgetAppGroupIdentifier
        ) else {
            #if DEBUG
            print("[OrvitaWidgetSessionStore] App Group no disponible — añade \(OrvitaConfig.widgetAppGroupIdentifier) al target.")
            #endif
            return
        }

        let dir = container.appendingPathComponent(relativeDir, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let fileURL = dir.appendingPathComponent(fileName)
            let payload: [String: String] = [
                "accessToken": accessToken,
                "apiBaseURL": apiBaseURL.absoluteString,
            ]
            let data = try JSONSerialization.data(withJSONObject: payload, options: [.sortedKeys])
            try data.write(to: fileURL, options: [.atomic])
            #if DEBUG
            print("[OrvitaWidgetSessionStore] Sesión widget sincronizada (token \(accessToken.isEmpty ? "vacío" : "presente")).")
            #endif
        } catch {
            #if DEBUG
            print("[OrvitaWidgetSessionStore] Error escribiendo sesión: \(error.localizedDescription)")
            #endif
        }
    }
}
