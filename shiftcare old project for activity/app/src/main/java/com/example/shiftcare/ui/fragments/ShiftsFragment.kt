package com.example.shiftcare.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.example.shiftcare.databinding.FragmentShiftsBinding
import com.example.shiftcare.data.model.ShiftStatus
import com.example.shiftcare.ui.viewmodel.ShiftViewModel
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class ShiftsFragment : Fragment() {

    private var _binding: FragmentShiftsBinding? = null
    private val binding get() = _binding!!
    private lateinit var viewModel: ShiftViewModel

    private var currentFilter: ShiftFilter = ShiftFilter.ASSIGNED_SHIFTS
    private var currentMonth: Int = Calendar.getInstance().get(Calendar.MONTH)
    private var currentYear: Int = Calendar.getInstance().get(Calendar.YEAR)

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentShiftsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewModel = ViewModelProvider(requireActivity())[ShiftViewModel::class.java]

        setupUI()
        setupClickListeners()
        observeViewModel()
        setupCalendar()
    }

    private fun observeViewModel() {
        lifecycleScope.launch {
            viewModel.shiftsUpdated.collect {
                if (_binding != null) {
                    setupCalendar()
                }
            }
        }
    }

    private fun setupUI() {
        val todayShift = viewModel.todayShift.value
        binding.textTodayShiftTime.text = "${todayShift.startTime} - ${todayShift.endTime}"
        binding.textTodayShiftLocation.text = todayShift.department
        updateMonthYearText()
    }

    private fun updateMonthYearText() {
        val calendar = Calendar.getInstance().apply {
            set(Calendar.MONTH, currentMonth)
            set(Calendar.YEAR, currentYear)
        }
        val monthYearFormat = SimpleDateFormat("MMMM yyyy", Locale.getDefault())
        binding.textMonthYear.text = monthYearFormat.format(calendar.time)
    }

    private fun setupCalendar() {
        val allShifts = viewModel.getShiftsForMonth(currentMonth, currentYear)
        val filteredShifts = when (currentFilter) {
            ShiftFilter.ASSIGNED_SHIFTS -> allShifts.filter { it.status == ShiftStatus.ASSIGNED || it.status == ShiftStatus.SWAPPED }
            ShiftFilter.AVAILABILITY -> allShifts.filter { it.status == ShiftStatus.AVAILABLE }
        }
        updateCalendarView(filteredShifts)
    }

    private fun updateCalendarView(shifts: List<com.example.shiftcare.data.model.Shift>) {
        binding.calendarContainer.removeAllViews()

        // Header
        val daysHeader = arrayOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
        val headerLayout = LinearLayout(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            orientation = LinearLayout.HORIZONTAL
            weightSum = 7f
        }

        daysHeader.forEach { day ->
            val dayView = TextView(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                    gravity = android.view.Gravity.CENTER
                    setPadding(8, 16, 8, 16)
                }
                text = day
                textSize = 14f
                setTextColor(ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.text_secondary))
                gravity = android.view.Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
            }
            headerLayout.addView(dayView)
        }
        binding.calendarContainer.addView(headerLayout)

        // Calendar days
        val calendar = Calendar.getInstance().apply {
            set(Calendar.YEAR, currentYear)
            set(Calendar.MONTH, currentMonth)
            set(Calendar.DAY_OF_MONTH, 1)
        }

        val firstDayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
        val maxDaysInMonth = calendar.getActualMaximum(Calendar.DAY_OF_MONTH)

        var currentRowLayout = createCalendarRow()

        // Empty days before the 1st
        for (i in 1 until firstDayOfWeek) {
            currentRowLayout.addView(createEmptyDayView())
        }

        // Month days
        for (day in 1..maxDaysInMonth) {
            if (currentRowLayout.childCount == 7) {
                binding.calendarContainer.addView(currentRowLayout)
                currentRowLayout = createCalendarRow()
            }

            // Find shift for this day
            val shift = shifts.find { shiftItem ->
                val shiftCalendar = Calendar.getInstance().apply { time = shiftItem.date }
                shiftCalendar.get(Calendar.YEAR) == currentYear &&
                        shiftCalendar.get(Calendar.MONTH) == currentMonth &&
                        shiftCalendar.get(Calendar.DAY_OF_MONTH) == day
            }

            val dayView = createCalendarDayView(day, shift)
            currentRowLayout.addView(dayView)
        }

        // Add remaining empty days in last row
        while (currentRowLayout.childCount < 7) {
            currentRowLayout.addView(createEmptyDayView())
        }
        binding.calendarContainer.addView(currentRowLayout)
    }

    private fun createCalendarRow(): LinearLayout {
        return LinearLayout(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            orientation = LinearLayout.HORIZONTAL
            weightSum = 7f
        }
    }

    private fun createEmptyDayView(): View {
        return View(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(0, 120, 1f).apply {
                setMargins(2, 2, 2, 2)
            }
            setBackgroundColor(ContextCompat.getColor(requireContext(), android.R.color.transparent))
        }
    }

    private fun createCalendarDayView(day: Int, shift: com.example.shiftcare.data.model.Shift?): LinearLayout {
        return LinearLayout(requireContext()).apply {
            layoutParams = LinearLayout.LayoutParams(0, 120, 1f).apply {
                setMargins(2, 2, 2, 2)
            }
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(4, 8, 4, 8)

            // Check if it's weekend
            val calendar = Calendar.getInstance().apply {
                set(Calendar.YEAR, currentYear)
                set(Calendar.MONTH, currentMonth)
                set(Calendar.DAY_OF_MONTH, day)
            }
            val dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK)
            val isWeekend = dayOfWeek == Calendar.SUNDAY || dayOfWeek == Calendar.SATURDAY

            // Background color logic - STRICTLY FOLLOW COLOR CODES
            val bgColor = when {
                shift != null -> {
                    when (shift.status) {
                        ShiftStatus.ASSIGNED -> ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.shift_assigned) // Blue
                        ShiftStatus.SWAPPED -> ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.shift_swapped) // Teal
                        ShiftStatus.AVAILABLE -> ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.shift_available) // Grey
                        else -> ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.shift_assigned)
                    }
                }
                isWeekend -> ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.day_no_work) // Cream
                else -> ContextCompat.getColor(requireContext(), android.R.color.transparent)
            }
            setBackgroundColor(bgColor)

            // Day number
            val dayTextView = TextView(requireContext()).apply {
                text = day.toString()
                textSize = 16f
                setTextColor(
                    if (shift != null) ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.white)
                    else ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.text_primary)
                )
                gravity = android.view.Gravity.CENTER
                setTypeface(null, android.graphics.Typeface.BOLD)
            }
            addView(dayTextView)

            // Shift info
            shift?.let {
                val timeTextView = TextView(requireContext()).apply {
                    text = "${it.startTime}-${it.endTime}"
                    textSize = 10f
                    setTextColor(ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.white))
                    gravity = android.view.Gravity.CENTER
                }
                addView(timeTextView)

                val statusTextView = TextView(requireContext()).apply {
                    text = when (it.status) {
                        ShiftStatus.ASSIGNED -> "ASSIGNED"
                        ShiftStatus.SWAPPED -> "SWAPPED"
                        ShiftStatus.AVAILABLE -> "AVAILABLE"
                        else -> "ASSIGNED"
                    }
                    textSize = 9f
                    setTextColor(ContextCompat.getColor(requireContext(), com.example.shiftcare.R.color.white))
                    gravity = android.view.Gravity.CENTER
                }
                addView(statusTextView)
            }
        }
    }

    private fun setupClickListeners() {
        binding.buttonAssignShift.setOnClickListener {
            Toast.makeText(requireContext(), "Assign Shift", Toast.LENGTH_SHORT).show()
        }

        binding.buttonMarkAvailability.setOnClickListener {
            Toast.makeText(requireContext(), "Mark Availability", Toast.LENGTH_SHORT).show()
        }

        binding.radioAssignedShifts.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                currentFilter = ShiftFilter.ASSIGNED_SHIFTS
                setupCalendar()
            }
        }

        binding.radioAvailability.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                currentFilter = ShiftFilter.AVAILABILITY
                setupCalendar()
            }
        }

        // Month navigation
        binding.buttonPreviousMonth.setOnClickListener {
            navigateToPreviousMonth()
        }

        binding.buttonNextMonth.setOnClickListener {
            navigateToNextMonth()
        }
    }

    private fun navigateToPreviousMonth() {
        currentMonth--
        if (currentMonth < Calendar.JANUARY) {
            currentMonth = Calendar.DECEMBER
            currentYear--
        }
        updateMonthYearText()
        setupCalendar()
    }

    private fun navigateToNextMonth() {
        currentMonth++
        if (currentMonth > Calendar.DECEMBER) {
            currentMonth = Calendar.JANUARY
            currentYear++
        }
        updateMonthYearText()
        setupCalendar()
    }

    override fun onResume() {
        super.onResume()
        setupCalendar()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

enum class ShiftFilter {
    ASSIGNED_SHIFTS,
    AVAILABILITY
}