package com.example.shiftcare.data.model

enum class SwapStatus {
    PENDING, ACCEPTED, REJECTED, NEW, COMPLETED
}

data class SwapRequest(
    val id: String,
    val requesterId: String,
    val requesterName: String,
    val offeredShiftId: String,
    val requestedShiftId: String,
    val status: SwapStatus,
    val date: String,
    val time: String,
    val department: String,
    val shiftDate: String = "",
    val isAccepted: Boolean = false
)