package com.example.shiftcare.ui.fragments

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import com.example.shiftcare.databinding.FragmentProfileBinding
import com.example.shiftcare.ui.auth.LoginActivity
import com.example.shiftcare.ui.viewmodel.ShiftViewModel
import com.example.shiftcare.util.DataGenerator

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private lateinit var viewModel: ShiftViewModel

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        viewModel = ViewModelProvider(this)[ShiftViewModel::class.java]
        setupUI()
        setupLogoutButton()
    }

    @SuppressLint("SetTextI18n")
    private fun setupUI() {
        // DIRECT DATA ACCESS
        val user = DataGenerator.getCurrentUser()
        binding.textName.text = user.name
        binding.textRole.text = "${user.role}, ${user.specialization}"
        binding.textDepartment.text = user.hospitalUnit
        binding.textEmail.text = user.email
        binding.textPhone.text = user.phone
    }

    private fun setupLogoutButton() {
        binding.buttonLogout.setOnClickListener {
            // Navigate back to LoginActivity
            val intent = Intent(requireActivity(), LoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            requireActivity().finish()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}