package com.barrz.freestyle;

import android.app.Dialog;
import android.os.Bundle;
import android.os.Message;
import android.view.KeyEvent;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    private Dialog popupAuthDialog;

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
        CookieManager.getInstance().flush();
    }

    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
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
            cookieManager.flush();

            // Google bloquea inicios de sesión en WebView si detecta '; wv' en el User-Agent.
            // Al removerlo, Google reconoce el navegador como Chrome estándar y permite el login.
            String currentUserAgent = settings.getUserAgentString();
            if (currentUserAgent != null && currentUserAgent.contains("; wv")) {
                settings.setUserAgentString(currentUserAgent.replace("; wv", ""));
            }

            // Configurar WebChromeClient para interceptar ventanas emergentes (como "Continuar con Google" de Spotify)
            // y mostrarlas dentro de un diálogo emergente en la propia app con soporte nativo de window.opener
            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    if (popupAuthDialog != null && popupAuthDialog.isShowing()) {
                        popupAuthDialog.dismiss();
                    }

                    WebView popupWebView = new WebView(MainActivity.this);
                    WebSettings popupSettings = popupWebView.getSettings();
                    
                    popupSettings.setJavaScriptEnabled(true);
                    popupSettings.setDomStorageEnabled(true);
                    popupSettings.setDatabaseEnabled(true);
                    popupSettings.setSupportMultipleWindows(true);
                    popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);

                    // User-Agent sin '; wv' para permitir login con Google en la ventana emergente
                    String popupUA = popupSettings.getUserAgentString();
                    if (popupUA != null && popupUA.contains("; wv")) {
                        popupSettings.setUserAgentString(popupUA.replace("; wv", ""));
                    }

                    // Sincronizar cookies del popup con el CookieManager general
                    CookieManager cm = CookieManager.getInstance();
                    cm.setAcceptCookie(true);
                    cm.setAcceptThirdPartyCookies(popupWebView, true);

                    // Contenedor visual del popup con barra superior y botón de cerrar
                    LinearLayout container = new LinearLayout(MainActivity.this);
                    container.setOrientation(LinearLayout.VERTICAL);
                    container.setBackgroundColor(0xFF121212);

                    LinearLayout header = new LinearLayout(MainActivity.this);
                    header.setOrientation(LinearLayout.HORIZONTAL);
                    header.setPadding(32, 28, 32, 28);
                    header.setBackgroundColor(0xFF1E1E1E);

                    TextView title = new TextView(MainActivity.this);
                    title.setText("Iniciar sesión");
                    title.setTextColor(0xFFFFFFFF);
                    title.setTextSize(16);
                    LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
                    title.setLayoutParams(titleParams);
                    header.addView(title);

                    TextView closeBtn = new TextView(MainActivity.this);
                    closeBtn.setText("✕");
                    closeBtn.setTextColor(0xFFCCCCCC);
                    closeBtn.setTextSize(22);
                    closeBtn.setPadding(16, 0, 16, 0);
                    closeBtn.setOnClickListener(v -> {
                        if (popupAuthDialog != null && popupAuthDialog.isShowing()) {
                            popupAuthDialog.dismiss();
                        }
                    });
                    header.addView(closeBtn);

                    container.addView(header);

                    LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT, 
                        ViewGroup.LayoutParams.MATCH_PARENT
                    );
                    container.addView(popupWebView, webViewParams);

                    popupAuthDialog = new Dialog(MainActivity.this, android.R.style.Theme_Black_NoTitleBar_Fullscreen);
                    popupAuthDialog.setContentView(container);

                    popupAuthDialog.setOnKeyListener((dialog, keyCode, event) -> {
                        if (keyCode == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
                            if (popupWebView.canGoBack()) {
                                popupWebView.goBack();
                                return true;
                            }
                        }
                        return false;
                    });

                    popupAuthDialog.setOnDismissListener(dialogInterface -> {
                        CookieManager.getInstance().flush();
                        popupWebView.destroy();
                        popupAuthDialog = null;
                    });

                    popupAuthDialog.show();

                    popupWebView.setWebChromeClient(new WebChromeClient() {
                        @Override
                        public void onCloseWindow(WebView window) {
                            if (popupAuthDialog != null && popupAuthDialog.isShowing()) {
                                popupAuthDialog.dismiss();
                            }
                            window.destroy();
                        }
                    });

                    popupWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                            return false; // Mantener la navegación dentro de la ventana emergente
                        }

                        @Override
                        public void onPageFinished(WebView view, String url) {
                            super.onPageFinished(view, url);
                            CookieManager.getInstance().flush();
                            // Si la autenticación en el popup finalizó y vuelve a Spotify status o callback,
                            // cerramos el popup para que la ventana principal continúe el flujo
                            if (url != null && (url.contains("accounts.spotify.com/status") || url.contains("accounts.spotify.com/es/status") || url.contains("/api/login/google/callback"))) {
                                view.postDelayed(() -> {
                                    if (popupAuthDialog != null && popupAuthDialog.isShowing()) {
                                        popupAuthDialog.dismiss();
                                    }
                                }, 600);
                            }
                        }
                    });

                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(popupWebView);
                    resultMsg.sendToTarget();
                    return true;
                }
            });
        }
    }
}
