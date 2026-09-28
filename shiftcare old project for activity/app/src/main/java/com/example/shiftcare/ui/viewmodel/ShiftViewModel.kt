package com.example.shiftcare.ui.viewmodel

import androidx.lifecycle.ViewModel
import com.example.shiftcare.data.model.*
import com.example.shiftcare.util.DataGenerator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.util.*

class ShiftViewModel : ViewModel() {

    private val _currentUser = MutableStateFlow(DataGenerator.getCurrentUser())
    val currentUser: StateFlow<User> = _currentUser

    private val _todayShift = MutableStateFlow(DataGenerator.getTodaysShift())
    val todayShift: StateFlow<Shift> = _todayShift

    private val _nextShift = MutableStateFlow(DataGenerator.getNextShift())
    val nextShift: StateFlow<Shift> = _nextShift

    private val _swapRequests = MutableStateFlow(DataGenerator.getSwapRequests())
    val swapRequests: StateFlow<List<SwapRequest>> = _swapRequests

    private val _notifications = MutableStateFlow(DataGenerator.getNotifications())
    val notifications: StateFlow<List<Notification>> = _notifications

    private val _openSwapOffers = MutableStateFlow(DataGenerator.getOpenSwapOffers())
    val openSwapOffers: StateFlow<List<SwapRequest>> = _openSwapOffers

    private val _octoberShifts = MutableStateFlow(DataGenerator.getOctoberShifts())
    val octoberShifts: StateFlow<List<Shift>> = _octoberShifts

    private val _novemberShifts = MutableStateFlow(DataGenerator.getNovemberShifts())
    val novemberShifts: StateFlow<List<Shift>> = _novemberShifts

    // Add flows for other months
    private val _decemberShifts = MutableStateFlow(DataGenerator.getDecemberShifts())
    val decemberShifts: StateFlow<List<Shift>> = _decemberShifts

    private val _januaryShifts = MutableStateFlow(DataGenerator.getJanuaryShifts())
    val januaryShifts: StateFlow<List<Shift>> = _januaryShifts

    private val _acceptedSwaps = MutableStateFlow<List<SwapRequest>>(emptyList())
    val acceptedSwaps: StateFlow<List<SwapRequest>> = _acceptedSwaps

    private val _acceptedSwapsCount = MutableStateFlow(0)
    val acceptedSwapsCount: StateFlow<Int> = _acceptedSwapsCount

    // Add a flow to notify when shifts are updated
    private val _shiftsUpdated = MutableStateFlow(false)
    val shiftsUpdated: StateFlow<Boolean> = _shiftsUpdated

    private val acceptedSwapIds = mutableSetOf<String>()

    init {
        val initialAccepted = DataGenerator.getInitialAcceptedSwaps()
        _acceptedSwaps.value = initialAccepted
        _acceptedSwapsCount.value = initialAccepted.size
        initialAccepted.forEach { acceptedSwapIds.add(it.id) }
    }

    fun acceptSwap(swapRequest: SwapRequest) {
        try {
            if (acceptedSwapIds.contains(swapRequest.id)) return

            acceptedSwapIds.add(swapRequest.id)

            // Update the swap request status
            val updatedRequests = _swapRequests.value.map { request ->
                if (request.id == swapRequest.id) {
                    request.copy(status = SwapStatus.ACCEPTED, isAccepted = true)
                } else {
                    request
                }
            }
            _swapRequests.value = updatedRequests

            // Add to accepted swaps list
            val updatedAcceptedSwaps = _acceptedSwaps.value.toMutableList()
            val acceptedSwap = swapRequest.copy(status = SwapStatus.ACCEPTED, isAccepted = true)

            // Check if not already in the list to avoid duplicates
            if (!updatedAcceptedSwaps.any { it.id == swapRequest.id }) {
                updatedAcceptedSwaps.add(acceptedSwap)
                _acceptedSwaps.value = updatedAcceptedSwaps
            }

            _acceptedSwapsCount.value = _acceptedSwaps.value.size

            updateShiftForSwap(swapRequest)

            // Notify that shifts have been updated
            _shiftsUpdated.value = !_shiftsUpdated.value

            android.util.Log.d("SwapDebug", "Swap accepted: ${swapRequest.requesterName}. Total accepted: ${_acceptedSwaps.value.size}")

        } catch (e: Exception) {
            android.util.Log.e("SwapDebug", "Error accepting swap: ${e.message}")
        }
    }

