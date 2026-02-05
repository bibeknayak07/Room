document.addEventListener('DOMContentLoaded', () => {
    
    // --- 0. CONFIGURATION ---
    const API_URL = "https://room-3t00.onrender.com";

    // --- 1. SCROLL ANIMATIONS ---
    const animatedItems = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    animatedItems.forEach(item => observer.observe(item));

    // --- 2. DYNAMIC PRICE CALCULATOR ---
    const houseSize = document.getElementById('houseSize');
    const priceDisplay = document.getElementById('priceDisplay');
    const priceValue = document.getElementById('priceValue');

    if (houseSize) {
        houseSize.addEventListener('change', () => {
            if (houseSize.value) {
                priceDisplay.style.display = 'block';
                priceValue.textContent = `Rs ${parseInt(houseSize.value).toLocaleString()}`;
            } else {
                priceDisplay.style.display = 'none';
            }
        });
    }

    // --- 3. CORE ELEMENTS ---
    const authOverlay = document.getElementById('authOverlay');
    const dashboardOverlay = document.getElementById('dashboardOverlay');
    const navAuthSection = document.getElementById('navAuthSection');
    const quoteForm = document.getElementById('quoteForm');
    const authForm = document.getElementById('combinedAuthForm');
    const submitBtn = document.getElementById('authSubmitBtn');
    const authTitle = document.querySelector('.auth-header h2');
    const toggleLink = document.getElementById('toggleAuthMode');

    let isLoginMode = true;

    // --- 4. DATA FETCHING (MOVE HISTORY) ---
    const loadMoveHistory = async (userId) => {
        const historyContainer = document.getElementById('history');
        if (!historyContainer) return;

        // Visual feedback that history is loading
        historyContainer.innerHTML = '<p style="text-align:center; color:#8b949e;">Loading history...</p>';

        try {
            const response = await fetch(`${API_URL}/api/my-bookings/${userId}`);
            const bookings = await response.json();

            if (bookings.length > 0) {
                historyContainer.innerHTML = bookings.map(b => `
                    <div class="booking-card">
                      <div style="font-weight: bold; color: #58a6ff;">${b.houseSize}</div>
                      <div style="font-size: 0.8rem; color: #8b949e; margin-top: 5px;">
                          <i class="fa-solid fa-location-dot"></i> From: ${b.pickupAddress}<br>
                          <i class="fa-solid fa-flag-checkered"></i> To: ${b.destinationAddress}
                      </div>
                      <div style="margin-top: 10px; color: #39d353;">${b.price}</div>
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = `
                    <div style="text-align: center; color: #8b949e; padding: 40px 0;">
                        <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        <p>No past moves found.</p>
                    </div>`;
            }
        } catch (err) {
            console.error("Error loading history:", err);
            historyContainer.innerHTML = '<p style="text-align:center; color:#f85149;">Error loading data.</p>';
        }
    };

    // --- 5. LOGIN STATUS & NAV UPDATE ---
    const checkLoginStatus = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (user && navAuthSection) {
            navAuthSection.innerHTML = `
                <div class="user-avatar-nav" id="profileTrigger" title="View Account">
                    <i class="fa-solid fa-user"></i>
                </div>`;

            if(document.getElementById('dashUserEmail')) {
                document.getElementById('dashUserEmail').innerText = user.email;
            }
            if(document.getElementById('infoEmail')) {
                document.getElementById('infoEmail').innerText = user.email;
            }

            document.getElementById('profileTrigger').onclick = () => {
                dashboardOverlay.style.display = 'flex';
                openTab(null, 'history'); 
                loadMoveHistory(user.id); 
            };
        }
    };

    checkLoginStatus();

    // --- 6. BOOKING FORM SUBMISSION ---
    if (quoteForm) {
        quoteForm.onsubmit = async (e) => {
            e.preventDefault();
            const user = JSON.parse(localStorage.getItem('user'));

            if (!user) {
                alert("Please login first.");
                authOverlay.style.display = 'flex';
                return;
            }
            
            const submitBtnBooking = quoteForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtnBooking.innerText;
            submitBtnBooking.innerText = "Connecting to server...";
            submitBtnBooking.disabled = true;

            try {
                const hSize = document.getElementById('houseSize').selectedOptions[0].text;
                const mDate = document.querySelector('input[type="date"]').value;
                const pPrice = document.getElementById('priceValue').innerText;
                const pAddr = document.getElementById('pickupAddress').value;
                const dAddr = document.getElementById('destinationAddress').value;

                const bookingData = {
                    userId: user.id,
                    userEmail: user.email,
                    houseSize: hSize,
                    moveDate: mDate,
                    price: pPrice,
                    pickupAddress: pAddr,
                    destinationAddress: dAddr
                };
                
                const response = await fetch(`${API_URL}/api/book-move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                if (response.ok) {
                    alert("🎉 Booking saved!");
                    const adminPhone = "9779818032581"; 
                    const message = `*New Booking*%0A*From:* ${pAddr}%0A*To:* ${dAddr}%0A*Size:* ${hSize}`;
                    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
                    location.reload(); 
                } else {
                    const errorData = await response.json();
                    alert("Server Error: " + (errorData.error || "Unknown error"));
                    submitBtnBooking.innerText = originalBtnText;
                    submitBtnBooking.disabled = false;
                }
            } catch (err) {
                console.error("Frontend Error:", err);
                alert("Server is waking up. Please try again in 30 seconds.");
                submitBtnBooking.innerText = originalBtnText;
                submitBtnBooking.disabled = false;
            }
        };
    }

    // --- 7. AUTH FORM (LOGIN/SIGNUP) ---
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const originalBtnText = isLoginMode ? "Continue" : "Sign Up";
            submitBtn.innerText = "Please wait (Server waking up)...";
            submitBtn.disabled = true;

            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            const endpoint = isLoginMode ? `${API_URL}/api/login` : `${API_URL}/api/register`;

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                
                if(response.ok) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    location.reload(); 
                } else {
                    alert(data.msg || "Error occurred");
                    submitBtn.innerText = originalBtnText;
                    submitBtn.disabled = false;
                }
            } catch(err) {
                console.error("Auth Error:", err);
                alert("Server connection failed. It may be sleeping. Please wait a moment and try again.");
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        };
    }

    // --- 8. UI HANDLERS (TOGGLE, TABS, CLICKS) ---
    if (toggleLink) {
        toggleLink.onclick = (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            authTitle.innerText = isLoginMode ? "Log in or sign up" : "Create your account";
            submitBtn.innerText = isLoginMode ? "Continue" : "Sign Up";
            toggleLink.innerText = isLoginMode ? "Sign Up" : "Log In";
        };
    }

    window.openTab = function(evt, tabName) {
        let i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tab-content");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        tablinks = document.getElementsByClassName("tab-link");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].classList.remove("active");
        }
        document.getElementById(tabName).style.display = "block";
        if (evt) {
            evt.currentTarget.classList.add("active");
        } else {
            const defaultTab = document.querySelector('.tab-link');
            if (defaultTab) defaultTab.classList.add("active");
        }
    };

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-btn') || 
            e.target.id === 'closeAuthBtn' || 
            e.target.id === 'closeDashBtn' || 
            e.target.closest('.close-btn')) {
            authOverlay.style.display = 'none';
            dashboardOverlay.style.display = 'none';
        }
        if (e.target.id === 'openAuthBtn' || e.target.closest('#openAuthBtn')) {
            authOverlay.style.display = 'flex';
        }
        if (e.target === authOverlay || e.target === dashboardOverlay) {
            authOverlay.style.display = 'none';
            dashboardOverlay.style.display = 'none';
        }
        if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
            localStorage.removeItem('user');
            location.reload();
        }
    });
});