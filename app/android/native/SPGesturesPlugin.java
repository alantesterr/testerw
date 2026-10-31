package kz.studyplay.app;

/*
 * Плагин SPGestures. На Android с жестами свайп от края экрана — системное «Назад», и сайт его не получает.
 * Сайт на странице «Расписание» вызывает SPGestures.set({ on: true }): середина левого и правого края
 * (по 200 dp в высоту — больше Android не разрешает) отдаётся сайту для листания недель.
 * Выше и ниже «Назад» работает как обычно; на других страницах — set({ on: false }), всё как у системы.
 */

import android.graphics.Rect;
import android.os.Build;
import android.view.View;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "SPGestures")
public class SPGesturesPlugin extends Plugin {
    private boolean on = false;

    @Override
    public void load() {
        View web = getBridge().getWebView();
        web.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, orr, ob) -> apply());
    }

    @PluginMethod
    public void set(PluginCall call) {
        on = Boolean.TRUE.equals(call.getBoolean("on", false));
        getActivity().runOnUiThread(this::apply);
        call.resolve();
    }

    private void apply() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        View v = getBridge().getWebView();
        if (!on) { v.setSystemGestureExclusionRects(Collections.emptyList()); return; }
        float d = v.getResources().getDisplayMetrics().density;
        int w = v.getWidth(), h = v.getHeight(), band = (int) (200 * d), edge = (int) (40 * d);
        int top = Math.max(0, h / 2 - band / 2);
        List<Rect> rects = new ArrayList<>();
        rects.add(new Rect(0, top, edge, top + band));
        rects.add(new Rect(w - edge, top, w, top + band));
        v.setSystemGestureExclusionRects(rects);
    }
}
