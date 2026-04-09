import Foundation

/// URL base de la web (producción o preview). Sobrescribe en Info.plist con la clave `ORVITA_WEB_URL`.
enum OrvitaConfig {
    static var webBaseURL: URL {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "ORVITA_WEB_URL") as? String,
           let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)),
           !raw.isEmpty {
            return url
        }
        return URL(string: "https://orvita.app")!
    }

    /// Esquema registrado en Xcode → URL Types → URL Schemes: `orvita`
    static let urlScheme = "orvita"
}
