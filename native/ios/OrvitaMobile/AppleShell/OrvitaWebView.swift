import SwiftUI
import WebKit

// MARK: - WKWebView + puente sesión → App Group (widgets)

struct OrvitaWebView: UIViewRepresentable {
    @Binding var url: URL

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        let contentController = WKUserContentController()
        let script = WKUserScript(
            source: OrvitaWidgetAuthBridge.injectedJavaScript,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        contentController.addUserScript(script)
        contentController.add(context.coordinator, name: OrvitaWidgetAuthBridge.messageHandlerName)
        config.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        context.coordinator.lastLoaded = url
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let next = url.absoluteString
        if context.coordinator.lastLoaded?.absoluteString != next {
            context.coordinator.lastLoaded = url
            webView.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var lastLoaded: URL?

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // SPA (Next.js): tras navegación client-side vuelve a leer localStorage.
            webView.evaluateJavaScript(OrvitaWidgetAuthBridge.evaluateCall) { _, _ in }
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == OrvitaWidgetAuthBridge.messageHandlerName else { return }
            OrvitaWidgetSessionStore.syncFromWebMessage(message.body)
        }
    }
}

// MARK: - JS inyectado (Supabase: `sb-*-auth-token` en localStorage)

private enum OrvitaWidgetAuthBridge {
    static let messageHandlerName = "orvitaAuth"

    /// Expone `window.orvitaSyncAuthToNative()` para re-ejecutar tras navegación.
    static let injectedJavaScript = """
    (function() {
      function sync() {
        try {
          var token = "";
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (!k || k.indexOf('-auth-token') === -1) continue;
            var raw = localStorage.getItem(k);
            if (!raw) continue;
            var p = JSON.parse(raw);
            if (p && p.access_token) { token = String(p.access_token); break; }
          }
          if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.\(messageHandlerName)) {
            window.webkit.messageHandlers.\(messageHandlerName).postMessage({
              accessToken: token,
              apiBaseURL: location.origin
            });
          }
        } catch (e) {}
      }
      window.orvitaSyncAuthToNative = sync;
      sync();
      window.addEventListener('storage', function() { sync(); });
    })();
    """

    static let evaluateCall = "window.orvitaSyncAuthToNative && window.orvitaSyncAuthToNative()"
}
