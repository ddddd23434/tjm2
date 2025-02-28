// Wait for DOM to be fully loaded before executing script
document.addEventListener('DOMContentLoaded', function() {
    // User data (in a real application this should be on the server)
    const users = {
        "admin": { password: "admin", type: "admin" },
        "user": { password: "password", type: "user" }
    };

    // Registration key (in a real application this should be on the server)
    const validRegistrationKeys = ["mchskey123", "emergency2025"];

    // Map variables
    let map = null;
    let userMarker = null;
    let markersLayer = null;
    let currentMode = "view"; // view, add, delete
    let isAddingMarker = false; // Flag to prevent automatic opening of prompt
    let ignoreNextClick = false; // Flag to prevent click event processing after mode change

    // Function to select DOM elements safely
    function safeGetElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Element with id "${id}" not found`);
        }
        return element;
    }

    // Cache DOM elements
    const elements = {
        authContainer: safeGetElement("auth-container"),
        loginTab: safeGetElement("login-tab"),
        registerTab: safeGetElement("register-tab"),
        loginDiv: safeGetElement("login"),
        registerDiv: safeGetElement("register"),
        mapDiv: safeGetElement("map"),
        appTitle: document.querySelector("h1"),
        
        // Login elements
        usernameInput: safeGetElement("username"),
        passwordInput: safeGetElement("password"),
        loginErrorText: safeGetElement("login-error"),
        loginButton: safeGetElement("login-button"),
        
        // Registration elements
        newUsernameInput: safeGetElement("new-username"),
        newPasswordInput: safeGetElement("new-password"),
        confirmPasswordInput: safeGetElement("confirm-password"),
        specialKeyInput: safeGetElement("special-key"),
        registerErrorText: safeGetElement("register-error"),
        registerButton: safeGetElement("register-button"),
        
        // Map elements
        updateLocationButton: safeGetElement("update-location"),
        logoutButton: safeGetElement("logout"),
        loadingIndicator: document.querySelector(".loading"),
        markerPanel: safeGetElement("marker-panel"),
        addMarkerModeBtn: safeGetElement("add-marker-mode"),
        deleteMarkerModeBtn: safeGetElement("delete-marker-mode"),
        viewMarkerModeBtn: safeGetElement("view-marker-mode"),
        currentModeText: safeGetElement("current-mode"),
        
        // Search elements
        searchPanel: safeGetElement("search-panel"),
        searchInput: safeGetElement("search-input"),
        searchButton: safeGetElement("search-button"),
        debugLog: safeGetElement("debug-log")
    };

    // Check if all required elements are available
    const missingElements = Object.entries(elements)
        .filter(([_, element]) => !element)
        .map(([name]) => name);

    if (missingElements.length > 0) {
        console.error("Missing DOM elements:", missingElements);
        createAndShowNotification("Ошибка инициализации приложения: отсутствуют необходимые элементы", "error");
        return; // Exit if required elements are missing
    }

    // Initialize the application
    initApp();

    // Application initialization
    function initApp() {
        try {
            // Setup authentication tabs
            setupAuthTabs();
            
            // Setup login functionality
            setupLogin();
            
            // Setup registration functionality
            setupRegistration();
            
            // Setup logout functionality
            setupLogout();
            
            // Check if user is already logged in
            const isLoggedIn = localStorage.getItem("loggedIn") === "true";
            const userType = localStorage.getItem("userType");
            
            if (isLoggedIn && userType) {
                showMapInterface(userType);
            }
        } catch (error) {
            console.error("Error initializing app:", error);
            createAndShowNotification("Ошибка инициализации приложения", "error");
        }
    }

    // Setup auth tabs
    function setupAuthTabs() {
        // Show login form by default
        elements.loginDiv.style.display = "block";
        elements.registerDiv.style.display = "none";
        
        // Login tab click
        elements.loginTab.addEventListener("click", function() {
            elements.loginTab.classList.add("active");
            elements.registerTab.classList.remove("active");
            elements.loginDiv.style.display = "block";
            elements.registerDiv.style.display = "none";
            clearErrors();
        });
        
        // Register tab click
        elements.registerTab.addEventListener("click", function() {
            elements.registerTab.classList.add("active");
            elements.loginTab.classList.remove("active");
            elements.registerDiv.style.display = "block";
            elements.loginDiv.style.display = "none";
            clearErrors();
        });
    }

    // Clear error messages
    function clearErrors() {
        if (elements.loginErrorText) elements.loginErrorText.innerText = "";
        if (elements.registerErrorText) elements.registerErrorText.innerText = "";
    }

    // Login functionality
    function setupLogin() {
        // Enter key for login
        elements.passwordInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                elements.loginButton.click();
            }
        });

        // Login button click
        elements.loginButton.addEventListener("click", function() {
            const username = elements.usernameInput.value.trim();
            const password = elements.passwordInput.value;
            
            if (!username || !password) {
                elements.loginErrorText.innerText = "Пожалуйста, введите логин и пароль";
                return;
            }
            
            // Check in localStorage for user data
            let storedUsers = {};
            try {
                storedUsers = JSON.parse(localStorage.getItem("registeredUsers") || "{}");
            } catch (e) {
                console.error("Error parsing stored users:", e);
                localStorage.setItem("registeredUsers", "{}");
            }
            
            if (users[username] && users[username].password === password) {
                // Built-in users (admin, user)
                processSuccessfulLogin(users[username].type);
            } else if (storedUsers[username] && storedUsers[username].password === password) {
                // Registered users from localStorage
                processSuccessfulLogin(storedUsers[username].type || "user");
            } else {
                elements.loginErrorText.innerText = "Неверный логин или пароль";
                elements.passwordInput.value = "";
            }
        });
    }

    // Process successful login
    function processSuccessfulLogin(userType) {
        showLoading();
        
        // Save user info to localStorage
        localStorage.setItem("userType", userType);
        localStorage.setItem("loggedIn", "true");
        
        // Show map interface
        setTimeout(() => {
            showMapInterface(userType);
            hideLoading();
        }, 500); // Small delay to prevent UI issues
    }

    // Registration functionality
    function setupRegistration() {
        // Enter key for registration
        elements.specialKeyInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                elements.registerButton.click();
            }
        });

        // Registration button click
        elements.registerButton.addEventListener("click", function() {
            const newUsername = elements.newUsernameInput.value.trim();
            const newPassword = elements.newPasswordInput.value;
            const confirmPassword = elements.confirmPasswordInput.value;
            const specialKey = elements.specialKeyInput.value.trim();
            
            // Basic validation
            if (!newUsername || !newPassword || !confirmPassword || !specialKey) {
                elements.registerErrorText.innerText = "Пожалуйста, заполните все поля";
                return;
            }
            
            if (newPassword !== confirmPassword) {
                elements.registerErrorText.innerText = "Пароли не совпадают";
                return;
            }
            
            if (newUsername.length < 3) {
                elements.registerErrorText.innerText = "Логин должен содержать минимум 3 символа";
                return;
            }
            
            if (newPassword.length < 6) {
                elements.registerErrorText.innerText = "Пароль должен содержать минимум 6 символов";
                return;
            }
            
            // Check if special key is valid
            if (!validRegistrationKeys.includes(specialKey)) {
                elements.registerErrorText.innerText = "Неверный специальный ключ";
                return;
            }
            
            // Check if username already exists
            if (users[newUsername]) {
                elements.registerErrorText.innerText = "Пользователь с таким логином уже существует";
                return;
            }
            
            // Get existing registered users
            let storedUsers = {};
            try {
                storedUsers = JSON.parse(localStorage.getItem("registeredUsers") || "{}");
            } catch (e) {
                console.error("Error parsing stored users:", e);
                localStorage.setItem("registeredUsers", "{}");
                storedUsers = {};
            }
            
            // Check if username exists in stored users
            if (storedUsers[newUsername]) {
                elements.registerErrorText.innerText = "Пользователь с таким логином уже существует";
                return;
            }
            
            // Add new user to stored users
            storedUsers[newUsername] = {
                password: newPassword,
                type: "user", // Default to regular user
                registrationDate: new Date().toISOString()
            };
            
            // Save updated users to localStorage
            try {
                localStorage.setItem("registeredUsers", JSON.stringify(storedUsers));
                
                // Show success notification
                createAndShowNotification("Регистрация успешно завершена! Теперь вы можете войти", "success");
                
                // Switch to login tab
                elements.loginTab.click();
                
                // Pre-fill login form
                elements.usernameInput.value = newUsername;
                elements.passwordInput.value = "";
                elements.passwordInput.focus();
            } catch (e) {
                console.error("Error saving registered users:", e);
                elements.registerErrorText.innerText = "Произошла ошибка при регистрации";
            }
        });
    }

    // Logout functionality
    function setupLogout() {
        elements.logoutButton.addEventListener("click", function() {
            localStorage.removeItem("userType");
            localStorage.removeItem("loggedIn");
            
            // Show login interface
            elements.mapDiv.style.display = "none";
            elements.logoutButton.style.display = "none";
            elements.updateLocationButton.style.display = "none";
            elements.searchPanel.style.display = "none";
            elements.markerPanel.style.display = "none";
            elements.authContainer.style.display = "block";
            elements.appTitle.style.display = "block";
            
            // Clear input fields
            elements.usernameInput.value = "";
            elements.passwordInput.value = "";
            elements.loginErrorText.innerText = "";
            
            // Clear registration fields
            elements.newUsernameInput.value = "";
            elements.newPasswordInput.value = "";
            elements.confirmPasswordInput.value = "";
            elements.specialKeyInput.value = "";
            elements.registerErrorText.innerText = "";
            
            // Remove map if it exists
            if (map) {
                map.remove();
                map = null;
                markersLayer = null;
            }
            
            createAndShowNotification("Вы успешно вышли из системы", "info");
        });
    }

    // Show map interface
    function showMapInterface(userType) {
        try {
            elements.authContainer.style.display = "none";
            elements.appTitle.style.display = "none";
            elements.mapDiv.style.display = "block";
            elements.logoutButton.style.display = "block";
            elements.updateLocationButton.style.display = "flex";
            elements.searchPanel.style.display = "flex";
            
            // Show marker panel only for admin users
            elements.markerPanel.style.display = userType === "admin" ? "block" : "none";
            
            // Initialize map
            initMap(userType);
        } catch (error) {
            console.error("Error showing map interface:", error);
            createAndShowNotification("Ошибка при отображении карты", "error");
            elements.logoutButton.click(); // Force logout on error
        }
    }

    // Map initialization
    function initMap(userType) {
        try {
            // Ensure map container is visible and properly sized
            elements.mapDiv.style.display = "block";
            elements.mapDiv.style.width = '100%';
            elements.mapDiv.style.height = '100%';
            
            // Initialize map if it doesn't exist
            if (!map) {
                map = L.map('map', {
                    center: [55.751244, 37.618423], // Moscow default
                    zoom: 10,
                    minZoom: 2,
                    maxZoom: 18,
                    zoomControl: false
                });

                // Add zoom controls on the right
                L.control.zoom({
                    position: 'topright'
                }).addTo(map);

                // Add OpenStreetMap layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);

                // Create layer group for markers
                markersLayer = L.layerGroup().addTo(map);
                
                // Fix map rendering by forcing a resize when map becomes visible
                setTimeout(function() {
                    map.invalidateSize();
                }, 300);
            } else {
                // Resize map if it already exists
                map.invalidateSize();
            }
            
            // Load saved markers
            loadMarkers();
            
            // Setup marker modes for admin
            setupMarkerModes(userType);
            
            // Setup search functionality
            setupSearch();
            
            // Setup location update button
            setupLocationUpdates();
            
            // Get user location
            getUserLocation();
        } catch (error) {
            console.error("Error initializing map:", error);
            createAndShowNotification("Ошибка при инициализации карты", "error");
        }
    }

    // Function to log debug messages
    function logDebug(message) {
        if (elements.debugLog) {
            const timestamp = new Date().toLocaleTimeString();
            elements.debugLog.innerHTML += `[${timestamp}] ${message}<br>`;
            elements.debugLog.scrollTop = elements.debugLog.scrollHeight;
        }
        console.log(message); // Also log to console
    }

    // Setup search functionality
    function setupSearch() {
        // Enter key for search
        elements.searchInput.addEventListener("keyup", function(event) {
            if (event.key === "Enter") {
                searchLocation();
            }
        });

        // Search button click
        elements.searchButton.addEventListener("click", function() {
            searchLocation();
        });
    }

    // Setup location updates
    function setupLocationUpdates() {
        elements.updateLocationButton.addEventListener("click", function() {
            getUserLocation();
        });
    }

    // Search location using Nominatim API
    function searchLocation() {
        const input = elements.searchInput.value.trim();
        if (!input) return;
        
        logDebug("Поиск: " + input);
        
        // Show loading indicator
        showLoading();
        
        // Add 2-second delay for Nominatim usage policy compliance
        setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(input)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    hideLoading();
                    
                    if (data && data.length > 0) {
                        const place = data[0];
                        const lat = parseFloat(place.lat);
                        const lon = parseFloat(place.lon);
                        
                        map.setView([lat, lon], 16);
                        
                        // Create a temporary marker
                        let searchMarker = L.marker([lat, lon]).addTo(map);
                        searchMarker.bindPopup(place.display_name).openPopup();
                        
                        // Remove the marker after 5 seconds
                        setTimeout(() => {
                            if (map.hasLayer(searchMarker)) {
                                map.removeLayer(searchMarker);
                            }
                        }, 5000);
                        
                        logDebug("Найдено: " + place.display_name + " (" + lat + ", " + lon + ")");
                    } else {
                        logDebug("Место не найдено");
                        createAndShowNotification("Место не найдено", "error");
                    }
                })
                .catch(error => {
                    hideLoading();
                    logDebug("Ошибка запроса: " + error.message);
                    createAndShowNotification("Ошибка поиска: " + error.message, "error");
                });
        }, 1000);
    }

    // Get user location
    function getUserLocation() {
        showLoading();
        
        if (navigator.geolocation) {
            const geoOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    
                    // Update user marker
                    updateUserMarker(lat, lon);
                    
                    // Center map on user location
                    map.setView([lat, lon], 15);
                    
                    hideLoading();
                    logDebug("Местоположение получено: " + lat + ", " + lon);
                    createAndShowNotification("Местоположение обновлено", "success");
                },
                function(error) {
                    hideLoading();
                    console.error("Error getting location:", error);
                    let errorMsg = "Не удалось получить ваше местоположение";
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg = "Доступ к геолокации запрещен пользователем";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMsg = "Информация о местоположении недоступна";
                            break;
                        case error.TIMEOUT:
                            errorMsg = "Истекло время ожидания при получении местоположения";
                            break;
                    }
                    
                    createAndShowNotification(errorMsg, "error");
                    logDebug("Ошибка геолокации: " + errorMsg);
                },
                geoOptions
            );
        } else {
            hideLoading();
            createAndShowNotification("Геолокация не поддерживается вашим браузером", "error");
            logDebug("Геолокация не поддерживается");
        }
    }

    // Update user marker
    function updateUserMarker(lat, lon) {
        try {
            // Remove existing marker
            if (userMarker && map.hasLayer(userMarker)) {
                map.removeLayer(userMarker);
            }
            
            // Create custom marker HTML
            const pulseMarker = L.divIcon({
                className: "pulse-marker",
                html: '<div class="pulse-core"></div><div class="pulse-wave"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            // Add new marker
            userMarker = L.marker([lat, lon], {
                icon: pulseMarker,
                zIndexOffset: 1000
            }).addTo(map);
            
            userMarker.bindPopup("Вы находитесь здесь").openPopup();
        } catch (error) {
            console.error("Error updating user marker:", error);
        }
    }

    // Setup marker modes for admin
    function setupMarkerModes(userType) {
        if (userType !== "admin") {
            return;
        }
        
        // Add marker mode
        elements.addMarkerModeBtn.addEventListener("click", function() {
            ignoreNextClick = true;
            setTimeout(() => { ignoreNextClick = false; }, 100);
            setMarkerMode("add");
        });
        
        // Delete marker mode
        elements.deleteMarkerModeBtn.addEventListener("click", function() {
            ignoreNextClick = true;
            setTimeout(() => { ignoreNextClick = false; }, 100);
            setMarkerMode("delete");
        });
        
        // View marker mode
        elements.viewMarkerModeBtn.addEventListener("click", function() {
            ignoreNextClick = true;
            setTimeout(() => { ignoreNextClick = false; }, 100);
            setMarkerMode("view");
        });
        
        // Map click event for adding markers
        map.on("click", function(e) {
            if (ignoreNextClick) {
                return;
            }
            
            if (currentMode === "add" && !isAddingMarker) {
                isAddingMarker = true;
                addMarker(e.latlng.lat, e.latlng.lng);
            }
        });
    }

    // Set marker mode
    function setMarkerMode(mode) {
        currentMode = mode;
        
        // Update UI
        elements.addMarkerModeBtn.classList.remove("active");
        elements.deleteMarkerModeBtn.classList.remove("active");
        elements.viewMarkerModeBtn.classList.remove("active");
        
        switch (mode) {
            case "add":
                elements.addMarkerModeBtn.classList.add("active");
                elements.currentModeText.innerText = "Текущий режим: Добавление";
                map.getContainer().style.cursor = "crosshair";
                break;
            case "delete":
                elements.deleteMarkerModeBtn.classList.add("active");
                elements.currentModeText.innerText = "Текущий режим: Удаление";
                map.getContainer().style.cursor = "not-allowed";
                break;
            case "view":
                elements.viewMarkerModeBtn.classList.add("active");
                elements.currentModeText.innerText = "Текущий режим: Просмотр";
                map.getContainer().style.cursor = "";
                break;
        }
    }

    // Add marker
    function addMarker(lat, lon) {
        try {
            const title = prompt("Введите название метки:");
            
            if (title === null) {
                isAddingMarker = false;
                return;
            }
            
            const description = prompt("Введите описание метки:");
            
            if (description === null) {
                isAddingMarker = false;
                return;
            }
            
            // Create marker
            const marker = L.marker([lat, lon]).addTo(markersLayer);
            
            // Set popup content
            marker.bindPopup(`<b>${title || "Без названия"}</b><br><p style="white-space: pre-line;">${description || ""}</p>`);

            
            // Prepare marker data
            const newMarker = {
                lat: lat,
                lon: lon,
                title: title || "Без названия",
                description: description || "",
                createdAt: new Date().toISOString()
            };
            
            // Save marker data
            let markersData = [];
            try {
                markersData = JSON.parse(localStorage.getItem("markers") || "[]");
                if (!Array.isArray(markersData)) markersData = [];
            } catch (e) {
                console.error("Error parsing markers:", e);
                markersData = [];
            }
            
            markersData.push(newMarker);
            
            localStorage.setItem("markers", JSON.stringify(markersData));
            
            // Add click event for delete mode
            marker.on("click", function() {
                if (currentMode === "delete") {
                    if (confirm("Удалить эту метку?")) {
                        deleteMarker(marker, newMarker);
                    }
                }
            });
            
            // Show notification
            createAndShowNotification("Метка успешно добавлена", "success");
            logDebug(`Добавлена метка: ${title} (${lat}, ${lon})`);
        } catch (error) {
            console.error("Error adding marker:", error);
            createAndShowNotification("Ошибка при добавлении метки", "error");
        } finally {
            isAddingMarker = false;
        }
    }

    // Load markers from localStorage
    function loadMarkers() {
        try {
            // Clear existing markers
            if (markersLayer) {
                markersLayer.clearLayers();
            }
            
            // Get markers data
            let markersData = [];
            try {
                markersData = JSON.parse(localStorage.getItem("markers") || "[]");
                if (!Array.isArray(markersData)) {
                    console.error("Markers data is not an array");
                    markersData = [];
                }
            } catch (e) {
                console.error("Error parsing markers:", e);
                localStorage.setItem("markers", "[]");
                markersData = [];
            }
            
            if (markersData.length > 0) {
                logDebug(`Загружено меток: ${markersData.length}`);
            }
            
            // Add markers to map
            markersData.forEach(markerData => {
                try {
                    if (typeof markerData.lat !== 'number' || typeof markerData.lon !== 'number') {
                        console.error("Invalid marker coordinates:", markerData);
                        return;
                    }
                    
                    const marker = L.marker([markerData.lat, markerData.lon]).addTo(markersLayer);
                    marker.bindPopup(`<b>${markerData.title || "Без названия"}</b><br>${markerData.description || ""}`);
                    
                    // Add data to marker for future reference
                    marker.markerData = markerData;
                    
                    // Add click event for delete mode
                    marker.on("click", function() {
                        if (currentMode === "delete") {
                            if (confirm("Удалить эту метку?")) {
                                deleteMarker(marker, markerData);
                            }
                        }
                    });
                } catch (error) {
                    console.error("Error adding marker from data:", error, markerData);
                }
            });
        } catch (error) {
            console.error("Error loading markers:", error);
            createAndShowNotification("Ошибка при загрузке меток", "error");
        }
    }

    // Delete marker
    function deleteMarker(marker, markerData) {
        try {
            // Remove from map
            if (markersLayer.hasLayer(marker)) {
                markersLayer.removeLayer(marker);
            }
            
            // Remove from localStorage
            let markersData = [];
            try {
                markersData = JSON.parse(localStorage.getItem("markers") || "[]");
                if (!Array.isArray(markersData)) markersData = [];
            } catch (e) {
                console.error("Error parsing markers for deletion:", e);
                markersData = [];
            }
            
            const updatedMarkers = markersData.filter(m => {
                // Check multiple properties to ensure we find the right marker
                return !(
                    m.lat === markerData.lat && 
                    m.lon === markerData.lon && 
                    m.title === markerData.title
                );
            });
            
            localStorage.setItem("markers", JSON.stringify(updatedMarkers));
            
            // Show notification
            createAndShowNotification("Метка успешно удалена", "success");
            logDebug(`Удалена метка: ${markerData.title} (${markerData.lat}, ${markerData.lon})`);
        } catch (error) {
            console.error("Error deleting marker:", error);
            createAndShowNotification("Ошибка при удалении метки", "error");
        }
    }

    // Show loading indicator
    function showLoading() {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.style.display = "flex";
        }
    }

    // Hide loading indicator
    function hideLoading() {
        if (elements.loadingIndicator) {
            elements.loadingIndicator.style.display = "none";
        }
    }

    // Show notification
    function createAndShowNotification(message, type) {
        try {
            // Create notification element if it doesn't exist
            let notification = document.querySelector(".notification");
            
            if (!notification) {
                notification = document.createElement("div");
                notification.className = "notification";
                document.body.appendChild(notification);
            }
            
            // Reset classes
            notification.className = "notification";
            
            // Set message and type
            notification.innerText = message;
            notification.classList.add(type);
            
            // Show notification
            setTimeout(() => {
                notification.classList.add("show");
            }, 10);
            
            // Hide notification after some time
            setTimeout(() => {
                notification.classList.remove("show");
                
                // Remove from DOM after animation completes
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.classList.remove(type);
                    }
                }, 300);
            }, 3000);
        } catch (error) {
            console.error("Error showing notification:", error);
        }
    }
});
