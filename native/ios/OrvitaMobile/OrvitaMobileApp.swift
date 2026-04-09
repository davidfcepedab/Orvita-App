import SwiftUI

@main
struct OrvitaMobileApp: App {
    @StateObject private var router = OrvitaWebRouter()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(router)
                .onOpenURL { url in
                    router.handleOrvitaURL(url)
                }
        }
    }
}
