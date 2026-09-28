package com.example.shiftcare.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import com.example.shiftcare.databinding.FragmentHomeBinding
import com.example.shiftcare.ui.viewmodel.ShiftViewModel
import com.example.shiftcare.ui.activities.MainActivity
import com.example.shiftcare.data.model.SwapStatus
import android.widget.Toast

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private lateinit var viewModel: ShiftViewModel

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewModel = ViewModelProvider(requireActivity())[ShiftViewModel::class.java]

        setupUI()
        setupClickListeners()
        observeViewModel()
    }

    private fun observeViewModel() {
        // Observe user data
        lifecycleScope.launch {
            viewModel.currentUser.collect { user ->
                try {
                    if (_binding != null) {
                        binding.textGreeting.text = String.format("Hello, %s", user.name.split(" ").last())
                        binding.textRole.text = String.format("%s, %s", user.role, user.specialization)
                    }
                } catch (e: Exception) {
                    // Handle any UI update errors
                }
            }
        }

        // Observe today's shift
        lifecycleScope.launch {
            viewModel.todayShift.collect { shift ->
                try {
                    if (_binding != null) {
                        binding.textTodayShiftTime.text = String.format("%s - %s", shift.startTime, shift.endTime)
                        binding.textTodayShiftLocation.text = shift.department
                    }
                } catch (e: Exception) {
                    // Handle any UI update errors
                }
            }
        }

        // Observe next shift
        lifecycleScope.launch {
            viewModel.nextShift.collect { shift ->
                try {
                    if (_binding != null) {
                        binding.textNextShiftTime.text = String.format("Tomorrow, %s - %s", shift.startTime, shift.endTime)
                    }
                } catch (e: Exception) {
                    // Handle any UI update errors
                }
            }
        }

        // Observe swap requests
        lifecycleScope.launch {
            viewModel.swapRequests.collect { _ ->
                if (_binding != null) {
                    updateSwapRequestsUI()
                }
            }
        }

        // Observe accepted swaps to update UI
        lifecycleScope.launch {
            viewModel.acceptedSwaps.collect {
                if (_binding != null) {
                    updateSwapRequestsUI()
                }
            }
        }
    }

    private fun setupUI() {
        if (_binding != null) {
            binding.textGreeting.text = "Hello, User"
            binding.textRole.text = "Loading..."
        }
    }

    private fun updateSwapRequestsUI() {
        try {
            if (_binding == null) return // Early return if binding is null

            val newSwapRequests = viewModel.getNewSwapRequests()
            val newRequests = newSwapRequests.count { it.status == SwapStatus.NEW }
            binding.textNewRequests.text = String.format("%d New", newRequests)

            // Show first new request
            val newRequest = newSwapRequests.firstOrNull { it.status == SwapStatus.NEW }
            if (newRequest != null) {
                binding.textSwapRequest.text = String.format("%s needs swap for %s", newRequest.requesterName, newRequest.date)
                binding.buttonAccept.visibility = View.VISIBLE
                binding.buttonAccept.isEnabled = true
            } else {
                binding.textSwapRequest.text = "No new swap requests"
                binding.buttonAccept.visibility = View.GONE
            }

            // Show pending request
            val pendingRequests = viewModel.getPendingSwapRequests()
            val pendingRequest = pendingRequests.firstOrNull()
            if (pendingRequest != null) {
                binding.textPendingRequest.text = String.format("Pending: My request for %s", pendingRequest.date)
                binding.textPendingRequest.visibility = View.VISIBLE
            } else {
                binding.textPendingRequest.visibility = View.GONE
            }
        } catch (e: Exception) {
            // Handle UI update errors
            if (_binding != null) {
                binding.textSwapRequest.text = "Error loading requests"
                binding.buttonAccept.visibility = View.GONE
            }
        }
    }

    private fun setupClickListeners() {
        if (_binding == null) return

        binding.buttonViewSchedule.setOnClickListener {
            try {
                val mainActivity = requireActivity() as MainActivity
                mainActivity.loadFragment(ShiftsFragment(), "shifts")
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error navigating to schedule", Toast.LENGTH_SHORT).show()
            }
        }

        binding.buttonNotifyAdmin.setOnClickListener {
            Toast.makeText(requireContext(), "Admin notified", Toast.LENGTH_SHORT).show()
        }

        binding.buttonAccept.setOnClickListener {
            try {
                // Disable button temporarily to prevent multiple clicks
                binding.buttonAccept.isEnabled = false

                val newSwapRequests = viewModel.getNewSwapRequests()
                val newRequest = newSwapRequests.firstOrNull { it.status == SwapStatus.NEW }
                if (newRequest != null) {
                    viewModel.acceptSwap(newRequest)
                    Toast.makeText(requireContext(), "Swap accepted! Shift updated.", Toast.LENGTH_SHORT).show()

                    // Update UI immediately
                    updateSwapRequestsUI()
                } else {
                    Toast.makeText(requireContext(), "No swap request to accept", Toast.LENGTH_SHORT).show()
                    binding.buttonAccept.isEnabled = true
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error accepting swap: ${e.message}", Toast.LENGTH_SHORT).show()
                binding.buttonAccept.isEnabled = true
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) {
            updateSwapRequestsUI()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}