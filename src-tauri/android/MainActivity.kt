package com.taghvim.calendar

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : TauriActivity() {
  companion object {
    private const val TAG = "TaghvimStartup"
  }

  private fun recordCrashLog(source: String, throwable: Throwable) {
    try {
      val sw = StringWriter()
      throwable.printStackTrace(PrintWriter(sw))
      val timestamp = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ", Locale.US).format(Date())
      val report = "[$timestamp] [$source] ${throwable::class.java.name}: ${throwable.message}\n$sw\n"
      Log.e(TAG, report)
      File(filesDir, "android_crash.log").writeText(report)
    } catch (ioErr: Throwable) {
      Log.e(TAG, "Failed writing crash log: ${ioErr.message}")
    }
  }

  private fun showNativeStartupFailure(stage: String, throwable: Throwable) {
    try {
      val scroll = ScrollView(this).apply {
        setBackgroundColor(Color.parseColor("#0d0f14"))
        setPadding(48, 96, 48, 64)
      }
      val details = buildString {
        appendLine("Taghvim failed to start cleanly.")
        appendLine()
        appendLine("Stage: $stage")
        appendLine("Error: ${throwable::class.java.simpleName}: ${throwable.message ?: "Unknown error"}")
        appendLine("SDK: ${Build.VERSION.SDK_INT} (${Build.SUPPORTED_ABIS.joinToString()})")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          val wv = WebView.getCurrentWebViewPackage()
          appendLine("WebView: ${wv?.packageName ?: "missing"} (${wv?.versionName ?: "unknown"})")
        }
      }
      val tv = TextView(this).apply {
        text = details
        setTextColor(Color.parseColor("#f87171"))
        textSize = 14f
        setTextIsSelectable(true)
      }
      scroll.addView(tv)
      setContentView(scroll)
    } catch (uiErr: Throwable) {
      Log.e(TAG, "Failed displaying fallback startup error UI: ${uiErr.message}")
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    Log.i(TAG, "stage:activity_onCreate_start sdk=${Build.VERSION.SDK_INT} abis=${Build.SUPPORTED_ABIS.joinToString()}")

    val previousHandler = Thread.getDefaultUncaughtExceptionHandler()
    Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
      recordCrashLog("UncaughtException:${thread.name}", throwable)
      previousHandler?.uncaughtException(thread, throwable)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        val webViewPkg = WebView.getCurrentWebViewPackage()
        Log.i(
          TAG,
          "stage:webview_check package=${webViewPkg?.packageName ?: "none"} version=${webViewPkg?.versionName ?: "none"}"
        )
      } catch (wvErr: Throwable) {
        Log.e(TAG, "stage:webview_check_failed ${wvErr.message}", wvErr)
      }
    }

    try {
      enableEdgeToEdge()
      Log.i(TAG, "stage:edge_to_edge_enabled")
    } catch (edgeErr: Throwable) {
      Log.w(TAG, "stage:edge_to_edge_skipped ${edgeErr.message}", edgeErr)
    }

    try {
      Log.i(TAG, "stage:tauri_super_onCreate_begin")
      super.onCreate(savedInstanceState)
      Log.i(TAG, "stage:tauri_super_onCreate_complete")
    } catch (linkErr: UnsatisfiedLinkError) {
      recordCrashLog("UnsatisfiedLinkError", linkErr)
      showNativeStartupFailure("native_library_load", linkErr)
    } catch (err: Throwable) {
      recordCrashLog("super.onCreate", err)
      showNativeStartupFailure("tauri_activity_create", err)
    }
  }
}
