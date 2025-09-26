// Calendar Management System
class BookingCalendar {
    constructor() {
        this.currentDate = new Date();
        this.selectedDates = [];
        this.bookings = this.loadBookings();
        this.isSelecting = false;
        this.editingBooking = null;
        
        // Initialize EmailJS (you'll need to configure this)
        this.initEmailJS();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderCalendar();
        this.renderBookingsList();
        this.updateLegend();
    }

    initEmailJS() {
        // Initialize EmailJS - you'll need to replace these with your actual credentials
        // Sign up at https://www.emailjs.com/ and get your public key
        emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your EmailJS public key
    }

    setupEventListeners() {
        // Calendar navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Add booking button
        document.getElementById('addBookingBtn').addEventListener('click', () => {
            this.openBookingModal();
        });

        // Modal controls
        document.querySelector('.close').addEventListener('click', () => {
            this.closeBookingModal();
        });

        document.querySelector('.cancel-btn').addEventListener('click', () => {
            this.closeBookingModal();
        });

        // Form submission
        document.getElementById('bookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBooking();
        });

        // Delete booking
        document.getElementById('deleteBookingBtn').addEventListener('click', () => {
            this.showConfirmModal('Are you sure you want to delete this booking?', () => {
                this.deleteBooking();
            });
        });

