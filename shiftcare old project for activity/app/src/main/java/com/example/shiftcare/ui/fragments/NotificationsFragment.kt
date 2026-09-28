package com.example.shiftcare.ui.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.shiftcare.databinding.FragmentNotificationsBinding
import com.example.shiftcare.databinding.NotificationItemBinding
import com.example.shiftcare.util.DataGenerator

class NotificationsFragment : Fragment() {

    private var _binding: FragmentNotificationsBinding? = null
    private val binding get() = _binding!!
    private lateinit var adapter: NotificationsAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentNotificationsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupRecyclerView()
    }

    private fun setupRecyclerView() {
        // DIRECT DATA ACCESS
        val notifications = DataGenerator.getNotifications()

        adapter = NotificationsAdapter(notifications) { notification ->
            if (notification.isUrgent) {
                Toast.makeText(requireContext(), "Volunteering for ICU shift", Toast.LENGTH_SHORT).show()
            }
        }

        binding.root.apply {
            LinearLayoutManager(requireContext())
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class NotificationsAdapter(
    private var notifications: List<com.example.shiftcare.data.model.Notification>,
    private val onItemClick: (com.example.shiftcare.data.model.Notification) -> Unit
) : RecyclerView.Adapter<NotificationsAdapter.NotificationViewHolder>() {

    class NotificationViewHolder(
        private val binding: NotificationItemBinding,
        private val onItemClick: (com.example.shiftcare.data.model.Notification) -> Unit
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(notification: com.example.shiftcare.data.model.Notification) {
            binding.textTitle.text = notification.title
            binding.textMessage.text = notification.message
            binding.textDate.text = notification.date

            // Style for urgent notifications - EXACTLY as per your design
            if (notification.isUrgent) {
                binding.cardView.setCardBackgroundColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.error_red)
                )
                binding.textTitle.setTextColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.white)
                )
                binding.textMessage.setTextColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.white)
                )
                binding.textDate.setTextColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.white)
                )
                binding.textAction.visibility = View.VISIBLE
                binding.textAction.text = notification.actionText
            } else {
                binding.cardView.setCardBackgroundColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.white)
                )
                binding.textTitle.setTextColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.text_primary)
                )
                binding.textMessage.setTextColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.text_secondary)
                )
                binding.textDate.setTextColor(
                    binding.root.context.getColor(com.example.shiftcare.R.color.text_secondary)
                )
                binding.textAction.visibility = View.GONE
            }

            binding.root.setOnClickListener {
                onItemClick(notification)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): NotificationViewHolder {
        val binding = NotificationItemBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return NotificationViewHolder(binding, onItemClick)
    }

    override fun onBindViewHolder(holder: NotificationViewHolder, position: Int) {
        holder.bind(notifications[position])
    }

    override fun getItemCount(): Int = notifications.size

}