package app.contextly.personal;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Binder;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.Base64;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONObject;

/** Development setup over an explicitly paired ADB connection only. Never exports the saved API key. */
public class DeviceProvisioningProvider extends ContentProvider {
    private byte[] transfer;
    private String nonce;
    private long expires;
    @Override public boolean onCreate() { return true; }
    @Override public synchronized Bundle call(String method, String arg, Bundle extras) {
        // ContentProvider.call does not enforce read/write permissions itself. Check the Binder caller explicitly.
        if (Binder.getCallingUid() != 2000) throw new SecurityException("Paired Android shell required");
        long identity = Binder.clearCallingIdentity();
        try { return provision(method, extras); }
        finally { Binder.restoreCallingIdentity(identity); }
    }
    private Bundle provision(String method, Bundle extras) {
        Bundle result = new Bundle();
        if ("request".equals(method)) {
            if (transfer != null) Arrays.fill(transfer, (byte) 0);
            transfer = new byte[32]; new SecureRandom().nextBytes(transfer);
            nonce = UUID.randomUUID().toString(); expires = SystemClock.elapsedRealtime() + 120000;
            result.putString("nonce", nonce);
            result.putString("transfer", Base64.encodeToString(transfer, Base64.NO_WRAP));
            return result;
        }
        if (!"import".equals(method)) throw new IllegalArgumentException("Unknown method");
        byte[] oneTime = transfer; transfer = null;
        HttpURLConnection connection = null;
        try {
            if (oneTime == null || SystemClock.elapsedRealtime() > expires) throw new Exception("expired");
            String sealed = extras == null ? "" : extras.getString("sealed", "");
            if (sealed.length() > 2000) throw new Exception("input");
            JSONObject envelope = new JSONObject(new String(Base64.decode(sealed, Base64.NO_WRAP), StandardCharsets.UTF_8));
            if (!nonce.equals(envelope.getString("nonce"))) throw new Exception("nonce");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(oneTime, "AES"),
                new GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)));
            cipher.updateAAD(nonce.getBytes(StandardCharsets.UTF_8));
            String key = new String(cipher.doFinal(Base64.decode(envelope.getString("data"), Base64.NO_WRAP)), StandardCharsets.UTF_8);
            if (!key.matches("[A-Za-z0-9_.-]{20,256}")) throw new Exception("key");
            connection = (HttpURLConnection) URI.create("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite").toURL().openConnection();
            connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
            connection.setRequestProperty("x-goog-api-key", key);
            if (connection.getResponseCode() != 200) throw new Exception("access");
            DeviceKeyVault.save(getContext(), key);
            result.putBoolean("configured", true);
        } catch (Exception error) { result.putBoolean("configured", false); }
        finally { if (oneTime != null) Arrays.fill(oneTime, (byte) 0); nonce = null; if (connection != null) connection.disconnect(); }
        return result;
    }
    @Override public Cursor query(Uri u, String[] p, String s, String[] a, String o) { throw new SecurityException(); }
    @Override public String getType(Uri u) { return null; }
    @Override public Uri insert(Uri u, ContentValues v) { throw new SecurityException(); }
    @Override public int delete(Uri u, String s, String[] a) { throw new SecurityException(); }
    @Override public int update(Uri u, ContentValues v, String s, String[] a) { throw new SecurityException(); }
}
