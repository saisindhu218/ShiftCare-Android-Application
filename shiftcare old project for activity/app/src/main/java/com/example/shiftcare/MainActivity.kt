package com.example.shiftcare.ui.activities

import android.os.Bundle
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.Fragment
import com.example.shiftcare.databinding.ActivityMainBinding
import com.example.shiftcare.ui.fragments.AnalyticsFragment
import com.example.shiftcare.ui.fragments.HomeFragment
import com.example.shiftcare.ui.fragments.NotificationsFragment
import com.example.shiftcare.ui.fragments.ProfileFragment
import com.example.shiftcare.ui.fragments.ShiftsFragment
import com.example.shiftcare.ui.fragments.SwapFragment
import com.example.shiftcare.ui.viewmodel.ShiftViewModel

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var viewModel: ShiftViewModel

    // Track current fragment to avoid recreating
    private var currentFragmentTag: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Use activity scope ViewModel - SHARED across all fragments
        viewModel = androidx.lifecycle.ViewModelProvider(this)[ShiftViewModel::class.java]

        setupBottomNavigation()
        setupNotificationsIcon()
        setupBackPressHandler() // Add this line

        // Load home fragment by default only if no saved state
        if (savedInstanceState == null) {
            loadFragment(HomeFragment(), "home")
        }
    }

    private fun setupBottomNavigation() {
        binding.bottomNavigation.setOnItemSelectedListener { item ->
            when (item.itemId) {
                com.example.shiftcare.R.id.navigation_home -> {
                    loadFragmentIfNotCurrent(HomeFragment(), "home")
                    true
                }
                com.example.shiftcare.R.id.navigation_shifts -> {
                    loadFragmentIfNotCurrent(ShiftsFragment(), "shifts")
                    true
                }
                com.example.shiftcare.R.id.navigation_analytics -> {
                    loadFragmentIfNotCurrent(AnalyticsFragment(), "analytics")
                    true
                }
                com.example.shiftcare.R.id.navigation_swap -> {
                    loadFragmentIfNotCurrent(SwapFragment(), "swap")
                    true
                }
                com.example.shiftcare.R.id.navigation_profile -> {
                    loadFragmentIfNotCurrent(ProfileFragment(), "profile")
                    true
                }
                else -> false
            }
        }
    }

    private fun setupNotificationsIcon() {
        binding.notificationsIcon.setOnClickListener {
            loadFragment(NotificationsFragment(), "notifications")
        }
    }

    private fun setupBackPressHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (supportFragmentManager.backStackEntryCount > 1) {
                    supportFragmentManager.popBackStack()
                    updateCurrentFragmentTag()
                } else {
                    // If we're at the home screen, minimize the app
                    moveTaskToBack(true)
                }
            }
        })
    }

    private fun loadFragmentIfNotCurrent(fragment: Fragment, tag: String) {
        if (currentFragmentTag != tag) {
            loadFragment(fragment, tag)
        }
    }

    fun loadFragment(fragment: Fragment, tag: String) {
        currentFragmentTag = tag

        supportFragmentManager.beginTransaction()
            .replace(com.example.shiftcare.R.id.fragment_container, fragment, tag)
            .addToBackStack(tag)
            .commit()
    }

    private fun updateCurrentFragmentTag() {
        val fragment = supportFragmentManager.findFragmentById(com.example.shiftcare.R.id.fragment_container)
        currentFragmentTag = when (fragment) {
            is HomeFragment -> "home"
            is ShiftsFragment -> "shifts"
            is SwapFragment -> "swap"
            is AnalyticsFragment -> "analytics"
            is ProfileFragment -> "profile"
            is NotificationsFragment -> "notifications"
            else -> null
        }
    }
}