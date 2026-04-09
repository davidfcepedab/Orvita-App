import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var router: OrvitaWebRouter

    var body: some View {
        VStack(spacing: 0) {
            OrvitaWebView(url: $router.targetURL)
        }
        .ignoresSafeArea(edges: .bottom)
    }
}

#Preview {
    ContentView()
        .environmentObject(OrvitaWebRouter())
}
