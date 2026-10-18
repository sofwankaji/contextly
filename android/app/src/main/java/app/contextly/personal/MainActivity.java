package app.contextly.personal;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.Intent;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ContextlySecurePlugin.class);
        super.onCreate(savedInstanceState);
    }
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent.getBooleanExtra("contextlyProvisioned", false) && getBridge() != null) getBridge().getWebView().reload();
    }
}