    fun acceptStaticSwapOffer(doctorName: String, date: String, department: String) {
        val staticSwapId = "static_$doctorName"
        if (acceptedSwapIds.contains(staticSwapId)) return

        acceptedSwapIds.add(staticSwapId)

        val staticSwapRequest = SwapRequest(
            id = staticSwapId,
            requesterId = "static_user",
            requesterName = doctorName,
            offeredShiftId = "static_offered_${System.currentTimeMillis()}",
            requestedShiftId = "static_requested_${System.currentTimeMillis()}",
            status = SwapStatus.ACCEPTED,
            date = date,
            time = when (doctorName) {
                "Dr. Priya Patel" -> "8 AM - 12 PM"
                "Dr. Rajesh Kumar" -> "2 PM - 10 PM"
                "Dr. Anjali Singh" -> "9 AM - 5 PM"
                else -> "9 AM - 5 PM"
            },
            department = department,
            isAccepted = true
        )

        // Add static swap to accepted swaps
        val updatedAcceptedSwaps = _acceptedSwaps.value.toMutableList()
        if (!updatedAcceptedSwaps.any { it.id == staticSwapId }) {
            updatedAcceptedSwaps.add(staticSwapRequest)
            _acceptedSwaps.value = updatedAcceptedSwaps
        }

        _acceptedSwapsCount.value = _acceptedSwaps.value.size

        // Remove from open offers
        val updatedOffers = _openSwapOffers.value.toMutableList()
        updatedOffers.removeAll { it.requesterName == doctorName }
        _openSwapOffers.value = updatedOffers

        updateShiftForStatic(doctorName, date, department)

        // Notify that shifts have been updated
        _shiftsUpdated.value = !_shiftsUpdated.value

        android.util.Log.d("SwapDebug", "Static swap accepted: $doctorName. Total accepted: ${_acceptedSwaps.value.size}")
    }

    private fun updateShiftForSwap(swapRequest: SwapRequest) {
        try {
            val (month, day) = getMonthAndDay(swapRequest.date)
            updateShift(month, day, swapRequest.department, swapRequest.time)
        } catch (e: Exception) {
            android.util.Log.e("ShiftUpdate", "Error: ${e.message}")
        }
    }

    private fun updateShiftForStatic(doctorName: String, date: String, department: String) {
        try {
            val (month, day) = getMonthAndDay(date)
            val time = when (doctorName) {
                "Dr. Priya Patel" -> "8 AM - 12 PM"
                "Dr. Rajesh Kumar" -> "2 PM - 10 PM"
                "Dr. Anjali Singh" -> "9 AM - 5 PM"
                else -> "9 AM - 5 PM"
            }
            updateShift(month, day, department, time)
        } catch (e: Exception) {
            android.util.Log.e("ShiftUpdate", "Error: ${e.message}")
        }
    }

    private fun updateShift(month: Int, day: Int, department: String, time: String) {
        when (month) {
            Calendar.OCTOBER -> updateOctoberShift(day, department, time)
            Calendar.NOVEMBER -> updateNovemberShift(day, department, time)
            Calendar.DECEMBER -> updateDecemberShift(day, department, time)
            Calendar.JANUARY -> updateJanuaryShift(day, department, time)
            // Add more months as needed
        }
    }

    private fun updateOctoberShift(day: Int, department: String, time: String) {
        val updatedShifts = _octoberShifts.value.toMutableList()
        val shiftIndex = updatedShifts.indexOfFirst { shift ->
            val calendar = Calendar.getInstance()
            calendar.time = shift.date
            calendar.get(Calendar.DAY_OF_MONTH) == day
        }

        if (shiftIndex != -1) {
            val current = updatedShifts[shiftIndex]
            val updated = current.copy(
                status = ShiftStatus.SWAPPED,
                department = department,
                startTime = time.split(" - ").first(),
                endTime = time.split(" - ").last()
            )
            updatedShifts[shiftIndex] = updated
            _octoberShifts.value = updatedShifts
        }
    }

    private fun updateNovemberShift(day: Int, department: String, time: String) {
        val updatedShifts = _novemberShifts.value.toMutableList()
        val shiftIndex = updatedShifts.indexOfFirst { shift ->
            val calendar = Calendar.getInstance()
            calendar.time = shift.date
            calendar.get(Calendar.DAY_OF_MONTH) == day
        }

        if (shiftIndex != -1) {
            val current = updatedShifts[shiftIndex]
            val updated = current.copy(
                status = ShiftStatus.SWAPPED,
                department = department,
                startTime = time.split(" - ").first(),
                endTime = time.split(" - ").last()
            )
            updatedShifts[shiftIndex] = updated
            _novemberShifts.value = updatedShifts
        }
    }

