package kz.studyplay.app;

/*
 * Главное окно приложения StudyPlay (подменяет стандартное от Capacitor при сборке, см. android.yml).
 * Регистрирует плагин SPGestures (SPGesturesPlugin.java): края экрана в Расписании — для листания недель.
 */

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SPGesturesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
