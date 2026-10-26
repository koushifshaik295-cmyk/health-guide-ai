package com.healthguide.ai

import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class StepBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StepBridgeModule"

    @ReactMethod
    fun startStepTracker() {
        val intent = Intent(reactContext, StepCounterService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopStepTracker() {
        val intent = Intent(reactContext, StepCounterService::class.java)
        reactContext.stopService(intent)
    }

    @ReactMethod
    fun getOfflineSteps(promise: Promise) {
        val prefs = reactContext.getSharedPreferences("HealthGuideSteps", Context.MODE_PRIVATE)
        val steps = prefs.getInt("offline_saved_steps", 0)
        promise.resolve(steps)
    }

    @ReactMethod
    fun resetStepOffset(promise: Promise) {
        val prefs = reactContext.getSharedPreferences("HealthGuideSteps", Context.MODE_PRIVATE)
        prefs.edit().remove("hardware_step_offset").putInt("offline_saved_steps", 0).apply()
        promise.resolve(true)
    }
}