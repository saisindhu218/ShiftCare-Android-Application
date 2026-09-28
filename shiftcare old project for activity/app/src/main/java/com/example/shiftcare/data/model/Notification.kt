package com.example.shiftcare.data.model

enum class NotificationType {
    URGENT_NEED, SWAP_APPROVAL, TRAINING, SHIFT_UPDATE, GENERAL
}

data class Notification(
    val id: String,
    val title: String,
    val message: String,
    val type: NotificationType,
    val date: String,
    val isUrgent: Boolean = false,
    val actionText: String? = null
)