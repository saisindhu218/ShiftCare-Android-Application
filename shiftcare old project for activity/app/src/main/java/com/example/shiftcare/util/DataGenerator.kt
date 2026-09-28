package com.example.shiftcare.util

import com.example.shiftcare.data.model.*
import java.util.*
import kotlin.collections.ArrayList

object DataGenerator {

    fun getCurrentUser(): User {
        return User(
            id = "1",
            name = "Dr. Sharma",
            role = "Surgeon",
            specialization = "Cardiology",
            hospitalUnit = "Main Hospital",
            email = "sharma@hospital.com",
            phone = "+91 9876543210"
        )
    }

    fun getDrLee(): User {
        return User(
            id = "2",
            name = "Dr. Lee",
            role = "Surgeon",
            specialization = "Cardiology",
            hospitalUnit = "Main Hospital",
            email = "lee@hospital.com",
            phone = "+91 9876543211"
        )
    }

    fun getTodaysShift(): Shift {
        val calendar = Calendar.getInstance()
        return Shift(
            id = "1",
            doctorId = "1",
            date = calendar.time,
            startTime = "08:00 AM",
            endTime = "05:00 PM",
            department = "Cardiology Dept",
            location = "Main Hospital",
            status = ShiftStatus.ASSIGNED
        )
    }

