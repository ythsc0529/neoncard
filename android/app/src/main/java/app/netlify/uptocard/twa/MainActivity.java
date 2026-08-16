package app.netlify.uptocard.twa;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

public class MainActivity extends BridgeActivity {

    // ── Firebase App Check Debug Token ─────────────────────────────────
    // 這個 UUID 已預先註冊到 Firebase Console App Check。
    // Debug build 使用此 token 讓本機測試正常運作。
    // Release build 自動改用 Play Integrity，不會用到此 token。
    private static final String DEBUG_APP_CHECK_TOKEN = "3dc942aa-9471-4133-9e2b-74804250b729";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DownloadPlugin.class);

        // ── Firebase App Check 初始化 ──────────────────────────────────
        FirebaseAppCheck firebaseAppCheck = FirebaseAppCheck.getInstance();
        if (isDebugBuild()) {
            // 本機 debug 測試：使用預設 token（已在 Firebase Console 註冊）
            System.setProperty("firebase.appcheck.debug.token", DEBUG_APP_CHECK_TOKEN);
            firebaseAppCheck.installAppCheckProviderFactory(
                DebugAppCheckProviderFactory.getInstance()
            );
        } else {
            // Release 版本：使用 Play Integrity（只有正版 APK 才能通過）
            firebaseAppCheck.installAppCheckProviderFactory(
                PlayIntegrityAppCheckProviderFactory.getInstance()
            );
        }

        super.onCreate(savedInstanceState);
    }

    private boolean isDebugBuild() {
        try {
            // 檢查 App 是否為 debug 簽名
            android.content.pm.ApplicationInfo appInfo = getApplicationContext().getApplicationInfo();
            return (appInfo.flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        } catch (Exception e) {
            return false;
        }
    }
}

