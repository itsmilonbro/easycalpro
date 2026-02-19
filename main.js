

 
window.onerror = function(msg, url, line, col, err) {
    alert(
        "JavaScript problem found!\n\n" +
        "Message: " + msg + "\n" +
        "Line number: " + line + "\n" +
        "More info: " + (err ? err.stack : "no stack")
    );
};

  


   
  const DB_KEY         = 'easycal_users';
  const CURRENT_USER   = 'easycal_current_user';
  const THEME_KEY      = 'easycal_theme';

  let users = [];
  let currentUser = null;

  


  function toggleDarkMode() {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
      const btn = document.getElementById('themeToggle');
      if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  }

  function initTheme() {
      const saved = localStorage.getItem(THEME_KEY);
      const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (!saved && preferDark)) {
          document.documentElement.classList.add('dark');
          const btn = document.getElementById('themeToggle');
          if (btn) btn.textContent = '☀️';
      }
  }

  

function loadUsers() {
    const saved = localStorage.getItem(DB_KEY);
    if (saved) {
        try {
            users = JSON.parse(saved);
            if (Array.isArray(users) && users.length > 0) {
                alert("Users loaded from localStorage (" + users.length + " users)");
                return;
            }
        } catch (e) {
            console.error("localStorage parse error:", e);
        }
    }

    // Fetch from file - use relative path (works on GitHub Pages root)
    fetch('./user-database.json')
        .then(r => {
            if (!r.ok) {
                throw new Error("Fetch failed: " + r.status + " " + r.statusText);
            }
            return r.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                throw new Error("JSON is not an array");
            }
            users = data;
            saveUsers();
            alert("Successfully loaded " + users.length + " users from user-database.json");
        })
        .catch(err => {
            console.error("Load users error:", err);
            alert("Failed to load user-database.json!\nError: " + err.message + "\n\nUsing fallback admin only.");

            users = [{
                id: 1,
                username: "admin",
                password: "12345",
                email: "admin@easycal.pro",
                role: "admin",
                name: "Md. Milon (Admin)",
                expiry: "2099-12-31",
                profile: { phone: "+8801955255066", bio: "App Founder" }
            }];
            saveUsers();
        });
}




function handleLogin() {
    const userEl = document.getElementById('loginUser');
    const passEl = document.getElementById('loginPass');

    if (!userEl || !passEl) {
        alert("Login input fields not found in HTML! Check IDs: loginUser & loginPass");
        return;
    }

    const inputRaw = userEl.value;
    const passRaw  = passEl.value;

    const input = typeof inputRaw === 'string' ? inputRaw.trim() : '';
    const pass  = typeof passRaw  === 'string' ? passRaw.trim()  : '';

    if (!input || !pass) {
        alert("Please enter username/email and password");
        return;
    }

    // Debug: show what we're searching for
    console.log("Trying to login with:", input);

    const user = users.find(u => {
        if (!u || typeof u.username !== 'string' || typeof u.email !== 'string') {
            return false; // skip invalid user objects
        }
        return (
            u.username.toLowerCase() === input.toLowerCase() ||
            u.email.toLowerCase() === input.toLowerCase()
        ) && u.password === pass;
    });

    if (user) {
        setCurrentUser(user);
        alert("Login successful! Redirecting...");
        window.location.href = 'dashboard.html';
    } else {
        alert("Login failed.\nWrong username/email or password.\n\nAvailable test: admin / 12345");
    }
}




  
  function getCurrentUser() {
      const json = localStorage.getItem(CURRENT_USER);
      return json ? JSON.parse(json) : null;
  }

  function setCurrentUser(user) {
      currentUser = user;
      if (user) {
          localStorage.setItem(CURRENT_USER, JSON.stringify(user));
      } else {
          localStorage.removeItem(CURRENT_USER);
      }
  }

  


  function showModal(id) {
      document.getElementById(id)?.classList.remove('hidden');
  }

  function hideModal(id) {
      document.getElementById(id)?.classList.add('hidden');
  }

  


  function showLoginModal() {
      hideModal('registerModal');
      showModal('loginModal');
  }

  function showRegisterModal() {
      hideModal('loginModal');
      showModal('registerModal');
  }

  function switchToRegister() {
      hideModal('loginModal');
      showModal('registerModal');
  }



function handleRegister() {
    const name     = document.getElementById('regName')?.value?.trim();
    const email    = document.getElementById('regEmail')?.value?.trim();
    const username = document.getElementById('regUser')?.value?.trim();
    const password = document.getElementById('regPass')?.value;

    if (!name || !email || !username || !password) {
        alert('Please fill all fields');
        return;
    }

    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        alert('Username already taken');
        return;
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        alert('Email already used');
        return;
    }

    const newUser = {
        id: Date.now(),
        username,
        email,
        password,           // ← only for demo – never do this in real apps
        role: 'user',
        name,
        expiry: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0],
        profile: { phone: '', bio: 'New member' }
    };

    users.push(newUser);
    saveUsers();

    const subject = encodeURIComponent('New EasyCal-Pro Registration Request');
    const body = encodeURIComponent(
        `New user wants to join:\n\n` +
        `Name:     ${name}\n` +
        `Email:    ${email}\n` +
        `Username: ${username}\n` +
        `Password: ${password}\n\n` +
        `Declaration: I'm ${name} and I accept all terms & conditions. All info is correct.`
    );

    // This is the corrected, safe mailto line
    window.location.href = `mailto:millonhossain1993@gmail.com?subject=\( {subject}&body= \){body}`;

    alert('Request sent to your email client!\nLogin possible after you approve it. We wll reply after review your information and Active your Account will notified to your registered email, phone number or WhatsApp.');
    hideModal('registerModal');
}



  
  function showTool(name) {
      alert(`Tool "${name}" clicked\n(Implementation coming soon)`);
  }



  window.addEventListener('DOMContentLoaded', () => {
      initTheme();
      loadUsers();

      // Close modals when clicking outside
      document.querySelectorAll('.fixed.inset-0').forEach(el => {
          el.addEventListener('click', e => {
              if (e.target === el) hideModal(el.id);
          });
      });
  });
 