import SwiftUI

@main
struct OrvitaMobileApp: App {
    @State private var shell = OrvitaShellState()
    @State private var router = OrvitaWebRouter()

    var body: some Scene {
        WindowGroup {
            OrvitaRootView()
                .environment(shell)
                .environment(router)
                .onOpenURL { url in
                    router.handleOrvitaURL(url)
                }
        }
    }
}