    private fun updateDecemberShift(day: Int, department: String, time: String) {
        val updatedShifts = _decemberShifts.value.toMutableList()
        val shiftIndex = updatedShifts.indexOfFirst { shift ->
            val calendar = Calendar.getInstance()
            calendar.time = shift.date
            calendar.get(Calendar.DAY_OF_MONTH) == day
        }

        if (shiftIndex != -1) {
            val current = updatedShifts[shiftIndex]
            val updated = current.copy(
                status = ShiftStatus.SWAPPED,
                department = department,
                startTime = time.split(" - ").first(),
                endTime = time.split(" - ").last()
            )
            updatedShifts[shiftIndex] = updated
            _decemberShifts.value = updatedShifts
        }
    }

    private fun updateJanuaryShift(day: Int, department: String, time: String) {
        val updatedShifts = _januaryShifts.value.toMutableList()
        val shiftIndex = updatedShifts.indexOfFirst { shift ->
            val calendar = Calendar.getInstance()
            calendar.time = shift.date
            calendar.get(Calendar.DAY_OF_MONTH) == day
        }

        if (shiftIndex != -1) {
            val current = updatedShifts[shiftIndex]
            val updated = current.copy(
                status = ShiftStatus.SWAPPED,
                department = department,
                startTime = time.split(" - ").first(),
                endTime = time.split(" - ").last()
            )
            updatedShifts[shiftIndex] = updated
            _januaryShifts.value = updatedShifts
        }
    }

    private fun getMonthAndDay(dateString: String): Pair<Int, Int> {
        return when {
            dateString.contains("Oct 26") -> Pair(Calendar.OCTOBER, 26)
            dateString.contains("Oct 27") -> Pair(Calendar.OCTOBER, 27)
            dateString.contains("Oct 28") -> Pair(Calendar.OCTOBER, 28)
            dateString.contains("Nov 2") -> Pair(Calendar.NOVEMBER, 2)
            dateString.contains("Nov 5") -> Pair(Calendar.NOVEMBER, 5)
            dateString.contains("Dec") -> {
                val day = extractDayFromDate(dateString)
                Pair(Calendar.DECEMBER, day)
            }
            dateString.contains("Jan") -> {
                val day = extractDayFromDate(dateString)
                Pair(Calendar.JANUARY, day)
            }
            else -> {
                // Default to current day
                val calendar = Calendar.getInstance()
                Pair(calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH))
            }
        }
    }

    private fun extractDayFromDate(dateString: String): Int {
        val regex = """\b(\d{1,2})\b""".toRegex()
        val match = regex.find(dateString)
        return match?.value?.toIntOrNull() ?: 1
    }

    fun getShiftsForMonth(month: Int, year: Int): List<Shift> {
        return when {
            month == Calendar.OCTOBER && year == 2025 -> _octoberShifts.value
            month == Calendar.NOVEMBER && year == 2025 -> _novemberShifts.value
            month == Calendar.DECEMBER && year == 2025 -> _decemberShifts.value
            month == Calendar.JANUARY && year == 2026 -> _januaryShifts.value
            else -> emptyList() // Other months show as normal calendar
        }
    }

    fun getNewSwapRequests(): List<SwapRequest> {
        return _swapRequests.value.filter {
            it.status == SwapStatus.NEW && !acceptedSwapIds.contains(it.id)
        }
    }

    fun getPendingSwapRequests(): List<SwapRequest> {
        return _swapRequests.value.filter { it.status == SwapStatus.PENDING }
    }

    fun getAcceptedSwaps(): List<SwapRequest> {
        return _acceptedSwaps.value
    }

    fun isStaticOfferAccepted(doctorName: String): Boolean {
        return acceptedSwapIds.contains("static_$doctorName")
    }

    fun createSwapRequest(requestedShiftId: String, offeredShiftId: String, date: String, time: String, department: String) {
        val newRequest = SwapRequest(
            id = UUID.randomUUID().toString(),
            requesterId = _currentUser.value.id,
            requesterName = "You",
            offeredShiftId = offeredShiftId,
            requestedShiftId = requestedShiftId,
            status = SwapStatus.PENDING,
            date = date,
            time = time,
            department = department
        )

        val updatedRequests = _swapRequests.value.toMutableList()
        updatedRequests.add(newRequest)
        _swapRequests.value = updatedRequests
    }

    fun getTotalHours(): Int = 160
    fun getMonthlyTarget(): Int = 180
    fun getSuccessfulSwaps(): Int = _acceptedSwapsCount.value
    fun getTotalSwapRequests(): Int = 10
    fun getSwapsRequested(): Int = 12
    fun getSwapsAccepted(): Int = _acceptedSwapsCount.value
    fun getApprovalRate(): Double = if (_acceptedSwapsCount.value > 0) 83.0 else 0.0

    fun shouldShowRestAlert(): Boolean {
        return _acceptedSwapsCount.value > 2
    }

    fun getUnreadNotificationsCount(): Int {
        return _notifications.value.size
    }

    fun getAvailableSwapOffersCount(): Int {
        return _openSwapOffers.value.size
    }
}