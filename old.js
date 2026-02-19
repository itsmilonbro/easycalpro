<script>
  // Tailwind script already in head
  function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    document.getElementById('themeToggle') && (document.getElementById('themeToggle').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙');
  }

  // Load / Save users
  let users = [];
  function loadUsers() {
    const saved = localStorage.getItem('easycal_users');
    if (saved) users = JSON.parse(saved);
    else {
      fetch('user-database.json').then(r => r.json()).then(data => {
        users = data;
        localStorage.setItem('easycal_users', JSON.stringify(users));
      });
    }
  }
  function saveUsers() { localStorage.setItem('easycal_users', JSON.stringify(users)); }

  // Auth
  let currentUser = null;
  function handleLogin() {
    const input = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    const user = users.find(u => (u.username === input || u.email === input) && u.password === pass);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      window.location = 'dashboard.html';
    } else alert('Wrong credentials');
  }

  function handleRegister() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const username = document.getElementById('regUser').value;
    const password = document.getElementById('regPass').value;

    if (!name || !email || !username || !password) return alert('Fill all fields');

    const newUser = {
      id: Date.now(),
      username, email, password,
      role: "user",
      name,
      expiry: "2026-12-31",
      profile: { phone: "+8801xxxxxxxx", bio: "New user" }
    };

    users.push(newUser);
    saveUsers();

    // Send to your email
    const body = `New Registration from EasyCal-Pro\nName: ${name}\nEmail: ${email}\nUsername: ${username}\nPassword: ${password}`;
    window.location.href = `mailto:easycal.app@gmail.com?subject=New%20EasyCal-Pro%20Registration&body=${encodeURIComponent(body)}`;

    alert('✅ Registration request sent to easycal.app@gmail.com\nYou can now login with the details!');
    document.getElementById('registerModal').classList.add('hidden');
  }

  function logout() {
    localStorage.removeItem('currentUser');
    window.location = 'index.html';
  }

  // Tool modals (you can expand)
  function showTool(tool) {
    let html = '';
    if (tool === 'phone') {
      html = `<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-zinc-900 p-10 rounded-3xl w-96">
          <h3 class="text-2xl mb-6">📱 Phone Number Tool</h3>
          <input id="phoneInput" placeholder="017xxxxxxxx" class="form-control mb-4">
          <button onclick="processPhone()" class="w-full py-4 bg-indigo-600 text-white rounded-2xl">Format & Validate</button>
          <div id="phoneResult" class="mt-6"></div>
        </div></div>`;
    } else if (tool === 'password') {
      html = `... (password generator with slider, checkboxes, copy button — full code available if you want extra)`;
    } else if (tool === 'calc') {
      html = `<div class="fixed inset-0 ...">Simple calculator here</div>`;
    }
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
  }

  function processPhone() {
    // BD phone logic (full working)
    let num = document.getElementById('phoneInput').value.replace(/\D/g,'');
    if (num.length === 11 && num.startsWith('01')) {
      const formatted = '+88' + num;
      const carrier = { '017':'Grameenphone', '018':'Robi', '019':'Banglalink', '016':'Airtel', '015':'Teletalk' }[num.slice(0,3)] || 'Unknown';
      document.getElementById('phoneResult').innerHTML = `<p class="text-green-600 font-semibold">✅ Valid BD Number</p><p>Formatted: ${formatted}</p><p>Carrier: ${carrier}</p>`;
    } else {
      document.getElementById('phoneResult').innerHTML = `<p class="text-red-600">❌ Invalid Bangladeshi number</p>`;
    }
  }

  // On every page load
  window.onload = () => {
    loadUsers();
    if (document.getElementById('welcomeName')) {
      const cu = JSON.parse(localStorage.getItem('currentUser'));
      if (!cu) window.location = 'index.html';
      document.getElementById('welcomeName').textContent = `Welcome, ${cu.name}`;
      document.getElementById('expiryDate').textContent = cu.expiry;
      // fill profile
      document.getElementById('profName').textContent = cu.name;
      document.getElementById('profEmail').textContent = cu.email;
      document.getElementById('profPhone').textContent = cu.profile.phone;
      document.getElementById('profBio').textContent = cu.profile.bio;
    }
    // admin table load etc.
    if (location.pathname.includes('admin')) {
      // admin only check + table code
    }
  };

  // Dark mode on load
  if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
</script>
