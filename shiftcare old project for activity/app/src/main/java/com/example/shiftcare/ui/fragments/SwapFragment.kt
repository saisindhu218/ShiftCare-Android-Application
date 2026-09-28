package com.example.shiftcare.ui.fragments

import android.app.AlertDialog
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import com.example.shiftcare.databinding.FragmentSwapBinding
import com.example.shiftcare.ui.viewmodel.ShiftViewModel

class SwapFragment : Fragment() {

    private var _binding: FragmentSwapBinding? = null
    private val binding get() = _binding!!
    private lateinit var viewModel: ShiftViewModel

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSwapBinding.inflate(inflater, container, false)
        Log.d("SwapFragment", "onCreateView called")
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Log.d("SwapFragment", "onViewCreated called")

        viewModel = ViewModelProvider(requireActivity())[ShiftViewModel::class.java]

        try {
            setupClickListeners()
            setupStaticSwapOffers()
            observeViewModel()
            Log.d("SwapFragment", "Setup completed successfully")
        } catch (e: Exception) {
            Log.e("SwapFragment", "Error in onViewCreated: ${e.message}", e)
            Toast.makeText(requireContext(), "Error setting up swap screen", Toast.LENGTH_SHORT).show()
        }
    }

    private fun observeViewModel() {
        // Observe accepted swaps
        lifecycleScope.launch {
            viewModel.acceptedSwaps.collect { acceptedSwaps ->
                Log.d("SwapFragment", "Accepted swaps updated: ${acceptedSwaps.size} items")
                updateAcceptedSwaps(acceptedSwaps)
            }
        }

        // Observe swap requests
        lifecycleScope.launch {
            viewModel.swapRequests.collect { _ ->
                updatePendingRequests()
            }
        }
    }

    private fun setupUI() {
        updatePendingRequests()
        updateAcceptedSwaps(viewModel.acceptedSwaps.value)
        updateStaticSwapOffers()
    }

    private fun updatePendingRequests() {
        try {
            val pendingRequests = viewModel.getPendingSwapRequests()
            Log.d("SwapFragment", "Pending requests: ${pendingRequests.size}")

            if (pendingRequests.isNotEmpty()) {
                binding.textPendingRequest.text = buildPendingRequestsText(pendingRequests)
                binding.textPendingRequest.visibility = View.VISIBLE

                binding.textPendingRequest.setOnClickListener {
                    showPendingRequestsDialog(pendingRequests)
                }
            } else {
                binding.textPendingRequest.visibility = View.GONE
            }
        } catch (e: Exception) {
            Log.e("SwapFragment", "Error updating pending requests: ${e.message}")
        }
    }

    private fun buildPendingRequestsText(requests: List<com.example.shiftcare.data.model.SwapRequest>): String {
        return if (requests.size == 1) {
            String.format("To: %s, %s (%s)", requests[0].requesterName, requests[0].date, requests[0].time)
        } else {
            String.format("%d pending requests - Tap to view", requests.size)
        }
    }

    private fun showPendingRequestsDialog(requests: List<com.example.shiftcare.data.model.SwapRequest>) {
        val requestsText = requests.joinToString("\n\n") { request ->
            String.format("To: %s\nDate: %s\nTime: %s\nDepartment: %s",
                request.requesterName, request.date, request.time, request.department)
        }

        AlertDialog.Builder(requireContext())
            .setTitle("Your Pending Swap Requests")
            .setMessage(requestsText)
            .setPositiveButton("OK") { dialog, _ -> dialog.dismiss() }
            .show()
    }

    private fun updateAcceptedSwaps(acceptedSwaps: List<com.example.shiftcare.data.model.SwapRequest>) {
        try {
            Log.d("SwapFragment", "Updating accepted swaps: ${acceptedSwaps.size} items")

            // Clear existing views except the "no swaps" message
            binding.acceptedSwapsContainer.removeAllViews()

            if (acceptedSwaps.isNotEmpty()) {
                binding.textAcceptedSwapsTitle.visibility = View.VISIBLE
                binding.acceptedSwapsContainer.visibility = View.VISIBLE

                // Add each accepted swap as a card view
                acceptedSwaps.forEach { swap ->
                    val swapCard = createAcceptedSwapCard(swap)
                    binding.acceptedSwapsContainer.addView(swapCard)
                }
                Log.d("SwapFragment", "Accepted swaps shown: ${acceptedSwaps.size}")
            } else {
                binding.textAcceptedSwapsTitle.visibility = View.GONE
                binding.acceptedSwapsContainer.visibility = View.VISIBLE

                // Show "no accepted swaps" message
                val noSwapsText = TextView(requireContext()).apply {
                    text = "No accepted swaps yet"
                    setTextColor(resources.getColor(com.example.shiftcare.R.color.text_secondary, null))
                    textSize = 14f
                    gravity = android.view.Gravity.CENTER
                    setPadding(0, 16.dpToPx(), 0, 16.dpToPx())
                }
                binding.acceptedSwapsContainer.addView(noSwapsText)
                Log.d("SwapFragment", "No accepted swaps to show")
            }
        } catch (e: Exception) {
            Log.e("SwapFragment", "Error updating accepted swaps: ${e.message}", e)
        }
    }

    private fun createAcceptedSwapCard(swap: com.example.shiftcare.data.model.SwapRequest): View {
        val cardView = LayoutInflater.from(requireContext()).inflate(com.example.shiftcare.R.layout.swap_offer_item, null)

        try {
            val textDoctorName = cardView.findViewById<TextView>(com.example.shiftcare.R.id.text_doctor_name)
            val textShiftDetails = cardView.findViewById<TextView>(com.example.shiftcare.R.id.text_shift_details)
            val textDepartment = cardView.findViewById<TextView>(com.example.shiftcare.R.id.text_department)
            val acceptButton = cardView.findViewById<View>(com.example.shiftcare.R.id.button_accept)

            textDoctorName.text = swap.requesterName
            textShiftDetails.text = String.format("%s (%s)", swap.date, swap.time)
            textDepartment.text = swap.department

            // Hide accept button for accepted swaps
            acceptButton.visibility = View.GONE

            // Add some margin between cards
            val layoutParams = ViewGroup.MarginLayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            layoutParams.setMargins(0, 0, 0, 8.dpToPx())
            cardView.layoutParams = layoutParams

        } catch (e: Exception) {
            Log.e("SwapFragment", "Error creating swap card: ${e.message}")
        }

        return cardView
    }

    private fun setupStaticSwapOffers() {
        Log.d("SwapFragment", "Setting up static swap offers")
        // Set up click listeners for static offers
        binding.buttonAcceptPriya.setOnClickListener {
            Log.d("SwapFragment", "Accept Priya clicked")
            acceptStaticSwapOffer("Dr. Priya Patel", "Oct 28", "Cardiology Dept")
        }

        binding.buttonAcceptRajesh.setOnClickListener {
            Log.d("SwapFragment", "Accept Rajesh clicked")
            acceptStaticSwapOffer("Dr. Rajesh Kumar", "Nov 2", "ICU")
        }

        binding.buttonAcceptAnjali.setOnClickListener {
            Log.d("SwapFragment", "Accept Anjali clicked")
            acceptStaticSwapOffer("Dr. Anjali Singh", "Nov 5", "Emergency Ward")
        }

        updateStaticSwapOffers()
    }

    private fun updateStaticSwapOffers() {
        try {
            Log.d("SwapFragment", "Updating static offers visibility")
            // Hide offers that are already accepted
            if (viewModel.isStaticOfferAccepted("Dr. Priya Patel")) {
                binding.cardPriyaPatel.visibility = View.GONE
                Log.d("SwapFragment", "Priya Patel offer hidden")
            } else {
                binding.cardPriyaPatel.visibility = View.VISIBLE
            }

            if (viewModel.isStaticOfferAccepted("Dr. Rajesh Kumar")) {
                binding.cardRajeshKumar.visibility = View.GONE
                Log.d("SwapFragment", "Rajesh Kumar offer hidden")
            } else {
                binding.cardRajeshKumar.visibility = View.VISIBLE
            }

            if (viewModel.isStaticOfferAccepted("Dr. Anjali Singh")) {
                binding.cardAnjaliSingh.visibility = View.GONE
                Log.d("SwapFragment", "Anjali Singh offer hidden")
            } else {
                binding.cardAnjaliSingh.visibility = View.VISIBLE
            }
        } catch (e: Exception) {
            Log.e("SwapFragment", "Error updating static offers: ${e.message}")
        }
    }

    private fun acceptStaticSwapOffer(doctorName: String, date: String, department: String) {
        try {
            Log.d("SwapFragment", "Accepting static swap: $doctorName")
            viewModel.acceptStaticSwapOffer(doctorName, date, department)
            Toast.makeText(requireContext(),
                String.format("Swap accepted with %s!", doctorName),
                Toast.LENGTH_SHORT).show()

            // Update UI immediately
            updateStaticSwapOffers()
        } catch (e: Exception) {
            Log.e("SwapFragment", "Error accepting static swap: ${e.message}", e)
            Toast.makeText(requireContext(), "Error accepting swap: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupClickListeners() {
        binding.buttonCreateNewSwap.setOnClickListener {
            showCreateSwapDialog()
        }
    }

    private fun showCreateSwapDialog() {
        try {
            val dialogView = LayoutInflater.from(requireContext()).inflate(com.example.shiftcare.R.layout.dialog_create_swap, null)

            val spinnerShiftsToSwap = dialogView.findViewById<android.widget.Spinner>(com.example.shiftcare.R.id.spinner_shifts_to_swap)
            val spinnerAvailableShifts = dialogView.findViewById<android.widget.Spinner>(com.example.shiftcare.R.id.spinner_available_shifts)

            setupShiftSpinners(spinnerShiftsToSwap, spinnerAvailableShifts)

            AlertDialog.Builder(requireContext())
                .setTitle("Create Swap Request")
                .setView(dialogView)
                .setPositiveButton("Send Request") { dialog, _ ->
                    val selectedShiftToSwap = spinnerShiftsToSwap.selectedItem as? String
                    val selectedAvailableShift = spinnerAvailableShifts.selectedItem as? String

                    if (selectedShiftToSwap != null && selectedAvailableShift != null) {
                        createSwapRequest(selectedShiftToSwap)
                        Toast.makeText(requireContext(), "Swap request sent!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(requireContext(), "Please select both shifts", Toast.LENGTH_SHORT).show()
                    }
                    dialog.dismiss()
                }
                .setNegativeButton("Cancel") { dialog, _ -> dialog.dismiss() }
                .show()
        } catch (e: Exception) {
            Log.e("SwapFragment", "Error showing create swap dialog: ${e.message}")
            Toast.makeText(requireContext(), "Error creating swap request", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupShiftSpinners(spinnerShiftsToSwap: android.widget.Spinner, spinnerAvailableShifts: android.widget.Spinner) {
        val shiftsToSwap = arrayOf(
            "Oct 15, 2025 (09:00 AM - 06:00 PM) - Cardiology",
            "Oct 17, 2025 (07:00 AM - 04:00 PM) - Cardiology",
            "Oct 22, 2025 (08:00 AM - 05:00 PM) - Cardiology",
            "Oct 29, 2025 (08:00 AM - 05:00 PM) - Cardiology"
        )

        val availableShifts = arrayOf(
            "Oct 7, 2025 (08:00 AM - 12:00 PM) - Available",
            "Oct 8, 2025 (02:00 PM - 10:00 PM) - Available",
            "Oct 14, 2025 (08:00 AM - 12:00 PM) - Available",
            "Oct 16, 2025 (02:00 PM - 10:00 PM) - Available",
            "Oct 21, 2025 (08:00 AM - 12:00 PM) - Available",
            "Oct 23, 2025 (02:00 PM - 10:00 PM) - Available",
            "Oct 30, 2025 (02:00 PM - 10:00 PM) - Available"
        )

        val shiftsAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, shiftsToSwap)
        shiftsAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerShiftsToSwap.adapter = shiftsAdapter

        val availableAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_item, availableShifts)
        availableAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        spinnerAvailableShifts.adapter = availableAdapter
    }

    private fun createSwapRequest(shiftToSwap: String) {
        val swapDate = extractDateFromShiftString(shiftToSwap)
        val swapTime = extractTimeFromShiftString(shiftToSwap)

        viewModel.createSwapRequest(
            requestedShiftId = "shift_${System.currentTimeMillis()}",
            offeredShiftId = "available_${System.currentTimeMillis()}",
            date = swapDate,
            time = swapTime,
            department = "Cardiology Dept"
        )
    }

    private fun extractDateFromShiftString(shiftString: String): String {
        return shiftString.substringBefore(" (").trim()
    }

    private fun extractTimeFromShiftString(shiftString: String): String {
        val timePart = shiftString.substringAfter("(").substringBefore(")")
        return timePart.trim()
    }

    override fun onResume() {
        super.onResume()
        Log.d("SwapFragment", "onResume called")
        setupUI()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        Log.d("SwapFragment", "onDestroyView called")
    }

    private fun Int.dpToPx(): Int {
        val density = resources.displayMetrics.density
        return (this * density).toInt()
    }
}