    fun getNextShift(): Shift {
        val calendar = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, 1) }
        return Shift(
            id = "2",
            doctorId = "1",
            date = calendar.time,
            startTime = "08:00 AM",
            endTime = "12:00 PM",
            department = "Cardiology Dept",
            location = "Main Hospital",
            status = ShiftStatus.ASSIGNED
        )
    }

    fun getSwapRequests(): List<SwapRequest> {
        return listOf(
            SwapRequest(
                id = "1",
                requesterId = "3",
                requesterName = "Dr. Chen",
                offeredShiftId = "5",
                requestedShiftId = "1",
                status = SwapStatus.NEW,
                date = "Mon, Oct 26",
                time = "08:00 AM - 05:00 PM",
                department = "Cardiology",
                shiftDate = "Oct 26"
            ),
            SwapRequest(
                id = "2",
                requesterId = "1",
                requesterName = "You",
                offeredShiftId = "6",
                requestedShiftId = "7",
                status = SwapStatus.PENDING,
                date = "Tue, Oct 27",
                time = "08:00 AM - 05:00 PM",
                department = "Cardiology",
                shiftDate = "Oct 27"
            )
        )
    }

    fun getNotifications(): List<Notification> {
        return listOf(
            Notification(
                id = "1",
                title = "URGENT STAFFING NEED!",
                message = "ICU - Night Shift (10 PM - 8 AM)",
                type = NotificationType.URGENT_NEED,
                date = "Now",
                isUrgent = true,
                actionText = "Tap to volunteer"
            ),
            Notification(
                id = "2",
                title = "Shift swap with Dr. Chen on Oct 27",
                message = "Nov 15 APPROVED",
                type = NotificationType.SWAP_APPROVAL,
                date = "2 hours ago"
            ),
            Notification(
                id = "3",
                title = "Hospital-wide training session",
                message = "Nov 20 at 2 PM in Auditorium B",
                type = NotificationType.TRAINING,
                date = "1 day ago"
            ),
            Notification(
                id = "4",
                title = "Your shift on Oct 10 has updated",
                message = "Now 9 AM-6 PM",
                type = NotificationType.SHIFT_UPDATE,
                date = "2 days ago"
            )
        )
    }

    fun getOpenSwapOffers(): List<SwapRequest> {
        return listOf(
            SwapRequest(
                id = "3",
                requesterId = "4",
                requesterName = "Dr. Priya Patel",
                offeredShiftId = "8",
                requestedShiftId = "9",
                status = SwapStatus.PENDING,
                date = "Oct 28",
                time = "8 AM - 12 PM",
                department = "Cardiology Dept",
                shiftDate = "Oct 28"
            ),
            SwapRequest(
                id = "4",
                requesterId = "5",
                requesterName = "Dr. Rajesh Kumar",
                offeredShiftId = "10",
                requestedShiftId = "11",
                status = SwapStatus.PENDING,
                date = "Nov 2",
                time = "2 PM - 10 PM",
                department = "ICU",
                shiftDate = "Nov 2"
            ),
            SwapRequest(
                id = "5",
                requesterId = "6",
                requesterName = "Dr. Anjali Singh",
                offeredShiftId = "12",
                requestedShiftId = "13",
                status = SwapStatus.PENDING,
                date = "Nov 5",
                time = "9 AM - 5 PM",
                department = "Emergency Ward",
                shiftDate = "Nov 5"
            )
        )
    }

    fun getInitialAcceptedSwaps(): List<SwapRequest> {
        return emptyList()
    }

    fun getOctoberShifts(): List<Shift> {
        val shifts = mutableListOf<Shift>()
        val calendar = Calendar.getInstance().apply {
            set(2025, Calendar.OCTOBER, 1)
        }

        for (day in 1..31) {
            calendar.set(Calendar.DAY_OF_MONTH, day)
            when (day) {
                1 -> shifts.add(createShift(calendar, "08:00 AM", "04:00 PM", ShiftStatus.ASSIGNED))
                2 -> shifts.add(createShift(calendar, "09:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                3 -> shifts.add(createShift(calendar, "07:00 AM", "03:00 PM", ShiftStatus.ASSIGNED))
                4 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                5 -> shifts.add(createShift(calendar, "10:00 AM", "06:00 PM", ShiftStatus.ASSIGNED))
                10 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                15 -> shifts.add(createShift(calendar, "09:00 AM", "06:00 PM", ShiftStatus.ASSIGNED))
                17 -> shifts.add(createShift(calendar, "07:00 AM", "04:00 PM", ShiftStatus.ASSIGNED))
                22 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                24 -> shifts.add(createShift(calendar, "11:00 AM", "07:00 PM", ShiftStatus.ASSIGNED))
                29 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))

                12 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.SWAPPED))
                26 -> shifts.add(createShift(calendar, "02:00 PM", "10:00 PM", ShiftStatus.SWAPPED))

                7 -> shifts.add(createShift(calendar, "08:00 AM", "12:00 PM", ShiftStatus.AVAILABLE))
                8 -> shifts.add(createShift(calendar, "02:00 PM", "10:00 PM", ShiftStatus.AVAILABLE))
                14 -> shifts.add(createShift(calendar, "08:00 AM", "12:00 PM", ShiftStatus.AVAILABLE))
                16 -> shifts.add(createShift(calendar, "02:00 PM", "10:00 PM", ShiftStatus.AVAILABLE))
                21 -> shifts.add(createShift(calendar, "08:00 AM", "12:00 PM", ShiftStatus.AVAILABLE))
                23 -> shifts.add(createShift(calendar, "02:00 PM", "10:00 PM", ShiftStatus.AVAILABLE))
                27 -> shifts.add(createShift(calendar, "12:00 PM", "05:00 PM", ShiftStatus.AVAILABLE))
                28 -> shifts.add(createShift(calendar, "08:00 AM", "12:00 PM", ShiftStatus.AVAILABLE))
                30 -> shifts.add(createShift(calendar, "02:00 PM", "10:00 PM", ShiftStatus.AVAILABLE))
            }
        }
        return shifts
    }

    fun getNovemberShifts(): List<Shift> {
        val shifts = mutableListOf<Shift>()
        val calendar = Calendar.getInstance().apply {
            set(2025, Calendar.NOVEMBER, 1)
        }

        for (day in 1..30) {
            calendar.set(Calendar.DAY_OF_MONTH, day)
            when (day) {
                1 -> shifts.add(createShift(calendar, "08:00 AM", "04:00 PM", ShiftStatus.ASSIGNED))
                2 -> shifts.add(createShift(calendar, "02:00 PM", "10:00 PM", ShiftStatus.ASSIGNED))
                3 -> shifts.add(createShift(calendar, "09:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                5 -> shifts.add(createShift(calendar, "09:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                8 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                10 -> shifts.add(createShift(calendar, "10:00 AM", "06:00 PM", ShiftStatus.ASSIGNED))
                15 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                17 -> shifts.add(createShift(calendar, "09:00 AM", "06:00 PM", ShiftStatus.ASSIGNED))
                20 -> shifts.add(createShift(calendar, "07:00 AM", "04:00 PM", ShiftStatus.ASSIGNED))
                22 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
                25 -> shifts.add(createShift(calendar, "11:00 AM", "07:00 PM", ShiftStatus.ASSIGNED))
                29 -> shifts.add(createShift(calendar, "08:00 AM", "05:00 PM", ShiftStatus.ASSIGNED))
            }
        }
        return shifts
    }


    // Add these functions to your existing DataGenerator.kt

    fun getDecemberShifts(): List<Shift> {
        val shifts = mutableListOf<Shift>()
        val calendar = Calendar.getInstance().apply {
            set(2025, Calendar.DECEMBER, 1)
        }

        for (day in 1..31) {
            calendar.set(Calendar.DAY_OF_MONTH, day)
            when (day) {
                5, 12, 19, 26 -> shifts.add(createShift(calendar, "08:00 AM", "04:00 PM", ShiftStatus.ASSIGNED))
                10, 17, 24, 31 -> shifts.add(createShift(calendar, "09:00 AM", "05:00 PM", ShiftStatus.AVAILABLE))
            }
        }
        return shifts
    }

    fun getJanuaryShifts(): List<Shift> {
        val shifts = mutableListOf<Shift>()
        val calendar = Calendar.getInstance().apply {
            set(2026, Calendar.JANUARY, 1)
        }

        for (day in 1..31) {
            calendar.set(Calendar.DAY_OF_MONTH, day)
            when (day) {
                7, 14, 21, 28 -> shifts.add(createShift(calendar, "08:00 AM", "04:00 PM", ShiftStatus.ASSIGNED))
                3, 10, 17, 24 -> shifts.add(createShift(calendar, "09:00 AM", "05:00 PM", ShiftStatus.AVAILABLE))
            }
        }
        return shifts
    }

    private fun createShift(date: Calendar, start: String, end: String, status: ShiftStatus): Shift {
        return Shift(
            id = UUID.randomUUID().toString(),
            doctorId = "1",
            date = date.time,
            startTime = start,
            endTime = end,
            department = "Cardiology Dept",
            location = "Main Hospital",
            status = status
        )
    }
}