        // Confirmation modal
        document.getElementById('confirmYes').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
            }
            this.closeConfirmModal();
        });

        document.getElementById('confirmNo').addEventListener('click', () => {
            this.closeConfirmModal();
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'bookingModal') {
                    this.closeBookingModal();
                } else if (e.target.id === 'confirmModal') {
                    this.closeConfirmModal();
                }
            }
        });

        // Color picker functionality
        this.setupColorPicker();
    }

    setupColorPicker() {
        // Will be set up when modal opens to avoid DOM issues
    }

    renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        grid.innerHTML = '';

        // Update month/year display
        const monthYear = this.currentDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });
        document.getElementById('currentMonthYear').textContent = monthYear;

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'calendar-header-day';
            headerDiv.textContent = day;
            grid.appendChild(headerDiv);
        });

        // Get first day of month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Render 6 weeks
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + (week * 7) + day);
                
                const dayDiv = this.createDayCell(cellDate);
                grid.appendChild(dayDiv);
            }
        }
    }

    createDayCell(date) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const isCurrentMonth = date.getMonth() === this.currentDate.getMonth();
        
        if (!isCurrentMonth) {
            dayDiv.classList.add('other-month');
        }
        
        if (isToday) {
            dayDiv.classList.add('today');
        }

        // Check if this date has bookings
        const bookingsForDate = this.getBookingsForDate(date);
        
        if (bookingsForDate.length === 0) {
            // No bookings - simple day
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = date.getDate();
            dayDiv.appendChild(dayNumber);
        } else if (bookingsForDate.length === 1) {
            // Single booking - use color border
            const booking = bookingsForDate[0];
            const color = booking.color || '#e74c3c';
            
            dayDiv.classList.add('single-booking');
            dayDiv.style.setProperty('--booking-color', color);
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = date.getDate();
            dayDiv.appendChild(dayNumber);
            
            const bookingInfo = document.createElement('div');
            bookingInfo.className = 'booking-info';
            bookingInfo.textContent = booking.visitorName;
            bookingInfo.title = `${booking.visitorName}${booking.petInfo ? ' + ' + booking.petInfo : ''}`;
            dayDiv.appendChild(bookingInfo);
        } else {
            // Multiple bookings - split the day
            dayDiv.classList.add('has-multiple-bookings');
            
            const sectionsContainer = document.createElement('div');
            sectionsContainer.className = 'calendar-day-sections';
            
            bookingsForDate.forEach((booking, index) => {
                const section = document.createElement('div');
                section.className = 'calendar-day-section';
                section.style.backgroundColor = booking.color || '#e74c3c';
                
                // Only show day number on first section
                if (index === 0) {
                    const dayNumber = document.createElement('div');
                    dayNumber.className = 'day-number';
                    dayNumber.textContent = date.getDate();
                    section.appendChild(dayNumber);
                }
                
                const bookingInfo = document.createElement('div');
                bookingInfo.className = 'booking-info';
                bookingInfo.textContent = booking.visitorName;
                bookingInfo.title = `${booking.visitorName}${booking.petInfo ? ' + ' + booking.petInfo : ''}`;
                section.appendChild(bookingInfo);
                
                sectionsContainer.appendChild(section);
            });
            
            dayDiv.appendChild(sectionsContainer);
        }

        // Add click handler for date selection
        dayDiv.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDateClick(date, dayDiv, bookingsForDate);
        });

        return dayDiv;
    }

    handleDateClick(date, dayDiv, bookingsForDate = null) {
        const dateStr = this.formatDate(date);
        
        // If clicking on a booked date, show booking details
        if (!bookingsForDate) {
            bookingsForDate = this.getBookingsForDate(date);
        }
        
        if (bookingsForDate.length > 0) {
            // If multiple bookings, show a selection modal or edit the first one
            this.editBooking(bookingsForDate[0]); // Edit first booking for that date
            return;
        }

        // Handle date selection for new bookings
        if (!this.isSelecting) {
            // Start selection
            this.isSelecting = true;
            this.selectedDates = [dateStr];
            dayDiv.classList.add('selecting');
        } else {
            // End selection or extend selection
            const startDate = new Date(this.selectedDates[0]);
            const endDate = date;
            
            if (endDate < startDate) {
                // Swap if end is before start
                this.selectedDates = [this.formatDate(endDate), this.selectedDates[0]];
            } else {
                this.selectedDates = [this.selectedDates[0], dateStr];
            }
            
            this.isSelecting = false;
            this.openBookingModal(this.selectedDates);
        }
    }

    getBookingsForDate(date) {
        const dateStr = this.formatDate(date);
        return this.bookings.filter(booking => {
            return dateStr >= booking.startDate && dateStr <= booking.endDate;
        });
    }

    openBookingModal(selectedDates = null) {
        const modal = document.getElementById('bookingModal');
        const form = document.getElementById('bookingForm');
        const deleteBtn = document.getElementById('deleteBookingBtn');
        
        form.reset();
        deleteBtn.style.display = 'none';
        document.getElementById('modalTitle').textContent = 'Add New Visit';
        
        // Set default color
        document.getElementById('bookingColor').value = '#e74c3c';
        
        if (selectedDates && selectedDates.length >= 1) {
            document.getElementById('startDate').value = selectedDates[0];
            document.getElementById('endDate').value = selectedDates[1] || selectedDates[0];
        }
        
        // Setup color picker after modal is shown
        setTimeout(() => {
            this.setupColorPickerEvents();
        }, 100);
        
        modal.style.display = 'block';
        document.getElementById('visitorName').focus();
    }

    setupColorPickerEvents() {
        const colorInput = document.getElementById('bookingColor');
        const presetColors = document.querySelectorAll('.preset-color');
        
        // Remove any existing event listeners
        presetColors.forEach(preset => {
            preset.replaceWith(preset.cloneNode(true));
        });
        
        // Add new event listeners
        document.querySelectorAll('.preset-color').forEach(preset => {
            preset.addEventListener('click', () => {
                const color = preset.dataset.color;
                colorInput.value = color;
                
                // Update visual selection
                document.querySelectorAll('.preset-color').forEach(p => p.classList.remove('selected'));
                preset.classList.add('selected');
            });
        });
        
        // Update preset selection when color input changes
        colorInput.addEventListener('input', () => {
            const selectedColor = colorInput.value;
            document.querySelectorAll('.preset-color').forEach(preset => {
                preset.classList.toggle('selected', preset.dataset.color === selectedColor);
            });
        });
    }

    closeBookingModal() {
        document.getElementById('bookingModal').style.display = 'none';
        this.clearSelection();
        this.editingBooking = null;
    }

    editBooking(booking) {
        this.editingBooking = booking;
        
        const modal = document.getElementById('bookingModal');
        const deleteBtn = document.getElementById('deleteBookingBtn');
        
        document.getElementById('modalTitle').textContent = 'Edit Visit';
        document.getElementById('visitorName').value = booking.visitorName;
        document.getElementById('petInfo').value = booking.petInfo || '';
        document.getElementById('startDate').value = booking.startDate;
        document.getElementById('endDate').value = booking.endDate;
        document.getElementById('notes').value = booking.notes || '';
        document.getElementById('bookingColor').value = booking.color || '#e74c3c';
        
        // Setup color picker after modal is shown
        setTimeout(() => {
            this.setupColorPickerEvents();
        }, 100);
        
        deleteBtn.style.display = 'inline-block';
        modal.style.display = 'block';
    }

    saveBooking() {
        const formData = new FormData(document.getElementById('bookingForm'));
        const booking = {
            id: this.editingBooking ? this.editingBooking.id : Date.now(),
            visitorName: formData.get('visitorName'),
            petInfo: formData.get('petInfo'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            color: formData.get('bookingColor'),
            notes: formData.get('notes'),
            createdAt: this.editingBooking ? this.editingBooking.createdAt : new Date().toISOString()
        };

        // Validate dates
        if (new Date(booking.startDate) > new Date(booking.endDate)) {
            alert('End date cannot be before start date!');
            return;
        }

        // Check for conflicts (optional - you can remove this if you want to allow overlaps)
        const conflicts = this.checkForConflicts(booking);
        if (conflicts.length > 0) {
            const conflictNames = conflicts.map(c => c.visitorName).join(', ');
            if (!confirm(`This conflicts with existing bookings by: ${conflictNames}. Continue anyway?`)) {
                return;
            }
        }

        if (this.editingBooking) {
            // Update existing booking
            const index = this.bookings.findIndex(b => b.id === this.editingBooking.id);
            this.bookings[index] = booking;
            this.sendNotification('updated', booking);
        } else {
            // Add new booking
            this.bookings.push(booking);
            this.sendNotification('created', booking);
        }

        this.saveBookings();
        this.renderCalendar();
        this.renderBookingsList();
        this.updateLegend();
        this.closeBookingModal();
    }

    deleteBooking() {
        if (this.editingBooking) {
            this.bookings = this.bookings.filter(b => b.id !== this.editingBooking.id);
            this.sendNotification('deleted', this.editingBooking);
            this.saveBookings();
            this.renderCalendar();
            this.renderBookingsList();
            this.updateLegend();
            this.closeBookingModal();
        }
    }

    checkForConflicts(newBooking) {
        return this.bookings.filter(booking => {
            if (newBooking.id && booking.id === newBooking.id) {
                return false; // Don't check against itself when editing
            }
            
            const newStart = new Date(newBooking.startDate);
            const newEnd = new Date(newBooking.endDate);
            const existingStart = new Date(booking.startDate);
            const existingEnd = new Date(booking.endDate);
            
            return (newStart <= existingEnd && newEnd >= existingStart);
        });
    }

    clearSelection() {
        this.selectedDates = [];
        this.isSelecting = false;
        document.querySelectorAll('.calendar-day.selecting').forEach(day => {
            day.classList.remove('selecting');
        });
    }

    renderBookingsList() {
        const listContainer = document.getElementById('bookingsList');
        listContainer.innerHTML = '';

        if (this.bookings.length === 0) {
            listContainer.innerHTML = '<p>No bookings yet. Click "Add New Visit" to get started!</p>';
            return;
        }

        // Sort bookings by start date
        const sortedBookings = [...this.bookings].sort((a, b) => 
            new Date(a.startDate) - new Date(b.startDate)
        );

        sortedBookings.forEach(booking => {
            const bookingDiv = document.createElement('div');
            bookingDiv.className = 'booking-item';
            
            const startDate = new Date(booking.startDate).toLocaleDateString();
            const endDate = new Date(booking.endDate).toLocaleDateString();
            const duration = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
            
            const color = booking.color || '#e74c3c';
            bookingDiv.style.borderLeft = `4px solid ${color}`;
            
            bookingDiv.innerHTML = `
                <div class="booking-visitor">${booking.visitorName}</div>
                <div class="booking-dates">${duration}</div>
                ${booking.petInfo ? `<div class="booking-pets">🐾 ${booking.petInfo}</div>` : ''}
                ${booking.notes ? `<div class="booking-notes">${booking.notes}</div>` : ''}
            `;
            
            bookingDiv.addEventListener('click', () => {
                this.editBooking(booking);
            });
            
            listContainer.appendChild(bookingDiv);
        });
    }

    updateLegend() {
        const dynamicLegend = document.getElementById('dynamicLegend');
        if (!dynamicLegend) return;
        
        dynamicLegend.innerHTML = '';

        // Get unique booking colors and visitors
        const uniqueBookings = new Map();
        this.bookings.forEach(booking => {
            const key = `${booking.visitorName}_${booking.color || '#e74c3c'}`;
            if (!uniqueBookings.has(key)) {
                uniqueBookings.set(key, {
                    visitorName: booking.visitorName,
                    color: booking.color || '#e74c3c'
                });
            }
        });

        // Create legend items for each unique booking
        uniqueBookings.forEach(booking => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-booking';
            
            const colorDiv = document.createElement('div');
            colorDiv.className = 'legend-color';
            colorDiv.style.backgroundColor = booking.color;
            
            const label = document.createElement('span');
            label.textContent = booking.visitorName;
            
            legendItem.appendChild(colorDiv);
            legendItem.appendChild(label);
            dynamicLegend.appendChild(legendItem);
        });
    }

    // Data persistence using localStorage
    loadBookings() {
        try {
            const saved = localStorage.getItem('friendsCalendarBookings');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading bookings:', error);
            return [];
        }
    }

    saveBookings() {
        try {
            localStorage.setItem('friendsCalendarBookings', JSON.stringify(this.bookings));
        } catch (error) {
            console.error('Error saving bookings:', error);
        }
    }

    // Email notification system
    async sendNotification(action, booking) {
        try {
            const startDate = new Date(booking.startDate).toLocaleDateString();
            const endDate = new Date(booking.endDate).toLocaleDateString();
            const duration = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
            
            const templateParams = {
                action: action,
                visitor_name: booking.visitorName,
                dates: duration,
                pet_info: booking.petInfo || 'None',
                notes: booking.notes || 'None',
                timestamp: new Date().toLocaleString()
            };

            // Replace these with your EmailJS service details
            await emailjs.send(
                'YOUR_SERVICE_ID',    // Replace with your EmailJS service ID
                'YOUR_TEMPLATE_ID',   // Replace with your EmailJS template ID
                templateParams
            );
            
            console.log('Notification sent successfully');
        } catch (error) {
            console.error('Failed to send notification:', error);
            // You might want to show a user-friendly message here
        }
    }

    // Confirmation modal
    showConfirmModal(message, callback) {
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').style.display = 'block';
        this.confirmCallback = callback;
    }

    closeConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.confirmCallback = null;
    }

    // Utility functions
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // Export/Import functionality for backup
    exportBookings() {
        const dataStr = JSON.stringify(this.bookings, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = 'calendar-bookings-backup.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    importBookings(jsonString) {
        try {
            const importedBookings = JSON.parse(jsonString);
            this.bookings = importedBookings;
            this.saveBookings();
            this.renderCalendar();
            this.renderBookingsList();
            alert('Bookings imported successfully!');
        } catch (error) {
            alert('Error importing bookings. Please check the file format.');
        }
    }
}

// Initialize the calendar when the page loads (called from auth.js after authentication)
function initializeCalendar() {
    window.bookingCalendar = new BookingCalendar();
    
    // Add some helpful keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any open modals
            const bookingModal = document.getElementById('bookingModal');
            const confirmModal = document.getElementById('confirmModal');
            if (bookingModal) bookingModal.style.display = 'none';
            if (confirmModal) confirmModal.style.display = 'none';
            if (window.bookingCalendar) window.bookingCalendar.clearSelection();
        }
    });
}

// Fallback initialization if no auth system
document.addEventListener('DOMContentLoaded', () => {
    // Check if auth system is present
    setTimeout(() => {
        if (!window.calendarAuth) {
            initializeCalendar();
        }
    }, 100);
});

// Add export functionality (you can call this from browser console if needed)
function exportCalendarData() {
    window.bookingCalendar.exportBookings();
}

// Helper function to clear all data (for testing)
function clearAllBookings() {
    if (confirm('Are you sure you want to delete ALL bookings? This cannot be undone!')) {
        localStorage.removeItem('friendsCalendarBookings');
        window.location.reload();
    }
}