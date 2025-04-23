// === Firebase Config ===
const firebaseConfig = {
    apiKey: "AIzaSyB5gfaiXaA8JktAfZiqBU-XlTFjFbB28CQ",
    authDomain: "mapa-recursos-c7cba.firebaseapp.com",
    projectId: "mapa-recursos-c7cba",
    storageBucket: "mapa-recursos-c7cba.appspot.com",
    messagingSenderId: "207128359057",
    appId: "1:207128359057:web:fc0ed88615657eea1c4f30",
    measurementId: "G-GFD08XJMF5"
  };
  
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  
  // === Admin list ===
  const allowedAdmins = [
    "pcer210@gmail.com",
    "uliceron@gmail.com"
  ];
  
  let allLocations = [];
  let allMarkers = [];
  
  // === Map Setup ===
  const map = L.map('map').setView([19.4326, -99.1332], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  
  // === Show User's Location ===
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        map.setView([lat, lng], 14);
        L.marker([lat, lng]).addTo(map)
          .bindPopup("You are here")
          .openPopup();
      },
      () => alert("Could not get your location.")
    );
  }
  
  // === Auth Handler ===
  firebase.auth().onAuthStateChanged((user) => {
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const userEmail = document.getElementById("userEmail");
    const wrapper = document.getElementById("formWrapper");
  
    // Reset
    wrapper.style.display = "none";
    wrapper.innerHTML = "";
    userEmail.textContent = "";
    loginBtn.style.display = "inline";
    logoutBtn.style.display = "none";
  
    if (user) {
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline";
      userEmail.textContent = "Logged in as: " + user.email;
  
      loadLocationList(user.email);
  
      if (allowedAdmins.includes(user.email)) {
        wrapper.innerHTML = `
          <form id="locationForm">
            <div class="formInner">
              <input type="text" id="name" placeholder="Name" required>
              <input type="text" id="description" placeholder="Description" required>
              <input type="text" id="contact" placeholder="Contact Info" required>
              <input type="number" id="lat" step="any" placeholder="Latitude" required>
              <input type="number" id="lng" step="any" placeholder="Longitude" required>
              <button type="submit">Add Location</button>
            </div>
          </form>
        `;
        wrapper.style.display = "block";
        attachFormHandler();
      } else {
        alert("You are signed in but not authorized to add locations.");
      }
  
    } else {
      loadLocationList(null); // For guests
    }
  });
  
  // === Login/Logout ===
  document.getElementById("loginBtn").addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider);
  });
  
  document.getElementById("logoutBtn").addEventListener("click", () => {
    firebase.auth().signOut();
  });
  
  // === Load Locations ===
  function loadLocationList(currentUserEmail) {
    const list = document.getElementById("locationList");
    list.innerHTML = "";
  
    // Clear markers
    allMarkers.forEach(marker => {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    });
    allMarkers = [];
    allLocations = [];
  
    db.collection("locations").get().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const id = doc.id;
  
        allLocations.push({ ...data, id });
  
        const marker = L.marker([data.lat, data.lng])
          .addTo(map)
          .bindPopup(`<b>${data.name}</b><br>${data.description}<br>${data.contact}`);
        marker._locationId = id;
        allMarkers.push(marker);
  
        const div = document.createElement("div");
        div.className = "locationItem";
        div.innerHTML = `
          <strong>${data.name}</strong><br>
          ${data.description}<br>
          ${data.contact}<br>
        `;
  
        if (firebase.auth().currentUser && allowedAdmins.includes(firebase.auth().currentUser.email)) {
          div.innerHTML += `
            <button onclick="editLocation('${id}', '${data.name}', '${data.description}', '${data.contact}', ${data.lat}, ${data.lng})">Edit</button>
            <button onclick="deleteLocation('${id}')">Delete</button>
          `;
        }
  
        div.addEventListener("click", () => {
          map.setView([data.lat, data.lng], 15);
          marker.openPopup();
        });
  
        list.appendChild(div);
      });
  
      // ✅ Once list is built, attach search behavior
      setupSearchFiltering();
    });
  }
  
  
  // === Add Location ===
  function attachFormHandler() {
    const form = document.getElementById("locationForm");
    if (!form) return;
  
    form.onsubmit = function (e) {
      e.preventDefault();
  
      const newLocation = {
        name: document.getElementById("name").value,
        description: document.getElementById("description").value,
        contact: document.getElementById("contact").value,
        lat: parseFloat(document.getElementById("lat").value),
        lng: parseFloat(document.getElementById("lng").value),
      };
  
      db.collection("locations").add(newLocation).then(() => {
        alert("Location added!");
        form.reset();
        const user = firebase.auth().currentUser;
        if (user) loadLocationList(user.email);
      }).catch((err) => {
        console.error("Error adding location:", err);
        alert("Could not add location.");
      });
    };
  }
  
  // === Delete Location ===
  function deleteLocation(id) {
    if (confirm("Are you sure you want to delete this location?")) {
      db.collection("locations").doc(id).delete().then(() => {
        alert("Location deleted.");
        const user = firebase.auth().currentUser;
        loadLocationList(user ? user.email : "");
      }).catch((error) => {
        console.error("Error deleting location:", error);
      });
    }
  }
  
  
  // === Edit Location ===
  function editLocation(id, name, description, contact, lat, lng) {
    const nameInput = document.getElementById("name");
    const descInput = document.getElementById("description");
    const contactInput = document.getElementById("contact");
    const latInput = document.getElementById("lat");
    const lngInput = document.getElementById("lng");
  
    if (!nameInput || !descInput || !contactInput || !latInput || !lngInput) return;
  
    nameInput.value = name;
    descInput.value = description;
    contactInput.value = contact;
    latInput.value = lat;
    lngInput.value = lng;
  
    const form = document.getElementById("locationForm");
    form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await db.collection("locations").doc(id).update({
          name: nameInput.value,
          description: descInput.value,
          contact: contactInput.value,
          lat: parseFloat(latInput.value),
          lng: parseFloat(lngInput.value),
        });
        alert("Location updated.");
        form.reset();
        form.onsubmit = attachFormHandler;
        const user = firebase.auth().currentUser;
        if (user) loadLocationList(user.email);
      } catch (err) {
        console.error("Error updating location:", err);
      }
    };
  }

  
        
  function setupSearchFiltering() {
    const searchInput = document.getElementById("searchBar");
  
    if (!searchInput) return;
  
    searchInput.removeEventListener("input", handleSearch); // Prevent double listeners
    searchInput.addEventListener("input", handleSearch);
  }
  
  function handleSearch() {
    const query = this.value.trim().toLowerCase();
    const list = document.getElementById("locationList");
    list.innerHTML = "";
  
    allMarkers.forEach(marker => map.removeLayer(marker));
    allMarkers = [];
  
    const user = firebase.auth().currentUser;
    const isAdmin = user && allowedAdmins.includes(user.email);
  
    allLocations.forEach(loc => {
      const match = loc.name.toLowerCase().includes(query) ||
        loc.description.toLowerCase().includes(query) ||
        loc.contact.toLowerCase().includes(query);
  
      if (!match && query !== "") return;
  
      const highlight = (text) => {
        if (!query) return text; // Don't highlight if query is empty
        return text.replace(new RegExp(`(${query})`, "gi"), `<mark>$1</mark>`);
      };
      
  
      const marker = L.marker([loc.lat, loc.lng])
        .addTo(map)
        .bindPopup(`<b>${loc.name}</b><br>${loc.description}<br>${loc.contact}`);
      allMarkers.push(marker);
  
      const div = document.createElement("div");
      div.className = "locationItem";
      div.innerHTML = `
        <strong>${highlight(loc.name)}</strong><br>
        ${highlight(loc.description)}<br>
        ${highlight(loc.contact)}<br>
      `;
  
      if (isAdmin) {
        div.innerHTML += `
          <button onclick="editLocation('${loc.id}', '${loc.name}', '${loc.description}', '${loc.contact}', ${loc.lat}, ${loc.lng})">Edit</button>
          <button onclick="deleteLocation('${loc.id}')">Delete</button>
        `;
      }
  
      div.addEventListener("click", () => {
        map.setView([loc.lat, loc.lng], 15);
        marker.openPopup();
      });
  
      list.appendChild(div);
    });
  }

  document.getElementById("toggleSidebar").addEventListener("click", () => {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("open");
  });
  
  
  