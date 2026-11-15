# Keep Tauri runtime, WebView bridge, and Kotlin/JNI plugin classes
-keep class app.tauri.** { *; }
-keep interface app.tauri.** { *; }
-keep class com.plugin.** { *; }
-keep class com.taghvim.** { *; }
-keep class androidx.webkit.** { *; }
-keep class androidx.activity.** { *; }
-keep class kotlin.Metadata { *; }

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod

-keep @app.tauri.annotation.TauriPlugin class * { *; }
-keep @app.tauri.annotation.InvokeArg class * { *; }
-keepclassmembers class * {
    @app.tauri.annotation.Command <methods>;
    native <methods>;
}

-dontwarn app.tauri.**
-dontwarn com.plugin.**
