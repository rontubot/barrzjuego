package com.barrz.freestyle;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        super.onCreate(savedInstanceState);
        setupCustomWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupCustomWebView();
    }

    private void setupCustomWebView() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            
            // Permitir almacenamiento y ventanas para OAuth y Spotify
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Permitir cookies de terceros para que el reproductor iframe de Spotify conserve la sesión
            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // Google bloquea inicios de sesión en WebView si detecta '; wv' en el User-Agent.
            // Al removerlo, Google reconoce el navegador como Chrome estándar y permite el login.
            String currentUserAgent = settings.getUserAgentString();
            if (currentUserAgent != null && currentUserAgent.contains("; wv")) {
                settings.setUserAgentString(currentUserAgent.replace("; wv", ""));
            }
        }
    }
}

