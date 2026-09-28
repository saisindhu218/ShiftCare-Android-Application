package com.example.shiftcare.data.model

data class User(
    val id: String,
    val name: String,
    val role: String,
    val specialization: String,
    val hospitalUnit: String,
    val email: String,
    val phone: String
)