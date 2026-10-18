package app.contextly.personal;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Map;
import java.util.Set;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicLong;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Device-owned key. No API exports plaintext key material to JavaScript. */
@CapacitorPlugin(name = "ContextlySecure")
public class ContextlySecurePlugin extends Plugin {
    private static final String ALIAS = "contextly-gemini-v1";
    private static final String[] MODELS = {"gemini-3.1-flash-lite", "gemini-3.6-flash"};
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final Map<String, HttpURLConnection> connections = new ConcurrentHashMap<>();
    private final Map<String, Boolean> canceled = new ConcurrentHashMap<>();
    private final Set<String> active = ConcurrentHashMap.newKeySet();
    private final AtomicLong revision = new AtomicLong();
    private TextToSpeech voice;
    private boolean voiceReady;
    private PluginCall waitingVoice;

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty() || text.length() > 4000) { call.reject("ใส่ข้อความก่อน"); return; }
        getActivity().runOnUiThread(() -> {
            if (voiceReady) { speakNow(call); return; }
            if (waitingVoice != null) waitingVoice.resolve();
            waitingVoice = call;
            if (voice == null) voice = new TextToSpeech(getContext(), result -> {
                getActivity().runOnUiThread(() -> {
                    PluginCall pending = waitingVoice; waitingVoice = null;
                    voiceReady = result == TextToSpeech.SUCCESS;
                    if (pending == null) return;
                    if (voiceReady) speakNow(pending);
                    else { voice.shutdown(); voice = null; pending.reject("เปิดเสียงภาษาอังกฤษในตั้งค่าโทรศัพท์ก่อน"); }
                });
            });
        });
    }

    private void speakNow(PluginCall call) {
        int language = voice.setLanguage(Locale.US);
        if (language < TextToSpeech.LANG_AVAILABLE) { call.reject("ติดตั้งเสียงภาษาอังกฤษในโทรศัพท์ก่อน"); return; }
        voice.setSpeechRate(0.85f);
        if (voice.speak(call.getString("text", ""), TextToSpeech.QUEUE_FLUSH, null, "contextly") == TextToSpeech.ERROR)
            call.reject("เสียงยังไม่พร้อม ลองใหม่");
        else call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (voice != null) { voice.stop(); voice.shutdown(); }
        connections.values().forEach(HttpURLConnection::disconnect);
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences("contextly-secrets", android.content.Context.MODE_PRIVATE);
    }

    private SecretKey encryptionKey() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }

    private synchronized void saveKey(String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey());
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        if (!preferences().edit().putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
            .putString("sealed", Base64.encodeToString(encrypted, Base64.NO_WRAP)).commit()) throw new Exception("store");
        revision.incrementAndGet();
    }

    private synchronized String readKey() throws Exception {
        String sealed = preferences().getString("sealed", null), iv = preferences().getString("iv", null);
        if (sealed == null || iv == null) return null;
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, encryptionKey(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(sealed, Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject value = new JSObject();
        value.put("configured", preferences().contains("sealed"));
        call.resolve(value);
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String key = call.getString("key", "").trim();
        if (!key.matches("[A-Za-z0-9_.-]{20,256}")) {
            call.reject("รูปแบบ Gemini key ไม่ถูกต้อง", "KEY");
            return;
        }
        long connectingRevision = revision.get();
        executor.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + MODELS[0]).toURL().openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.setRequestProperty("x-goog-api-key", key);
                if (connection.getResponseCode() != 200) {
                    call.reject("ตรวจคีย์หรือสิทธิ์ Gemini อีกครั้ง", "KEY");
                    return;
                }
                synchronized (this) {
                    if (connectingRevision != revision.get()) { call.reject("ยกเลิกแล้ว", "ABORT"); return; }
                    saveKey(key);
                }
                JSObject result = new JSObject();
                result.put("configured", true);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("เชื่อม Gemini ไม่สำเร็จ ลองใหม่อีกครั้ง", "NETWORK");
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @PluginMethod
    public synchronized void disconnect(PluginCall call) {
        revision.incrementAndGet();
        connections.values().forEach(HttpURLConnection::disconnect);
        connections.clear();
        preferences().edit().remove("sealed").remove("iv").apply();
        JSObject result = new JSObject();
        result.put("configured", false);
        call.resolve(result);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id", "");
        synchronized (active) {
            if (id.matches("[A-Za-z0-9-]{1,80}") && active.contains(id)) {
                canceled.put(id, true);
                HttpURLConnection connection = connections.remove(id);
                if (connection != null) connection.disconnect();
            }
        }
        call.resolve();
    }

    private byte[] readLimited(InputStream stream) throws Exception {
        if (stream == null) return new byte[0];
        try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int length;
            while ((length = input.read(buffer)) != -1) {
                output.write(buffer, 0, length);
                if (output.size() > 131072) throw new Exception("response too large");
            }
            return output.toByteArray();
        }
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String id = call.getString("id", ""), body = call.getString("body", "");
        if (!id.matches("[A-Za-z0-9-]{1,80}") || body.length() > 20000 || body.isEmpty()) {
            call.reject("คำขอไม่ถูกต้อง", "INPUT");
            return;
        }
        long activeRevision = revision.get();
        if (!active.add(id)) { call.reject("คำขอซ้ำ", "INPUT"); return; }
        executor.execute(() -> {
            try {
                String key = readKey();
                if (key == null) { call.reject("เชื่อม Gemini ในตั้งค่าก่อน", "NO_KEY"); return; }
                byte[] bytes = new JSONObject(body).toString().getBytes(StandardCharsets.UTF_8);
                for (int attempt = 0; attempt < MODELS.length; attempt++) {
                    if (canceled.containsKey(id) || activeRevision != revision.get()) { call.reject("ยกเลิกแล้ว", "ABORT"); return; }
                    HttpURLConnection connection = null;
                    try {
                        connection = (HttpURLConnection) URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + MODELS[attempt] + ":generateContent").toURL().openConnection();
                        connections.put(id, connection);
                        connection.setInstanceFollowRedirects(false);
                        connection.setConnectTimeout(10000);
                        connection.setReadTimeout(attempt == 0 ? 15000 : 28000);
                        connection.setRequestMethod("POST");
                        connection.setRequestProperty("Content-Type", "application/json");
                        connection.setRequestProperty("x-goog-api-key", key);
                        connection.setDoOutput(true);
                        try (OutputStream output = connection.getOutputStream()) { output.write(bytes); }
                        int status = connection.getResponseCode();
                        if (status == 429) { call.reject("โควตา Gemini เต็ม ลองใหม่ภายหลัง", "QUOTA"); return; }
                        if (status == 400 || status == 401 || status == 403) { call.reject("ตรวจ Gemini key หรือสิทธิ์ของโปรเจกต์", "KEY"); return; }
                        if (status >= 500 && attempt == 0) continue;
                        if (status != 200) { call.reject("Gemini ยังไม่พร้อม ลองใหม่อีกครั้ง", "NETWORK"); return; }
                        JSONObject payload = new JSONObject(new String(readLimited(connection.getInputStream()), StandardCharsets.UTF_8));
                        if (canceled.containsKey(id) || activeRevision != revision.get()) { call.reject("ยกเลิกแล้ว", "ABORT"); return; }
                        JSObject result = new JSObject();
                        result.put("payload", payload);
                        result.put("model", MODELS[attempt]);
                        call.resolve(result);
                        return;
                    } catch (Exception error) {
                        if (canceled.containsKey(id) || activeRevision != revision.get()) { call.reject("ยกเลิกแล้ว", "ABORT"); return; }
                        if (attempt == MODELS.length - 1) throw error;
                    } finally {
                        connections.remove(id);
                        if (connection != null) connection.disconnect();
                    }
                }
                call.reject("Gemini ยังไม่พร้อม", "NETWORK");
            } catch (Exception error) {
                call.reject("เชื่อม Gemini ไม่สำเร็จ ลองใหม่อีกครั้ง", "NETWORK");
            } finally {
                synchronized (active) { active.remove(id); canceled.remove(id); }
            }
        });
    }

    @PluginMethod
    public void exportBackup(PluginCall call) {
        String json = call.getString("json", "");
        if (json.isEmpty() || json.length() > 20000000) { call.reject("ไฟล์สำรองไม่ถูกต้อง"); return; }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE, "contextly-backup.json");
        startActivityForResult(call, intent, "backupCreated");
    }

    @ActivityCallback
    private void backupCreated(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(); return; }
        Uri uri = result.getData().getData();
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri)) {
            if (output == null) throw new Exception("no output");
            output.write(call.getString("json", "").getBytes(StandardCharsets.UTF_8));
            call.resolve();
        } catch (Exception error) { call.reject("บันทึกไฟล์สำรองไม่สำเร็จ"); }
    }
}
