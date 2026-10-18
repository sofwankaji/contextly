package app.contextly.personal;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.atomic.AtomicLong;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class DeviceKeyVault {
    static final AtomicLong revision = new AtomicLong();
    private static final String ALIAS = "contextly-gemini-v1";
    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("contextly-secrets", Context.MODE_PRIVATE);
    }
    private static SecretKey encryptionKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }
    static synchronized void save(Context context, String key) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey());
        byte[] sealed = cipher.doFinal(key.getBytes(StandardCharsets.UTF_8));
        if (!preferences(context).edit().putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
            .putString("sealed", Base64.encodeToString(sealed, Base64.NO_WRAP)).commit()) throw new Exception("store");
        revision.incrementAndGet();
    }
    static synchronized String read(Context context) throws Exception {
        SharedPreferences prefs = preferences(context);
        String sealed = prefs.getString("sealed", null), iv = prefs.getString("iv", null);
        if (sealed == null || iv == null) return null;
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(sealed, Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }
    static synchronized void clear(Context context) {
        revision.incrementAndGet(); preferences(context).edit().remove("sealed").remove("iv").apply();
    }
}
