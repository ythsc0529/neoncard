package app.netlify.uptocard.twa;

import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;

import androidx.core.app.NotificationCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * NeonCard - DownloadPlugin
 * 使用 Android 原生 DownloadManager 執行後台下載 APK 更新
 * - 系統層級下載：即使 App 切換到後台也持續進行
 * - 自動顯示帶進度條的系統通知
 * - 下載完成後發送可點擊安裝的系統通知
 */
@CapacitorPlugin(name = "DownloadPlugin")
public class DownloadPlugin extends Plugin {

    private static final String NOTIF_CHANNEL_ID = "neoncard_updates";
    private static final String NOTIF_CHANNEL_NAME = "霓虹牌更新";
    private static final int NOTIF_COMPLETE_ID = 9001;

    private long activeDownloadId = -1;
    private BroadcastReceiver downloadReceiver = null;

    @Override
    public void load() {
        createNotificationChannel();
    }

    /**
     * 建立 Android 8+ 所需的通知 Channel
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                NOTIF_CHANNEL_ID,
                NOTIF_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("霓虹牌遊戲版本更新下載通知");
            NotificationManager nm = getContext().getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    /**
     * JS 呼叫：啟動後台下載
     * @param url   APK 下載 URL
     * @param fileName 儲存檔名（預設 neoncard_update.apk）
     * @return { downloadId: long }
     */
    @PluginMethod
    public void startDownload(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "neoncard_update.apk");

        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        Context context = getContext();
        DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) {
            call.reject("DownloadManager not available");
            return;
        }

        // 刪除舊的更新檔（若存在）
        File destFile = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName);
        if (destFile.exists()) {
            destFile.delete();
        }

        // 建立下載請求
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle("霓虹牌 更新下載中...");
        request.setDescription("正在下載新版本，請稍候");
        // 下載過程與完成後都在通知欄顯示
        request.setNotificationVisibility(
            DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
        );
        request.setDestinationInExternalFilesDir(
            context, Environment.DIRECTORY_DOWNLOADS, fileName
        );
        request.addRequestHeader("Accept", "application/vnd.android.package-archive");
        request.setMimeType("application/vnd.android.package-archive");
        request.setAllowedOverRoaming(false);

        // 取消舊的下載（避免重複佔用）
        if (activeDownloadId != -1) {
            try { dm.remove(activeDownloadId); } catch (Exception ignored) {}
        }
        if (downloadReceiver != null) {
            try { context.unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
            downloadReceiver = null;
        }

        activeDownloadId = dm.enqueue(request);

        // 監聽下載完成事件
        final String finalFileName = fileName;
        final long thisDownloadId = activeDownloadId;
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (completedId == thisDownloadId) {
                    handleDownloadComplete(ctx, completedId, finalFileName);
                    try { ctx.unregisterReceiver(this); } catch (Exception ignored) {}
                    downloadReceiver = null;
                }
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(downloadReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            context.registerReceiver(downloadReceiver, filter);
        }

        JSObject result = new JSObject();
        result.put("downloadId", activeDownloadId);
        call.resolve(result);
    }

    /**
     * 下載完成後的處理：發送「下載完成，點擊安裝」的通知
     */
    private void handleDownloadComplete(Context context, long completedDownloadId, String fileName) {
        DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) return;

        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(completedDownloadId);
        Cursor cursor = dm.query(query);

        if (cursor == null || !cursor.moveToFirst()) return;

        int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
        int status = cursor.getInt(statusIdx);
        cursor.close();

        if (status != DownloadManager.STATUS_SUCCESSFUL) {
            // 下載失敗，不需額外處理（DownloadManager 已顯示失敗通知）
            return;
        }

        // 取得 APK 檔案路徑
        File apkFile = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName);
        if (!apkFile.exists()) return;

        // 建立安裝 PendingIntent（點擊通知後直接開啟安裝器）
        Intent installIntent = new Intent(Intent.ACTION_VIEW);
        Uri apkUri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            apkUri = FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                apkFile
            );
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } else {
            apkUri = Uri.fromFile(apkFile);
        }
        installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            piFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingInstall = PendingIntent.getActivity(
            context, 0, installIntent, piFlags
        );

        // 建立高優先度完成通知
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NOTIF_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setContentTitle("🎮 霓虹牌更新下載完成！")
            .setContentText("點擊此處立即安裝新版本")
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText("新版本已下載完成！點擊此通知即可自動跳回遊戲並開始安裝。"))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingInstall)
            .setVibrate(new long[]{0, 300, 100, 300});

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIF_COMPLETE_ID, builder.build());
        }
    }

    /**
     * JS 呼叫：查詢下載進度（供 in-app UI 輪詢用）
     * @param downloadId  startDownload 回傳的 downloadId
     * @return { bytesDownloaded, bytesTotal, status, isComplete, isFailed }
     */
    @PluginMethod
    public void checkDownload(PluginCall call) {
        long id = call.getLong("downloadId", -1L);
        if (id == -1) {
            call.reject("downloadId is required");
            return;
        }

        Context context = getContext();
        DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        JSObject result = new JSObject();

        if (dm == null) {
            result.put("isComplete", false);
            result.put("isFailed", true);
            call.resolve(result);
            return;
        }

        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(id);
        Cursor cursor = dm.query(query);

        if (cursor != null && cursor.moveToFirst()) {
            int bytesDownloadedIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
            int bytesTotalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
            int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);

            long bytesDownloaded = cursor.getLong(bytesDownloadedIdx);
            long bytesTotal = cursor.getLong(bytesTotalIdx);
            int status = cursor.getInt(statusIdx);

            result.put("bytesDownloaded", bytesDownloaded);
            result.put("bytesTotal", bytesTotal);
            result.put("status", status);
            result.put("isComplete", status == DownloadManager.STATUS_SUCCESSFUL);
            result.put("isFailed", status == DownloadManager.STATUS_FAILED);
            cursor.close();
        } else {
            result.put("bytesDownloaded", 0);
            result.put("bytesTotal", 0);
            result.put("isComplete", false);
            result.put("isFailed", false);
        }

        call.resolve(result);
    }

    /**
     * JS 呼叫：取消進行中的下載
     */
    @PluginMethod
    public void cancelDownload(PluginCall call) {
        if (activeDownloadId != -1) {
            DownloadManager dm = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm != null) dm.remove(activeDownloadId);
            activeDownloadId = -1;
        }
        if (downloadReceiver != null) {
            try { getContext().unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
            downloadReceiver = null;
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (downloadReceiver != null) {
            try { getContext().unregisterReceiver(downloadReceiver); } catch (Exception ignored) {}
            downloadReceiver = null;
        }
    }
}
