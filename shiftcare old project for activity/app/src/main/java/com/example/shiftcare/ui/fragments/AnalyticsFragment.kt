package com.example.shiftcare.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.shiftcare.R  // Add this import
import com.example.shiftcare.databinding.FragmentAnalyticsBinding
import com.example.shiftcare.ui.viewmodel.ShiftViewModel
import com.example.shiftcare.util.DataGenerator

class AnalyticsFragment : Fragment() {

    private var _binding: FragmentAnalyticsBinding? = null
    private val binding get() = _binding!!
    private lateinit var viewModel: ShiftViewModel

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAnalyticsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewModel = ViewModelProvider(this)[ShiftViewModel::class.java]
        setupUI()
        setupRestAlert()
    }

    private fun setupUI() {
        // Set user info - USING RESOURCE STRINGS
        val user = DataGenerator.getCurrentUser()
        binding.textGreeting.text = getString(R.string.hello_dr, user.name)  // This should work now
        binding.textRole.text = "${user.role}, ${user.specialization}"

        // Set overview data - DIRECT DATA ACCESS
        binding.textTotalHours.text = "${viewModel.getTotalHours()}"
        binding.textHoursTarget.text = "/ ${viewModel.getMonthlyTarget()} hrs"

        val overtime = viewModel.getTotalHours() - viewModel.getMonthlyTarget()
        binding.textOvertimeHours.text = if (overtime > 0) "+${overtime} hrs overtime" else "~${-overtime} hrs overtime"

        binding.textSuccessfulSwaps.text = "${viewModel.getSuccessfulSwaps()} / ${viewModel.getTotalSwapRequests()}"

        // Set swap statistics
        binding.textSwapRequested.text = "${viewModel.getSwapsRequested()}"
        binding.textSwapAccepted.text = "${viewModel.getSwapsAccepted()}"
        binding.textApprovalRate.text = "Approval Rate: ${viewModel.getApprovalRate().toInt()}%"
    }

    private fun setupRestAlert() {
        if (viewModel.shouldShowRestAlert()) {
            binding.restAlert.visibility = View.VISIBLE
            binding.textRestAlert.text = "Rest Alert: You've accepted more than 2 swaps this month. Ensure you take adequate rest."
        } else {
            binding.restAlert.visibility = View.GONE
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}