package com.example.shiftcare.data.model

import java.util.*

enum class ShiftStatus {
    ASSIGNED, AVAILABLE, SWAPPED, OVERTIME, COMPLETED, SWAP
}

data class Shift(
    val id: String,
    val doctorId: String,
    val date: Date,
    val startTime: String,
    val endTime: String,
    val department: String,
    val location: String,
    val status: ShiftStatus
)