package com.healthguide.ai

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.widget.ImageView
import androidx.core.app.NotificationCompat

class FloatingCompanionService : Service() {

    private var windowManager: WindowManager? = null
    private var heroImageView: ImageView? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForegroundNotification()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val hero = intent?.getStringExtra("HERO_NAME") ?: "hero"
        displayFloatingHero(hero)
        return START_NOT_STICKY
    }

    private fun startForegroundNotification() {
        val channelId = "floating_hero_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Hydration Screen Companion",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Water Companion Active")
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .build()

        startForeground(101, notification)
    }

    private fun displayFloatingHero(heroName: String) {
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager

        val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            350,
            450,
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.BOTTOM or Gravity.START
        params.x = 0
        params.y = 150

        val resourceName = if (heroName == "pushpa") "hero1" else "hero"
        val resourceId = resources.getIdentifier(resourceName, "drawable", packageName)

        heroImageView = ImageView(this).apply {
            if (resourceId != 0) {
                setImageResource(resourceId)
            }
        }

        windowManager?.addView(heroImageView, params)

        // Dismiss the floating character automatically after 8 seconds
        Handler(Looper.getMainLooper()).postDelayed({
            removeFloatingHero()
        }, 8000)
    }

    private fun removeFloatingHero() {
        if (heroImageView != null && windowManager != null) {
            windowManager?.removeView(heroImageView)
            heroImageView = null
        }
        stopSelf()
    }
}