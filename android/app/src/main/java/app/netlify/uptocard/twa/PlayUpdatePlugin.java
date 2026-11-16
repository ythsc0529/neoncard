package app.netlify.uptocard.twa;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;

@CapacitorPlugin(name = "PlayUpdate")
public class PlayUpdatePlugin extends Plugin {
    private AppUpdateManager updateManager;

    @Override
    public void load() {
        updateManager = AppUpdateManagerFactory.create(getContext());
    }

    @PluginMethod
    public void checkUpdate(PluginCall call) {
        updateManager.getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                JSObject result = new JSObject();
                result.put("installedVersion", BuildConfig.VERSION_NAME);
                result.put("installedVersionCode", BuildConfig.VERSION_CODE);
                result.put("available", info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE);
                result.put("inProgress", info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS);
                result.put("availableVersionCode", info.availableVersionCode());
                result.put("canStart", info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE));
                call.resolve(result);
            })
            .addOnFailureListener(error -> call.reject("Google Play update check failed", error));
    }

    @PluginMethod
    public void startUpdate(PluginCall call) {
        updateManager.getAppUpdateInfo()
            .addOnSuccessListener(info -> {
                boolean available = info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    || info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
                if (!available || !info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                    call.reject("No immediate Google Play update available");
                    return;
                }
                try {
                    boolean started = updateManager.startUpdateFlowForResult(
                        info, getActivity(), AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(), 8123);
                    if (started) call.resolve();
                    else call.reject("Google Play update flow did not start");
                } catch (Exception error) {
                    call.reject("Google Play update flow failed", error);
                }
            })
            .addOnFailureListener(error -> call.reject("Google Play update check failed", error));
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (updateManager == null) return;
        updateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
                && info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                try {
                    updateManager.startUpdateFlowForResult(
                        info, getActivity(), AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(), 8123);
                } catch (Exception ignored) { }
            }
        });
    }
}
