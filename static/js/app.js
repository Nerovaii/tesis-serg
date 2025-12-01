const STORAGE_KEY = "eduquizHistory";
const USER_KEY = "eduquizUser";
const ROLE_KEY = "eduquizRole";
const STUDENT_ACCOUNT_KEY = "eduquizStudentAccount";
const CUSTOM_QUESTIONS_KEY = "eduquizCustomQuestions";
const API_BASE = "http://localhost:3001";
const roleStorage = window.sessionStorage;

// Credenciales específicas (puedes cambiarlas si lo necesitas)
const ADMIN_EMAIL = "admin@eduquiz.com";
const ADMIN_PASS = "Admin1234";
const STUDENT_EMAIL = "estudiante@colegio.com";
const STUDENT_PASS = "Alumno1234";

function getStoredRole() {
  return roleStorage.getItem(ROLE_KEY);
}

function setStoredRole(role) {
  if (!role) {
    roleStorage.removeItem(ROLE_KEY);
    try {
      localStorage.removeItem(ROLE_KEY);
    } catch (error) {
      console.warn("No se pudo limpiar ROLE_KEY en localStorage.", error);
    }
    return;
  }
  roleStorage.setItem(ROLE_KEY, role);
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    localStorage.removeItem(ROLE_KEY);
  } catch (error) {
    console.warn("No se pudo limpiar ROLE_KEY persistente.", error);
  }
  setupNavigation();
  initAuthForms();
  initLogoutControls();
  initStudentLinkGuards();
  updateNavAuthVisibility();

  const page = document.body.dataset.page;
  if (page === "generador") {
    const role = getStoredRole();
    if (role !== "student" && role !== "admin") {
      window.location.replace("login.html?studentOnly=1");
      return;
    }
    initQuizPage();
  } else if (page === "historial") {
    if (!isAuthenticated()) {
      window.location.replace("login.html?required=1");
      return;
    }
    renderHistoryPage();
  } else if (page === "retroalimentacion") {
    if (!isAuthenticated()) {
      window.location.replace("login.html?required=1");
      return;
    }
    renderFeedbackPage();
  } else if (page === "admin") {
    protectAdmin();
    initAdminQuestionEditor();
  }
});

function setupNavigation() {
  const nav = document.querySelector(".main-nav");
  if (!nav) return;
  const toggle = document.querySelector(".nav-toggle");
  const groups = nav.querySelectorAll(".nav-group");

  if (toggle) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("open");
      document.body.classList.toggle("menu-open");
    });
  }

  nav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    nav.classList.remove("open");
    document.body.classList.remove("menu-open");
    groups.forEach((group) => group.removeAttribute("open"));
  });
}

function isAuthenticated() {
  const role = getStoredRole();
  return role === "student" || role === "admin";
}

function updateNavAuthVisibility() {
  const role = getStoredRole();
  const isStudent = role === "student";
  const isAdmin = role === "admin";
  const isAuthed = isStudent || isAdmin;
  const canAccess = isStudent || isAdmin;
  ensureStudentNavLink(isStudent);
  toggleNavElements(".nav-auth-only", isAuthed);
  toggleNavElements(".nav-admin-only", isAdmin);
  toggleNavElements(".nav-student-only", isStudent);
  toggleNavElements(".role-admin-only", isAdmin);
  document.body.classList.toggle("student-auth", isStudent);
  document.body.classList.toggle("admin-auth", isAdmin);
  document.body.classList.toggle("user-auth", isAuthed);
  updateStudentLinks(canAccess);
}

function toggleNavElements(selector, shouldShow) {
  document.querySelectorAll(selector).forEach((el) => {
    el.hidden = !shouldShow;
    el.style.display = shouldShow ? "" : "none";
  });
}

function initAuthForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  const studentForm = document.getElementById("student-login-form");
  const adminForm = document.getElementById("admin-login-form");
  const tabStudent = document.getElementById("tab-student");
  const tabAdmin = document.getElementById("tab-admin");
  const recoveryForm = document.getElementById("recovery-form");
  const resetForm = document.getElementById("reset-form");
  const openRecoveryLinks = document.querySelectorAll("[data-open-recovery]");
  const cancelRecoveryLinks = document.querySelectorAll("[data-cancel-recovery]");

  const setLabelText = (label, htmlText) => {
    if (!label) return;
    const field = label.querySelector("input, select, textarea");
    if (field) {
      label.innerHTML = htmlText;
      label.appendChild(field);
    } else {
      label.innerHTML = htmlText;
    }
  };

  if (studentForm || adminForm) {
    if (loginForm && loginForm.parentNode) {
      loginForm.parentNode.removeChild(loginForm);
    }
  }

  if (studentForm && adminForm) {
    studentForm.hidden = false;
    adminForm.hidden = true;
    studentForm.style.display = 'flex';
    adminForm.style.display = 'none';
    if (tabStudent) tabStudent.classList.add("is-active");
    if (tabAdmin) tabAdmin.classList.remove("is-active");
  }

  if (tabStudent && tabAdmin && studentForm && adminForm) {
    tabStudent.addEventListener("click", () => {
      showStudentView();
    });
    tabAdmin.addEventListener("click", () => {
      showAdminView();
    });
  }

  if (studentForm) {
    const sLabels = studentForm.querySelectorAll("label");
    setLabelText(sLabels[0], "Correo electronico");
    setLabelText(sLabels[1], "Contrasena");
    const sLink = studentForm.querySelector("a.form-link");
    if (sLink) sLink.innerHTML = "¿Aun no tienes cuenta? Crear una nueva";
    const sPass = studentForm.querySelector('input[name="student-pass"]');
    if (sPass) sPass.placeholder = 'Contrasena de estudiante';
  }
  if (adminForm) {
    const aLabels = adminForm.querySelectorAll("label");
    setLabelText(aLabels[0], "Correo electronico");
    setLabelText(aLabels[1], "Contrasena");
    const aPass = adminForm.querySelector('input[name="admin-pass"]');
    if (aPass) aPass.placeholder = 'Contrasena de administrador';
  }

  const showStudentView = () => {
    if (studentForm) { studentForm.hidden = false; studentForm.style.display = "flex"; }
    if (adminForm) { adminForm.hidden = true; adminForm.style.display = "none"; }
    if (recoveryForm) { recoveryForm.hidden = true; recoveryForm.style.display = "none"; }
    if (resetForm) { resetForm.hidden = true; resetForm.style.display = "none"; }
    if (tabStudent && tabAdmin) {
      tabStudent.classList.add("is-active");
      tabAdmin.classList.remove("is-active");
    }
  };

  const showAdminView = () => {
    if (studentForm) { studentForm.hidden = true; studentForm.style.display = "none"; }
    if (adminForm) { adminForm.hidden = false; adminForm.style.display = "flex"; }
    if (recoveryForm) { recoveryForm.hidden = true; recoveryForm.style.display = "none"; }
    if (resetForm) { resetForm.hidden = true; resetForm.style.display = "none"; }
    if (tabStudent && tabAdmin) {
      tabAdmin.classList.add("is-active");
      tabStudent.classList.remove("is-active");
    }
  };

  const showRecoveryView = () => {
    if (studentForm) { studentForm.hidden = true; studentForm.style.display = "none"; }
    if (adminForm) { adminForm.hidden = true; adminForm.style.display = "none"; }
    if (recoveryForm) { recoveryForm.hidden = false; recoveryForm.style.display = "flex"; }
    if (resetForm) { resetForm.hidden = true; resetForm.style.display = "none"; }
    if (tabStudent) tabStudent.classList.remove("is-active");
    if (tabAdmin) tabAdmin.classList.remove("is-active");
  };

  const showResetView = () => {
    if (studentForm) { studentForm.hidden = true; studentForm.style.display = "none"; }
    if (adminForm) { adminForm.hidden = true; adminForm.style.display = "none"; }
    if (recoveryForm) { recoveryForm.hidden = true; recoveryForm.style.display = "none"; }
    if (resetForm) { resetForm.hidden = false; resetForm.style.display = "flex"; }
    if (tabStudent) tabStudent.classList.remove("is-active");
    if (tabAdmin) tabAdmin.classList.remove("is-active");
  };

  // Vista inicial según formularios presentes
  if (studentForm) {
    showStudentView();
  } else if (resetForm) {
    showResetView();
  } else if (recoveryForm) {
    showRecoveryView();
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has("forbidden") && adminForm) {
    showAdminView();
    showInlineMessage(adminForm, "Acceso restringido. Inicia sesion como administrador.", "error");
  }
  if ((params.has("required") || params.get("login") === "required") && studentForm) {
    showStudentView();
    showInlineMessage(studentForm, "Debes iniciar sesion para generar cuestionarios.", "info");
  }
  if (params.has("studentOnly") && studentForm) {
    showStudentView();
    showInlineMessage(studentForm, "Debes iniciar sesion como estudiante para generar cuestionarios.", "info");
  }
  if (resetForm) {
    const resetEmailParam = (params.get("email") || "").trim();
    const resetTokenParam = (params.get("token") || "").trim();
    const hasErrorParam = params.has("error");
    const resetEmailInput = resetForm.querySelector('input[name="reset-email"]');
    const resetTokenInput = resetForm.querySelector('input[name="reset-token"]');
    if (resetEmailInput && resetEmailParam) resetEmailInput.value = resetEmailParam;
    if (resetTokenInput && resetTokenParam) resetTokenInput.value = resetTokenParam;
    if (resetEmailParam || resetTokenParam) {
      showResetView();
      if (resetTokenInput) resetTokenInput.focus();
    }
    if (hasErrorParam) {
      showResetView();
      showInlineMessage(resetForm, "No pudimos enviar el correo de recuperacion. Ingresa el codigo que tengas o solicita uno nuevo.", "error");
    }
  }

  if (studentForm) {
    studentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(studentForm);
      const email = data.get("student-email");
      const pass = data.get("student-pass");

      try {
        const response = await postJson(`${API_BASE}/auth/login`, { email, password: pass });

        saveUserEmail(response.user.email);
        setStoredRole(response.user.role || "student");
        updateNavAuthVisibility();
        showInlineMessage(studentForm, "Inicio exitoso, redirigiendo...", "success");
        setTimeout(() => (window.location.href = "generador.html"), 700);
      } catch (error) {
        showInlineMessage(studentForm, error.message || "Credenciales inválidas.", "error");
      }
    });
  }

  if (adminForm) {
    adminForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(adminForm);
      const email = data.get("admin-email");
      const pass = data.get("admin-pass");

      try {
        // Intentar login contra backend primero
        const response = await postJson(`${API_BASE}/auth/login`, { email, password: pass });

        if (response.user.role !== 'admin') {
          throw new Error("No tienes permisos de administrador.");
        }

        saveUserEmail(response.user.email);
        setStoredRole("admin");
        updateNavAuthVisibility();
        showInlineMessage(adminForm, "Acceso de administrador concedido, redirigiendo...", "success");
        setTimeout(() => (window.location.href = "admin.html#progreso"), 650);
      } catch (error) {
        // Fallback a credenciales locales por si acaso (opcional, se puede quitar)
        if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
          saveUserEmail(email);
          setStoredRole("admin");
          updateNavAuthVisibility();
          showInlineMessage(adminForm, "Acceso de administrador concedido (local), redirigiendo...", "success");
          setTimeout(() => (window.location.href = "admin.html#progreso"), 650);
        } else {
          showInlineMessage(adminForm, error.message || "Credenciales de administrador inválidas.", "error");
        }
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(registerForm);
      const email = (data.get("register-email") || "").trim();
      const pass = (data.get("register-pass") || "").trim();

      if (!email || !pass) {
        showInlineMessage(registerForm, "Completa correo y contraseña para continuar.", "error");
        return;
      }
      if (pass.length < 8) {
        showInlineMessage(registerForm, "La contraseña debe tener al menos 8 caracteres.", "error");
        return;
      }

      try {
        await postJson(`${API_BASE}/auth/register`, { email, password: pass, role: 'student' });

        // Auto login después de registro
        saveUserEmail(email);
        setStoredRole("student");
        updateNavAuthVisibility();
        showInlineMessage(registerForm, "Cuenta creada. Redirigiendo a cuestionarios...", "success");
        setTimeout(() => (window.location.href = "generador.html"), 700);
      } catch (error) {
        showInlineMessage(registerForm, error.message || "No se pudo crear la cuenta.", "error");
      }
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = new FormData(loginForm).get("login-email");
      saveUserEmail(email);
      showInlineMessage(loginForm, `Ingreso simulado para ${email}. Ya puedes generar un cuestionario.`, "success");
    });
  }

  openRecoveryLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showRecoveryView();
      const emailField = recoveryForm ? recoveryForm.querySelector('input[name="recovery-email"]') : null;
      if (emailField) emailField.focus();
    });
  });

  cancelRecoveryLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showStudentView();
    });
  });

  if (recoveryForm) {
    recoveryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const emailField = recoveryForm.querySelector('input[name="recovery-email"]');
      const email = (emailField && emailField.value || "").trim();
      if (!email) {
        showInlineMessage(recoveryForm, "Ingresa un correo electronico para continuar.", "error");
        return;
      }
      const redirectTarget = `reset.html?email=${encodeURIComponent(email)}`;
      const button = recoveryForm.querySelector('button[type="submit"]');
      if (button) button.disabled = true;

      // Lanza la solicitud y redirige de inmediato; usamos keepalive para no perder la petici\u00f3n al navegar.
      fetch(`${API_BASE}/auth/recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        keepalive: true,
      }).catch(() => {
        // Si falla, igualmente el usuario podr\u00e1 intentar nuevamente desde reset.html
      });

      window.location.href = redirectTarget;
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(resetForm);
      const email = (data.get("reset-email") || "").trim();
      const token = (data.get("reset-token") || "").trim();
      const newPass = (data.get("reset-pass") || "").trim();
      const confirm = (data.get("reset-pass-confirm") || "").trim();
      if (!email || !token || !newPass || !confirm) {
        showInlineMessage(resetForm, "Completa todos los campos para continuar.", "error");
        return;
      }
      if (newPass.length < 8) {
        showInlineMessage(resetForm, "La contrasena debe tener al menos 8 caracteres.", "error");
        return;
      }
      if (newPass !== confirm) {
        showInlineMessage(resetForm, "Las contrasenas no coinciden.", "error");
        return;
      }
      const button = resetForm.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const payload = await requestPasswordReset(email, token, newPass);
        saveStudentAccount({ email, pass: newPass });
        showInlineMessage(resetForm, (payload && payload.message) || "Contraseña actualizada. Redirigiendo a crear cuestionario...", "success");
        setTimeout(() => {
          window.location.href = "generador.html";
        }, 600);
      } catch (error) {
        showInlineMessage(resetForm, error.message || "No se pudo restablecer la contraseña.", "error");
        if (button) button.disabled = false;
      }
    });
  }
}

function initLogoutControls() {
  const logoutButtons = document.querySelectorAll("[data-auth-logout]");
  if (!logoutButtons.length) return;

  logoutButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      localStorage.removeItem(USER_KEY);
      setStoredRole(null);
      updateNavAuthVisibility();
      const redirectTarget = button.dataset.redirect || "login.html";
      window.location.href = redirectTarget;
    });
  });
}

function initStudentLinkGuards() {
  const guardedLinks = document.querySelectorAll("[data-require-student]");
  if (!guardedLinks.length) return;
  guardedLinks.forEach((link) => guardStudentLink(link));
}

function guardStudentLink(link) {
  if (!link || link.dataset.studentGuarded === "1") return;
  if (!link.dataset.studentHref) {
    const currentHref = link.getAttribute("href");
    if (currentHref && currentHref !== "#") {
      link.dataset.studentHref = currentHref;
    }
  }
  const role = getStoredRole();
  const isAllowed = role === "student" || role === "admin";
  if (!isAllowed) {
    link.setAttribute("href", "#");
  }
  link.addEventListener("click", handleStudentLinkClick);
  link.dataset.studentGuarded = "1";
}

function handleStudentLinkClick(event) {
  const link = event.currentTarget;
  const role = getStoredRole();
  if (role === "student" || role === "admin") {
    if (link.getAttribute("href") === "#" && link.dataset.studentHref) {
      event.preventDefault();
      window.location.href = link.dataset.studentHref;
    }
    return;
  }
  event.preventDefault();
  const redirectTarget = link.dataset.requireRedirect || "login.html?studentOnly=1";
  window.location.href = redirectTarget;
}

function ensureStudentNavLink(isStudent) {
  document.querySelectorAll("[data-student-nav-slot]").forEach((slot) => {
    let link = slot.querySelector("[data-student-nav-link]");
    if (isStudent) {
      if (!link) {
        link = document.createElement("a");
        link.textContent = "Cuestionarios";
        link.dataset.studentHref = "generador.html";
        link.dataset.requireStudent = "1";
        link.dataset.studentNavLink = "1";
        link.classList.add("nav-student-only");
        slot.appendChild(link);
        guardStudentLink(link);
      }
    } else if (link) {
      link.remove();
    }
  });
}

function updateStudentLinks(canAccess) {
  document.querySelectorAll("[data-student-href]").forEach((link) => {
    const target = link.dataset.studentHref;
    if (!target) return;
    if (canAccess) {
      link.setAttribute("href", target);
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
    } else {
      link.setAttribute("href", "#");
      if (link.classList.contains("nav-student-only")) {
        link.setAttribute("aria-disabled", "true");
        link.tabIndex = -1;
      } else {
        link.removeAttribute("aria-disabled");
        link.removeAttribute("tabindex");
      }
    }
  });
}

function showInlineMessage(form, text, type = "info") {
  form.querySelectorAll(".form-message").forEach((node) => node.remove());
  const message = document.createElement("div");
  message.className = `form-message form-message-${type}`;
  message.textContent = text;
  form.appendChild(message);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    payload = {};
  }
  if (!response.ok) {
    const message = payload.message || "Cambio de contraseña exitoso.";
    throw new Error(message);
  }
  return payload;
}

function requestPasswordRecovery(email) {
  return postJson(`${API_BASE}/auth/recovery`, { email });
}

function requestPasswordReset(email, token, newPassword) {
  return postJson(`${API_BASE}/auth/reset`, { email, token, newPassword });
}

function saveUserEmail(email) {
  if (!email) return;
  localStorage.setItem(USER_KEY, email);
}

function saveStudentAccount(account) {
  if (!account || !account.email || !account.pass) return;
  try {
    localStorage.setItem(STUDENT_ACCOUNT_KEY, JSON.stringify(account));
  } catch (error) {
    console.warn("No se pudo guardar la nueva cuenta de estudiante.", error);
  }
}

function getStoredStudentAccount() {
  try {
    const raw = localStorage.getItem(STUDENT_ACCOUNT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email && parsed.pass) {
      return parsed;
    }
  } catch (error) {
    console.warn("No se pudo leer la cuenta de estudiante guardada.", error);
  }
  return null;
}

function loadCustomQuestions() {
  try {
    const raw = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("No se pudo leer el banco de preguntas personalizado.", error);
    return [];
  }
}

function saveCustomQuestions(questions) {
  try {
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(Array.isArray(questions) ? questions : []));
  } catch (error) {
    console.warn("No se pudo guardar el banco de preguntas personalizado.", error);
  }
}

function getScopedCustomQuestions(topic, difficulty) {
  const topics = topic === "todos" ? Object.keys(questionGenerators || {}) : [topic];
  return loadCustomQuestions().filter(
    (question) => topics.includes(question.topic) && question.difficulty === difficulty
  );
}

function protectAdmin() {
  const role = getStoredRole();
  if (role !== "admin") {
    window.location.replace("login.html?forbidden=1");
  }
}

function initAdminQuestionEditor() {
  const scopeForm = document.getElementById("admin-question-scope");
  const editorPanel = document.getElementById("admin-question-editor-panel");
  const editorForm = document.getElementById("admin-question-form");
  const listContainer = document.getElementById("admin-question-list");
  const contextLabel = document.getElementById("question-editor-context");
  if (!scopeForm || !editorPanel || !editorForm || !listContainer) return;

  let currentTopic = null;
  let currentDifficulty = null;

  scopeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(scopeForm);
    currentTopic = data.get("topic");
    currentDifficulty = data.get("difficulty");
    if (!currentTopic || !currentDifficulty) {
      showInlineMessage(scopeForm, "Selecciona un tema y dificultad para continuar.", "info");
      return;
    }
    editorPanel.hidden = false;
    editorForm.reset();
    if (contextLabel) {
      contextLabel.textContent = `${topicLabel(currentTopic)} - ${difficultyLabel(currentDifficulty)}`;
    }
    renderCustomQuestionList();
  });

  editorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentTopic || !currentDifficulty) {
      showInlineMessage(editorForm, "Primero elige el tema a editar.", "info");
      return;
    }
    const data = new FormData(editorForm);
    const prompt = (data.get("prompt") || "").trim();
    const options = [1, 2, 3, 4].map((index) => (data.get(`option-${index}`) || "").trim());
    const answerIndex = parseInt(data.get("answer-index"), 10);
    const explanation = (data.get("explanation") || "").trim();
    if (!prompt || options.some((option) => !option)) {
      showInlineMessage(editorForm, "Completa el enunciado y las cuatro opciones.", "error");
      return;
    }
    if (Number.isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) {
      showInlineMessage(editorForm, "Define cu\u00e1l opci\u00f3n es la correcta.", "error");
      return;
    }

    const bank = loadCustomQuestions();
    bank.push({
      id: `q-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      topic: currentTopic,
      difficulty: currentDifficulty,
      prompt,
      options,
      answerIndex,
      explanation,
    });
    saveCustomQuestions(bank);
    showInlineMessage(editorForm, "Pregunta agregada al banco personalizado.", "success");
    editorForm.reset();
    renderCustomQuestionList();
  });

  listContainer.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-question]");
    if (!button) return;
    event.preventDefault();
    const remaining = loadCustomQuestions().filter((question) => question.id !== button.dataset.deleteQuestion);
    saveCustomQuestions(remaining);
    renderCustomQuestionList();
  });

  function renderCustomQuestionList() {
    if (!currentTopic || !currentDifficulty) {
      listContainer.innerHTML = '<p class="text-muted">Selecciona un tema para cargar el banco.</p>';
      return;
    }
    const scopedQuestions = getScopedCustomQuestions(currentTopic, currentDifficulty);
    if (!scopedQuestions.length) {
      listContainer.innerHTML = `<p class="text-muted">A\u00fan no hay preguntas personalizadas para ${topicLabel(currentTopic)} (${difficultyLabel(currentDifficulty)}).</p>`;
      return;
    }
    listContainer.innerHTML = "";
    scopedQuestions.forEach((question, index) => {
      const item = document.createElement("article");
      item.className = "custom-question-item";

      const meta = document.createElement("div");
      meta.className = "custom-question-meta";

      const info = document.createElement("div");
      const questionTag = document.createElement("span");
      questionTag.className = "tag";
      questionTag.textContent = `Pregunta ${index + 1}`;
      const title = document.createElement("h4");
      title.textContent = question.prompt;
      const optionList = document.createElement("ul");
      optionList.className = "custom-question-options";
      question.options.forEach((option, optionIndex) => {
        const li = document.createElement("li");
        li.textContent = option;
        if (optionIndex === Number(question.answerIndex)) {
          li.classList.add("is-correct");
        }
        optionList.appendChild(li);
      });
      info.appendChild(questionTag);
      info.appendChild(title);
      info.appendChild(optionList);

      const actions = document.createElement("div");
      actions.className = "custom-question-actions";
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "btn btn-outline btn-small";
      removeButton.dataset.deleteQuestion = question.id;
      removeButton.textContent = "Quitar";
      actions.appendChild(removeButton);

      meta.appendChild(info);
      meta.appendChild(actions);
      item.appendChild(meta);

      if (question.explanation) {
        const note = document.createElement("p");
        note.className = "text-muted";
        note.textContent = question.explanation;
        item.appendChild(note);
      }

      listContainer.appendChild(item);
    });
  }

  renderCustomQuestionList();
}
function initQuizPage() {
  const configForm = document.getElementById("quiz-config");
  const player = document.getElementById("quiz-player");
  const summary = document.getElementById("quiz-summary");
  if (!configForm || !player || !summary) return;

  const nextButton = document.getElementById("quiz-next");
  const finishButton = document.getElementById("quiz-finish");
  const feedbackBox = document.getElementById("quiz-feedback");

  const state = {
    config: null,
    questions: [],
    currentIndex: 0,
    correct: 0,
    responses: [],
    startTime: 0,
    timerInterval: null,
  };

  configForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(configForm);
    const config = {
      topic: formData.get("topic"),
      difficulty: formData.get("difficulty"),
      total: parseInt(formData.get("questions"), 10),
    };

    const questions = buildQuiz(config);
    if (!questions.length) {
      showInlineMessage(configForm, "No hay suficientes variaciones para esa combinación. Ajusta la configuración e inténtalo de nuevo.", "error");
      return;
    }

    state.config = config;
    state.questions = questions;
    state.currentIndex = 0;
    state.correct = 0;
    state.responses = new Array(questions.length).fill(null);
    state.startTime = Date.now();

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => updateTimer(state.startTime), 500);

    player.hidden = false;
    summary.hidden = true;
    feedbackBox.hidden = true;
    nextButton.disabled = true;
    finishButton.hidden = true;

    renderQuestion(state);
  });

  nextButton.addEventListener("click", () => {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion(state);
      feedbackBox.hidden = true;
      nextButton.disabled = true;
      finishButton.hidden = state.currentIndex !== state.questions.length - 1;
    }
  });

  finishButton.addEventListener("click", () => concludeQuiz(state, summary, player));
}

function buildQuiz(config) {
  const topics = config.topic === "todos" ? Object.keys(questionGenerators) : [config.topic];
  const available = topics
    .map((topic) => {
      const generator = questionGenerators[topic]?.[config.difficulty];
      if (!generator) return null;
      return { topic, generator };
    })
    .filter(Boolean);

  const questions = [];
  const seen = new Set();
  const customPool = shuffleArray(getScopedCustomQuestions(config.topic, config.difficulty));

  while (questions.length < config.total && customPool.length) {
    const customQuestion = customPool.shift();
    if (!customQuestion || !Array.isArray(customQuestion.options) || customQuestion.options.length < 2) continue;
    const key = `${customQuestion.topic || config.topic}-${customQuestion.prompt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const parsedAnswerIndex = Number(customQuestion.answerIndex);
    questions.push({
      prompt: customQuestion.prompt,
      options: customQuestion.options,
      answerIndex: Number.isFinite(parsedAnswerIndex) ? parsedAnswerIndex : 0,
      explanation: customQuestion.explanation || "",
      topic: customQuestion.topic || config.topic,
      difficulty: customQuestion.difficulty || config.difficulty,
      custom: true,
    });
  }

  if (!available.length && !questions.length) {
    return [];
  }

  const maxAttempts = Math.max(config.total * 30, 60);
  let attempts = 0;

  while (questions.length < config.total && attempts < maxAttempts) {
    const { topic, generator } = available[Math.floor(Math.random() * available.length)];
    const question = generator();
    attempts += 1;

    if (!question || !Array.isArray(question.options) || question.options.length < 4) continue;

    const key = `${topic}-${question.prompt}`;
    if (seen.has(key)) continue;

    seen.add(key);
    questions.push({ ...question, topic, difficulty: config.difficulty });
  }

  return questions.length === config.total
    ? questions.map((question, index) => ({ ...question, order: index + 1 }))
    : [];
}

function renderQuestion(state) {
  const question = state.questions[state.currentIndex];
  const counter = document.getElementById("quiz-counter");
  const topicTag = document.getElementById("quiz-topic-tag");
  const title = document.getElementById("quiz-question-title");
  const text = document.getElementById("quiz-question-text");
  const optionsBox = document.getElementById("quiz-options");
  const feedbackBox = document.getElementById("quiz-feedback");
  const nextButton = document.getElementById("quiz-next");
  const finishButton = document.getElementById("quiz-finish");

  counter.textContent = `${state.currentIndex + 1}/${state.questions.length}`;
  topicTag.textContent = topicLabel(question.topic);
  title.textContent = `Pregunta ${state.currentIndex + 1}`;
  text.textContent = question.prompt;

  feedbackBox.hidden = true;
  feedbackBox.classList.remove("correct", "incorrect");
  feedbackBox.textContent = "";

  optionsBox.innerHTML = "";
  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-outline";
    button.textContent = option;
    button.addEventListener("click", () => {
      handleAnswerSelection(state, question, index, button, optionsBox, feedbackBox, nextButton, finishButton);
    });
    optionsBox.appendChild(button);
  });

  nextButton.disabled = true;
  finishButton.hidden = state.currentIndex !== state.questions.length - 1;
}

function handleAnswerSelection(state, question, selectedIndex, selectedButton, optionsBox, feedbackBox, nextButton, finishButton) {
  const isCorrect = selectedIndex === question.answerIndex;
  if (isCorrect) {
    state.correct += 1;
  }

  Array.from(optionsBox.children).forEach((button, index) => {
    button.disabled = true;
    if (index === question.answerIndex) {
      button.classList.add("btn-success");
    }
    if (index === selectedIndex && index !== question.answerIndex) {
      button.classList.add("btn-error");
    }
  });

  feedbackBox.hidden = false;
  feedbackBox.classList.toggle("correct", isCorrect);
  feedbackBox.classList.toggle("incorrect", !isCorrect);
  feedbackBox.textContent = isCorrect
    ? "¡Respuesta correcta!"
    : `Respuesta incorrecta. ${question.explanation || "Revisa la explicación para mejorar."}`;

  state.responses[state.currentIndex] = {
    prompt: question.prompt,
    selected: question.options[selectedIndex],
    correct: question.options[question.answerIndex],
    isCorrect,
  };

  nextButton.disabled = state.currentIndex === state.questions.length - 1;
  finishButton.hidden = state.currentIndex !== state.questions.length - 1;
  if (!nextButton.disabled) {
    nextButton.focus();
  } else if (!finishButton.hidden) {
    finishButton.focus();
  }
}

function concludeQuiz(state, summarySection, playerSection) {
  clearInterval(state.timerInterval);
  playerSection.hidden = true;
  summarySection.hidden = false;

  const totalTime = Math.round((Date.now() - state.startTime) / 1000);
  const summaryText = buildSummaryText(state.correct, state.questions.length, totalTime);
  const summaryLabel = document.getElementById("quiz-summary-text");
  const scoreLabel = document.getElementById("quiz-summary-score");
  const timeLabel = document.getElementById("quiz-summary-time");
  const detailsContainer = document.getElementById("quiz-summary-details");

  summaryLabel.textContent = summaryText;
  scoreLabel.textContent = `${state.correct}/${state.questions.length}`;
  timeLabel.textContent = formatTimer(totalTime);

  detailsContainer.innerHTML = "";
  state.responses.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "summary-item";
    const question = state.questions[index];
    item.innerHTML = `
      <h3>Pregunta ${index + 1}</h3>
      <p>${question.prompt}</p>
      <p><strong>Tu respuesta:</strong> ${entry?.selected || "Sin responder"}</p>
      <p><strong>Respuesta correcta:</strong> ${question.options[question.answerIndex]}</p>
    `;
    detailsContainer.appendChild(item);
  });

  saveAttempt({
    topic: state.config.topic,
    difficulty: state.config.difficulty,
    total: state.questions.length,
    correct: state.correct,
    duration: totalTime,
    questions: state.questions.map((question, index) => ({
      prompt: question.prompt,
      correctAnswer: question.options[question.answerIndex],
      selectedAnswer: state.responses[index]?.selected || null,
      explanation: question.explanation || "",
      isCorrect: state.responses[index]?.isCorrect || false,
    })),
  });
}

function buildSummaryText(correct, total, totalTime) {
  const accuracy = Math.round((correct / total) * 100);
  return `Respuestas correctas: ${accuracy}% en ${formatTimer(totalTime)}.`;
}

function updateTimer(startTime) {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const timerLabel = document.getElementById("quiz-timer");
  if (!timerLabel) return;
  timerLabel.textContent = formatTimer(elapsed);
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
function saveAttempt(attempt) {
  const history = getHistory();
  const record = {
    ...attempt,
    timestamp: new Date().toISOString(),
  };
  history.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
}

function getHistory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("No se pudo leer el historial", error);
    return [];
  }
}

function renderHistoryPage() {
  const history = getHistory();
  const emptyState = document.getElementById("history-empty");
  const tableWrapper = document.getElementById("history-table-wrapper");
  const tableBody = document.getElementById("history-body");
  if (!emptyState || !tableWrapper || !tableBody) return;

  if (!history.length) {
    emptyState.hidden = false;
    tableWrapper.hidden = true;
    return;
  }

  emptyState.hidden = true;
  tableWrapper.hidden = false;
  tableBody.innerHTML = "";

  history.forEach((attempt) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatDate(attempt.timestamp)}</td>
      <td>${topicLabel(attempt.topic)}</td>
      <td>${difficultyLabel(attempt.difficulty)}</td>
      <td>${attempt.correct}/${attempt.total}</td>
      <td>${formatTimer(attempt.duration)}</td>
      <td>${Math.round((attempt.correct / attempt.total) * 100)}%</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderFeedbackPage() {
  const history = getHistory();
  const lastAttempt = history[0];
  const emptyState = document.getElementById("feedback-empty");
  const content = document.getElementById("feedback-content");
  const exportButton = document.getElementById("feedback-export");
  if (!emptyState || !content) return;

  if (!lastAttempt) {
    emptyState.hidden = false;
    content.hidden = true;
    return;
  }

  emptyState.hidden = true;
  content.hidden = false;

  document.getElementById("feedback-topic").textContent = topicLabel(lastAttempt.topic);
  document.getElementById("feedback-difficulty").textContent = difficultyLabel(lastAttempt.difficulty);
  document.getElementById("feedback-score").textContent = `${lastAttempt.correct}/${lastAttempt.total}`;
  document.getElementById("feedback-time").textContent = formatTimer(lastAttempt.duration);

  const list = document.getElementById("feedback-list");
  list.innerHTML = "";
  lastAttempt.questions.forEach((question, index) => {
    const item = document.createElement("div");
    item.className = "feedback-item";
    item.innerHTML = `
      <h3>Pregunta ${index + 1}</h3>
      <p>${question.prompt}</p>
      <p><strong>Tu respuesta:</strong> ${question.selectedAnswer || "Sin responder"}</p>
      <p><strong>Respuesta correcta:</strong> ${question.correctAnswer}</p>
      ${question.explanation ? `<p><strong>Explicación:</strong> ${question.explanation}</p>` : ""}
    `;
    list.appendChild(item);
  });

  if (exportButton) {
    exportButton.onclick = () => downloadFeedback(lastAttempt);
  }
}

function downloadFeedback(attempt) {
  const blob = new Blob([JSON.stringify(attempt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeTimestamp = attempt.timestamp ? attempt.timestamp.replace(/[:]/g, "-") : Date.now();
  link.download = `eduquiz-feedback-${safeTimestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function topicLabel(topic) {
  switch (topic) {
    case "algebra":
      return "Álgebra";
    case "geometria":
      return "Geometría";
    case "probabilidad":
      return "Probabilidad y estadística";
    case "ecuaciones":
      return "Ecuaciones lineales";
    case "fracciones":
      return "Fracciones y proporciones";
    case "sistemas":
      return "Sistemas 2x2";
    case "todos":
      return "Todos los temas";
    default:
      return "Álgebra";
  }
}

function difficultyLabel(level) {
  switch (level) {
    case "basico":
      return "Básico";
    case "intermedio":
      return "Intermedio";
    case "avanzado":
      return "Avanzado";
    default:
      return level;
  }
}
const questionGenerators = {
  algebra: {
    basico: generateAlgebraBasicoQuestion,
    intermedio: generateAlgebraIntermedioQuestion,
    avanzado: generateAlgebraAvanzadoQuestion,
  },
  geometria: {
    basico: generateGeometriaBasicoQuestion,
    intermedio: generateGeometriaIntermedioQuestion,
    avanzado: generateGeometriaAvanzadoQuestion,
  },
  probabilidad: {
    basico: generateProbabilidadBasicoQuestion,
    intermedio: generateProbabilidadIntermedioQuestion,
    avanzado: generateProbabilidadAvanzadoQuestion,
  },
  ecuaciones: {
    basico: generateEcuacionesBasicoQuestion,
    intermedio: generateEcuacionesIntermedioQuestion,
    avanzado: generateEcuacionesAvanzadoQuestion,
  },
  fracciones: {
    basico: generateFraccionesBasicoQuestion,
    intermedio: generateFraccionesIntermedioQuestion,
    avanzado: generateFraccionesAvanzadoQuestion,
  },
  sistemas: {
    basico: generateSistemasBasicoQuestion,
    intermedio: generateSistemasIntermedioQuestion,
    avanzado: generateSistemasAvanzadoQuestion,
  },
};

function generateAlgebraBasicoQuestion() {
  const a = randomInt(2, 9);
  const b = randomInt(2, 9);
  let constant = randomInt(-6, 6);
  if (Math.random() < 0.5) {
    constant = 0;
  }
  const prompt = `Simplifica la expresión ${formatOriginalLinearExpression(a, b, constant)}.`;
  const coefficient = a + b;
  const correct = formatLinearExpression(coefficient, constant);
  const candidates = [
    formatLinearExpression(coefficient + 2, constant),
    formatLinearExpression(coefficient - 2, constant),
    formatLinearExpression(coefficient, constant + (constant === 0 ? 4 : 3)),
  ];
  const options = createOptions(
    correct,
    candidates,
    () => formatLinearExpression(coefficient + randomInt(3, 5), constant - randomInt(1, 4)),
  );
  const explanation = constant === 0
    ? `Suma los coeficientes ${a} y ${b} para obtener ${coefficient}x.`
    : `Suma los coeficientes ${a} y ${b} para obtener ${coefficient}x y conserva el término constante ${constant}.`;

  return {
    prompt,
    options,
    answerIndex: options.indexOf(correct),
    explanation,
  };
}

function generateAlgebraIntermedioQuestion() {
  const multiplier = randomInt(2, 6);
  const offset = randomInt(-6, 6);
  const solution = randomInt(-6, 8);
  const result = multiplier * (solution + offset);
  const prompt = `Resuelve ${multiplier}(x ${formatSignedNumber(offset)}) = ${result}.`;
  const correct = `x = ${solution}`;
  const candidates = [
    `x = ${solution + randomInt(2, 4)}`,
    `x = ${solution - randomInt(1, 3)}`,
    `x = ${solution + offset}`,
  ];
  const options = createOptions(correct, candidates, (attempt) => `x = ${solution + attempt + 5}`);
  const explanation = offset >= 0
    ? `Divide ambos lados entre ${multiplier} para obtener x ${formatSignedNumber(offset)} = ${result / multiplier}. Luego resta ${offset} para hallar x = ${solution}.`
    : `Divide ambos lados entre ${multiplier} para obtener x ${formatSignedNumber(offset)} = ${result / multiplier}. Luego suma ${Math.abs(offset)} para hallar x = ${solution}.`;

  return {
    prompt,
    options,
    answerIndex: options.indexOf(correct),
    explanation,
  };
}

function generateAlgebraAvanzadoQuestion() {
  const type = randomChoice(["differenceSquares", "evaluate", "factorCommon", "rationalSimplify", "expandBinomial"]);

  if (type === "differenceSquares") {
    const k = randomInt(3, 8);
    const prompt = `Simplifica (x^2 - ${k * k})/(x - ${k}).`;
    const correct = `x + ${k}`;
    const candidates = [`x - ${k}`, `x + ${k - 1}`, `x + ${k + 1}`];
    const options = createOptions(correct, candidates, (attempt) => `x + ${k + attempt + 2}`);
    const explanation = `Factoriza x^2 - ${k * k} como (x - ${k})(x + ${k}) y simplifica con el denominador.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "evaluate") {
    const a = randomInt(-4, 4) || 2;
    const b = randomInt(-5, 5);
    const c = randomInt(-6, 6);
    const value = randomInt(-3, 4);
    const expression = formatQuadraticExpression(a, b, c);
    const result = a * value * value + b * value + c;
    const prompt = `Si f(x) = ${expression}, ¿cuánto vale f(${value})?`;
    const correct = `${result}`;
    const candidates = [`${result + randomInt(2, 4)}`, `${result - randomInt(1, 3)}`, `${result + randomInt(5, 7)}`];
    const options = createOptions(correct, candidates, () => `${result + randomInt(8, 12)}`);
    const explanation = `Sustituye x = ${value} en la expresión y evalúa: ${result}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "factorCommon") {
    const factor = randomInt(2, 6);
    const constant = randomInt(2, 8);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const secondTerm = factor * constant * sign;
    const operator = sign === 1 ? "+" : "-";
    const prompt = `Factoriza la expresión ${factor}x ${operator} ${Math.abs(secondTerm)}.`;
    const correct = `${factor}(x ${operator} ${Math.abs(constant)})`;
    const candidates = [
      `${factor}(x ${operator} ${Math.abs(constant) + 1})`,
      `${factor}(x ${operator === "+" ? "-" : "+"} ${Math.abs(constant)})`,
      `${factor / 2}(2x ${operator} ${Math.abs(secondTerm)})`,
    ];
    const options = createOptions(correct, candidates, () => `${factor}(x ${operator} ${Math.abs(constant) + randomInt(2, 3)})`);
    const explanation = `Extrae el factor común ${factor}: ${factor}x ${operator} ${Math.abs(secondTerm)} = ${factor}(x ${operator} ${Math.abs(constant)}).`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "rationalSimplify") {
    const base = randomInt(2, 5);
    const adjust = randomInt(2, 7);
    const sign = Math.random() < 0.5 ? 1 : -1;
    const prompt = `Simplifica (${base}x^2 ${sign === 1 ? "+" : "-"} ${base * adjust}x)/(${base}x).`;
    const correct = sign === 1 ? `x + ${adjust}` : `x - ${adjust}`;
    const candidates = [
      sign === 1 ? `x - ${adjust}` : `x + ${adjust}`,
      sign === 1 ? `x + ${adjust - 1}` : `x - ${adjust - 1}`,
      sign === 1 ? `${base}x + ${adjust}` : `${base}x - ${adjust}`,
    ];
    const options = createOptions(correct, candidates, (attempt) => `x ${sign === 1 ? "+" : "-"} ${adjust + attempt + 1}`);
    const explanation = `Divide cada término entre ${base}x para obtener ${correct}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const m = randomInt(-6, 6);
  const n = randomInt(-6, 6);
  const prompt = `Expande (${formatBinomialTerm(m)})(${formatBinomialTerm(n)}).`;
  const sum = m + n;
  const product = m * n;
  const correct = formatQuadraticFromSumProduct(sum, product);
  const candidates = [
    formatQuadraticFromSumProduct(sum + 1, product),
    formatQuadraticFromSumProduct(sum - 1, product + 1),
    formatQuadraticFromSumProduct(sum, product - 1),
  ];
  const options = createOptions(correct, candidates, () => formatQuadraticFromSumProduct(sum + randomInt(2, 3), product + randomInt(1, 2)));
  const explanation = `Multiplica los binomios y agrupa: x^2 + ${sum}x + ${product}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateGeometriaBasicoQuestion() {
  const type = randomChoice(["squareArea", "rectangleArea", "rectanglePerimeter", "triangleArea"]);

  if (type === "squareArea") {
    const side = randomInt(3, 12);
    const area = side * side;
    const prompt = `¿Cuál es el área de un cuadrado con lado de ${side} cm?`;
    const correct = `${area} cm^2`;
    const candidates = [`${(side + 1) ** 2} cm^2`, `${side * (side - 1)} cm^2`, `${side * 4} cm^2`];
    const options = createOptions(correct, candidates, (attempt) => `${(side + attempt + 2) ** 2} cm^2`);
    const explanation = `El área es lado × lado: ${side} × ${side} = ${area} cm^2.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "rectangleArea") {
    const length = randomInt(5, 12);
    const width = randomInt(3, 9);
    const area = length * width;
    const prompt = `¿Cuál es el área de un rectángulo de ${length} cm por ${width} cm?`;
    const correct = `${area} cm^2`;
    const candidates = [`${(length + 1) * width} cm^2`, `${length * (width + 2)} cm^2`, `${(length - 1) * width} cm^2`];
    const options = createOptions(correct, candidates, () => `${(length + randomInt(2, 4)) * (width + randomInt(1, 2))} cm^2`);
    const explanation = `Multiplica base por altura: ${length} × ${width} = ${area} cm^2.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "rectanglePerimeter") {
    const length = randomInt(4, 10);
    const width = randomInt(3, 8);
    const perimeter = 2 * (length + width);
    const prompt = `¿Cuál es el perímetro de un rectángulo de ${length} cm por ${width} cm?`;
    const correct = `${perimeter} cm`;
    const candidates = [`${length + width} cm`, `${2 * length + width} cm`, `${length + 2 * width} cm`];
    const options = createOptions(correct, candidates, (attempt) => `${2 * (length + width + attempt)} cm`);
    const explanation = `Perímetro = 2(${length} + ${width}) = ${perimeter} cm.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const base = randomInt(6, 14);
  const height = randomInt(4, 12);
  const area = (base * height) / 2;
  const prompt = `¿Cuál es el área de un triángulo con base de ${base} cm y altura de ${height} cm?`;
  const correct = `${area} cm^2`;
  const candidates = [`${base * height} cm^2`, `${(base * height) / 3} cm^2`, `${(base + height)} cm^2`];
  const options = createOptions(correct, candidates, () => `${(base + randomInt(2, 3)) * height / 2} cm^2`);
  const explanation = `Aplica (base × altura) / 2: (${base} × ${height}) / 2 = ${area} cm^2.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateGeometriaIntermedioQuestion() {
  const type = randomChoice(["circleArea", "circumference", "parallelogramArea", "trapezoidArea"]);

  if (type === "circleArea") {
    const radius = randomInt(3, 8);
    const area = Math.PI * radius * radius;
    const prompt = `¿Cuál es el área de un círculo de radio ${radius} cm? (Usa pi ≈ 3.14)`;
    const correct = `${formatNumber(area)} cm^2`;
    const candidates = [
      `${formatNumber(Math.PI * (radius + 1) * (radius + 1))} cm^2`,
      `${formatNumber(Math.PI * radius * (radius - 1))} cm^2`,
      `${formatNumber(2 * Math.PI * radius)} cm^2`,
    ];
    const options = createOptions(correct, candidates, () => `${formatNumber(Math.PI * (radius + randomInt(2, 3)) ** 2)} cm^2`);
    const explanation = `Área = pir^2 = 3.14 × ${radius}^2 = ${formatNumber(area)} cm^2.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "circumference") {
    const radius = randomInt(3, 9);
    const circumference = 2 * Math.PI * radius;
    const prompt = `¿Cuál es la circunferencia de un círculo de radio ${radius} cm? (Usa pi ≈ 3.14)`;
    const correct = `${formatNumber(circumference)} cm`;
    const candidates = [
      `${formatNumber(Math.PI * radius * radius)} cm`,
      `${formatNumber(2 * Math.PI * (radius + 1))} cm`,
      `${formatNumber(Math.PI * (radius + radius))} cm`,
    ];
    const options = createOptions(correct, candidates, () => `${formatNumber(2 * Math.PI * (radius + randomInt(2, 3)))} cm`);
    const explanation = `Circunferencia = 2pir = 2 × 3.14 × ${radius} = ${formatNumber(circumference)} cm.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "parallelogramArea") {
    const base = randomInt(6, 14);
    const height = randomInt(4, 10);
    const area = base * height;
    const prompt = `¿Cuál es el área de un paralelogramo con base de ${base} cm y altura de ${height} cm?`;
    const correct = `${area} cm^2`;
    const candidates = [`${(base * height) / 2} cm^2`, `${(base + height)} cm^2`, `${(base + 2) * height} cm^2`];
    const options = createOptions(correct, candidates, () => `${(base + randomInt(2, 3)) * height} cm^2`);
    const explanation = `Área = base × altura: ${base} × ${height} = ${area} cm^2.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const majorBase = randomInt(8, 16);
  const minorBase = randomInt(4, majorBase - 2);
  const height = randomInt(4, 10);
  const area = ((majorBase + minorBase) * height) / 2;
  const prompt = `¿Cuál es el área de un trapecio con bases de ${majorBase} cm y ${minorBase} cm, y altura ${height} cm?`;
  const correct = `${formatNumber(area)} cm^2`;
  const candidates = [
    `${formatNumber((majorBase + minorBase) * height)} cm^2`,
    `${formatNumber((majorBase - minorBase) * height)} cm^2`,
    `${formatNumber((majorBase + minorBase) / 2)} cm^2`,
  ];
  const options = createOptions(correct, candidates, () => `${formatNumber(((majorBase + minorBase + randomInt(2, 3)) * height) / 2)} cm^2`);
  const explanation = `Área = [(B + b)/2] × h = (${majorBase} + ${minorBase})/2 × ${height}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateGeometriaAvanzadoQuestion() {
  const type = randomChoice(["cylinderVolume", "prismVolume", "coneVolume", "sphereArea"]);

  if (type === "cylinderVolume") {
    const radius = randomInt(3, 6);
    const height = randomInt(6, 12);
    const volume = Math.PI * radius * radius * height;
    const prompt = `¿Cuál es el volumen de un cilindro de radio ${radius} cm y altura ${height} cm? (Usa pi ≈ 3.14)`;
    const correct = `${formatNumber(volume)} cm^3`;
    const candidates = [
      `${formatNumber(Math.PI * (radius + 1) ** 2 * height)} cm^3`,
      `${formatNumber(Math.PI * radius * radius * (height - 1))} cm^3`,
      `${formatNumber(2 * Math.PI * radius * height)} cm^3`,
    ];
    const options = createOptions(correct, candidates, () => `${formatNumber(Math.PI * (radius + randomInt(2, 3)) ** 2 * height)} cm^3`);
    const explanation = `Volumen = pir^2h = 3.14 × ${radius}^2 × ${height}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "prismVolume") {
    const baseArea = randomInt(12, 30);
    const height = randomInt(5, 12);
    const volume = baseArea * height;
    const prompt = `¿Cuál es el volumen de un prisma con área de base ${baseArea} cm^2 y altura ${height} cm?`;
    const correct = `${volume} cm^3`;
    const candidates = [`${baseArea + height} cm^3`, `${baseArea * (height - 1)} cm^3`, `${baseArea * (height + 2)} cm^3`];
    const options = createOptions(correct, candidates, () => `${(baseArea + randomInt(3, 6)) * height} cm^3`);
    const explanation = `Multiplica el área de la base por la altura: ${baseArea} × ${height} = ${volume} cm^3.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "coneVolume") {
    const radius = randomInt(3, 6);
    const height = randomInt(6, 12);
    const volume = (Math.PI * radius * radius * height) / 3;
    const prompt = `¿Cuál es el volumen de un cono de radio ${radius} cm y altura ${height} cm? (Usa pi ≈ 3.14)`;
    const correct = `${formatNumber(volume)} cm^3`;
    const candidates = [
      `${formatNumber((Math.PI * radius * radius * height) / 2)} cm^3`,
      `${formatNumber(Math.PI * radius * radius * height)} cm^3`,
      `${formatNumber((Math.PI * (radius + 1) ** 2 * height) / 3)} cm^3`,
    ];
    const options = createOptions(correct, candidates, () => `${formatNumber((Math.PI * radius * radius * (height + randomInt(2, 3))) / 3)} cm^3`);
    const explanation = `Aplica V = (pir^2h)/3: 3.14 × ${radius}^2 × ${height} / 3 = ${formatNumber(volume)} cm^3.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const radius = randomInt(3, 7);
  const area = 4 * Math.PI * radius * radius;
  const prompt = `¿Cuál es el área de la superficie de una esfera de radio ${radius} cm? (Usa pi ≈ 3.14)`;
  const correct = `${formatNumber(area)} cm^2`;
  const candidates = [
    `${formatNumber(3 * Math.PI * radius * radius)} cm^2`,
    `${formatNumber(Math.PI * radius * radius)} cm^2`,
    `${formatNumber(4 * Math.PI * (radius + 1) ** 2)} cm^2`,
  ];
  const options = createOptions(correct, candidates, () => `${formatNumber(4 * Math.PI * radius * radius * (1 + randomInt(1, 2) / 10))} cm^2`);
  const explanation = `Área = 4pir^2 = 4 × 3.14 × ${radius}^2.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}
function generateProbabilidadBasicoQuestion() {
  const red = randomInt(3, 7);
  const blue = randomInt(2, 6);
  const green = randomInt(1, 4);
  const total = red + blue + green;
  const prompt = `En una bolsa hay ${red} fichas rojas, ${blue} azules y ${green} verdes. ¿Cuál es la probabilidad de sacar una ficha roja?`;
  const correct = formatProbability(red, total);
  const candidates = [
    formatProbability(blue, total),
    formatProbability(green, total),
    formatProbability(red + blue, total),
  ];
  const options = createOptions(correct, candidates, () => formatProbability(Math.min(total, red + randomInt(1, 2)), total));
  const explanation = `Casos favorables ${red} / casos totales ${total} = ${correct}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateProbabilidadIntermedioQuestion() {
  const red = randomInt(3, 6);
  const blue = randomInt(3, 6);
  const total = red + blue;
  const prompt = `En una urna hay ${red} bolas rojas y ${blue} azules. Se extraen dos bolas sin reemplazo. ¿Cuál es la probabilidad de obtener primero una roja y luego una azul?`;
  const numerator = red * blue;
  const denominator = total * (total - 1);
  const correct = formatProbability(numerator, denominator);
  const candidates = [
    formatProbability(red * (red - 1), denominator),
    formatProbability(blue * (blue - 1), denominator),
    formatProbability(numerator, denominator + total),
  ];
  const options = createOptions(correct, candidates, () => formatProbability(numerator + randomInt(1, 3), denominator));
  const explanation = `Multiplica probabilidades: (${red}/${total}) × (${blue}/${total - 1}) = ${correct}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateProbabilidadAvanzadoQuestion() {
  const type = randomChoice(["exactHeads", "combinatorialDraw"]);

  if (type === "exactHeads") {
    const trials = randomInt(4, 6);
    const successes = randomInt(1, trials - 1);
    const numerator = combination(trials, successes);
    const denominator = 2 ** trials;
    const prompt = `Se lanza una moneda ${trials} veces. ¿Cuál es la probabilidad de obtener exactamente ${successes} cara(s)?`;
    const correct = formatProbability(numerator, denominator);
    const candidates = [
      formatProbability(combination(trials, successes - 1), denominator),
      formatProbability(combination(trials, successes + 1), denominator),
      formatProbability(numerator + successes, denominator),
    ];
    const options = createOptions(correct, candidates, () => formatProbability(numerator + randomInt(1, 4), denominator));
    const explanation = `Usa la distribución binomial: C(${trials}, ${successes})/2^${trials} = ${correct}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const red = randomInt(4, 6);
  const blue = randomInt(4, 6);
  const draw = 3;
  const successes = 2;
  const numerator = combination(red, successes) * combination(blue, draw - successes);
  const denominator = combination(red + blue, draw);
  const prompt = `En una urna hay ${red} fichas rojas y ${blue} azules. Se extraen ${draw} fichas sin reemplazo. ¿Cuál es la probabilidad de obtener ${successes} rojas?`;
  const correct = formatProbability(numerator, denominator);
  const candidates = [
    formatProbability(combination(red, successes - 1) * combination(blue, draw - successes + 1), denominator),
    formatProbability(combination(red, successes) * combination(blue, draw - successes - 1), denominator),
    formatProbability(numerator + red, denominator),
  ];
  const options = createOptions(correct, candidates, () => formatProbability(numerator + randomInt(1, 4), denominator));
  const explanation = `Calcula con combinaciones: [C(${red}, ${successes}) × C(${blue}, ${draw - successes})] / C(${red + blue}, ${draw}).`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateEcuacionesBasicoQuestion() {
  const a = randomInt(2, 9) * (Math.random() < 0.5 ? -1 : 1);
  const solution = randomInt(-8, 9);
  const b = randomInt(-12, 12);
  const c = a * solution + b;
  const prompt = `Resuelve ${formatLinearExpression(a, b)} = ${c}.`;
  const correct = `x = ${solution}`;
  const candidates = [`x = ${solution + randomInt(2, 4)}`, `x = ${solution - randomInt(1, 3)}`, `x = ${-solution}`];
  const options = createOptions(correct, candidates, (attempt) => `x = ${solution + attempt + 5}`);
  const explanation = b >= 0
    ? `Resta ${b} en ambos lados y divide entre ${a} para obtener x = ${solution}.`
    : `Suma ${Math.abs(b)} en ambos lados y divide entre ${a} para obtener x = ${solution}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateEcuacionesIntermedioQuestion() {
  const a = randomInt(2, 6);
  let c = randomInt(1, 5);
  if (c === a) c += 1;
  const offset = randomInt(-5, 5);
  const solution = randomInt(-6, 8);
  const d = a * (solution + offset) - c * solution;
  const prompt = `Resuelve ${a}(x ${formatSignedNumber(offset)}) = ${c}x ${formatSignedNumber(d)}.`;
  const correct = `x = ${solution}`;
  const candidates = [`x = ${solution + randomInt(2, 4)}`, `x = ${solution - randomInt(1, 3)}`, `x = ${-solution}`];
  const options = createOptions(correct, candidates, (attempt) => `x = ${solution + attempt + 6}`);
  const explanation = `Distribuye ${a}, agrupa términos en x y despeja para encontrar x = ${solution}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateEcuacionesAvanzadoQuestion() {
  const type = randomChoice(["fraction", "noSolution", "infinite"]);

  if (type === "fraction") {
    const denominator = randomInt(3, 6);
    const addNumerator = randomInt(1, 5);
    const targetNumerator = addNumerator + randomInt(2, 6);
    const prompt = `Resuelve x/${denominator} + ${addNumerator}/${denominator} = ${targetNumerator}/${denominator}.`;
    const solution = denominator * (targetNumerator - addNumerator);
    const correct = `x = ${solution}`;
    const candidates = [`x = ${solution + denominator}`, `x = ${solution - denominator}`, `x = ${solution / 2}`];
    const options = createOptions(correct, candidates, (attempt) => `x = ${solution + (attempt + 2) * denominator}`);
    const explanation = `Resta ${addNumerator}/${denominator} y multiplica por ${denominator} para obtener x = ${solution}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  if (type === "noSolution") {
    const multiplier = randomInt(2, 5);
    const offset = randomInt(2, 6);
    const mismatch = randomInt(1, 4);
    const prompt = `Resuelve ${multiplier}(x + ${offset}) = ${multiplier}x + ${multiplier * offset + mismatch}.`;
    const correct = "No tiene solución";
    const candidates = ["Infinitas soluciones", `x = ${offset}`, `x = ${offset + mismatch}`];
    const options = createOptions(correct, candidates, () => `x = ${randomInt(-5, 5)}`);
    const explanation = `Al simplificar obtenemos ${multiplier}x + ${multiplier * offset} = ${multiplier}x + ${multiplier * offset + mismatch}, una contradicción.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const multiplier = randomInt(2, 5);
  const offset = randomInt(2, 6);
  const prompt = `Resuelve ${multiplier}(x - ${offset}) = ${multiplier}x - ${multiplier * offset}.`;
  const correct = "Infinitas soluciones";
  const candidates = ["No tiene solución", `x = ${offset}`, `x = ${-offset}`];
  const options = createOptions(correct, candidates, () => `x = ${randomInt(-4, 4)}`);
  const explanation = `Ambos lados son equivalentes tras distribuir, por lo que cualquier valor satisface la ecuación.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateFraccionesBasicoQuestion() {
  const type = randomChoice(["addition", "simplify"]);

  if (type === "addition") {
    const numerator1 = randomInt(1, 5);
    const denominator1 = randomInt(2, 6);
    const numerator2 = randomInt(1, 4);
    const denominator2 = randomInt(2, 6);
    const numerator = numerator1 * denominator2 + numerator2 * denominator1;
    const denominator = denominator1 * denominator2;
    const prompt = `Suma ${numerator1}/${denominator1} + ${numerator2}/${denominator2}.`;
    const correct = simplifyFraction(numerator, denominator);
    const candidates = [
      simplifyFraction(Math.abs(numerator1 - numerator2), denominator),
      simplifyFraction(numerator1 * denominator2, denominator),
      simplifyFraction(numerator2 * denominator1, denominator),
    ];
    const options = createOptions(correct, candidates, () => simplifyFraction(numerator + randomInt(1, 3), denominator));
    const explanation = `Usa denominador común ${denominator} y suma numeradores: ${numerator}/${denominator} = ${correct}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const factor = randomInt(2, 6);
  const numerator = randomInt(2, 8) * factor;
  const denominator = randomInt(2, 8) * factor;
  const prompt = `Simplifica la fracción ${numerator}/${denominator}.`;
  const correct = simplifyFraction(numerator, denominator);
  const candidates = [
    simplifyFraction(numerator / factor, denominator),
    simplifyFraction(numerator, denominator / factor),
    simplifyFraction(numerator + factor, denominator + factor),
  ];
  const options = createOptions(correct, candidates, () => simplifyFraction(numerator - factor, denominator));
  const explanation = `Divide numerador y denominador entre ${factor} para obtener ${correct}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateFraccionesIntermedioQuestion() {
  const type = randomChoice(["subtraction", "multiplication"]);

  if (type === "subtraction") {
    const denominator = randomInt(4, 9);
    const numerator1 = randomInt(3, denominator - 1);
    const numerator2 = randomInt(1, numerator1 - 1);
    const numerator = numerator1 - numerator2;
    const prompt = `Resta ${numerator1}/${denominator} - ${numerator2}/${denominator}.`;
    const correct = simplifyFraction(numerator, denominator);
    const candidates = [
      simplifyFraction(numerator1 + numerator2, denominator),
      simplifyFraction(numerator2, denominator),
      simplifyFraction(numerator + 1, denominator),
    ];
    const options = createOptions(correct, candidates, () => simplifyFraction(numerator + randomInt(1, 2), denominator));
    const explanation = `Al tener igual denominador resta numeradores: ${numerator1} - ${numerator2} = ${numerator}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const numerator1 = randomInt(1, 6);
  const denominator1 = randomInt(2, 8);
  const numerator2 = randomInt(1, 6);
  const denominator2 = randomInt(2, 8);
  const numerator = numerator1 * numerator2;
  const denominator = denominator1 * denominator2;
  const prompt = `Multiplica ${numerator1}/${denominator1} × ${numerator2}/${denominator2}.`;
  const correct = simplifyFraction(numerator, denominator);
  const candidates = [
    simplifyFraction(numerator1 * denominator2, denominator),
    simplifyFraction(denominator1 * numerator2, denominator),
    simplifyFraction(numerator + denominator1, denominator),
  ];
  const options = createOptions(correct, candidates, () => simplifyFraction(numerator + randomInt(1, 3), denominator));
  const explanation = `Multiplica numeradores y denominadores y simplifica: ${numerator}/${denominator} = ${correct}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateFraccionesAvanzadoQuestion() {
  const type = randomChoice(["division", "equation"]);

  if (type === "division") {
    const numerator1 = randomInt(1, 6);
    const denominator1 = randomInt(2, 8);
    const numerator2 = randomInt(1, 6);
    const denominator2 = randomInt(2, 8);
    const numerator = numerator1 * denominator2;
    const denominator = denominator1 * numerator2;
    const prompt = `Calcula (${numerator1}/${denominator1}) ÷ (${numerator2}/${denominator2}).`;
    const correct = simplifyFraction(numerator, denominator);
    const candidates = [
      simplifyFraction(numerator1 * numerator2, denominator1 * denominator2),
      simplifyFraction(denominator1 * denominator2, numerator1 * numerator2),
      simplifyFraction(numerator + denominator1, denominator),
    ];
    const options = createOptions(correct, candidates, () => simplifyFraction(numerator + randomInt(1, 3), denominator));
    const explanation = `Multiplica por el inverso: ${numerator1}/${denominator1} × ${denominator2}/${numerator2} = ${correct}.`;
    return { prompt, options, answerIndex: options.indexOf(correct), explanation };
  }

  const denominator = randomInt(3, 6);
  const addNumerator = randomInt(1, 5);
  const targetNumerator = addNumerator + randomInt(2, 6);
  const prompt = `Resuelve x/${denominator} + ${addNumerator}/${denominator} = ${targetNumerator}/${denominator}.`;
  const solution = denominator * (targetNumerator - addNumerator);
  const correct = `x = ${solution}`;
  const candidates = [`x = ${solution + denominator}`, `x = ${solution - denominator}`, `x = ${solution / 2}`];
  const options = createOptions(correct, candidates, (attempt) => `x = ${solution + (attempt + 2) * denominator}`);
  const explanation = `Resta ${addNumerator}/${denominator} del lado derecho y multiplica toda la ecuación por ${denominator}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateSistemasBasicoQuestion() {
  const x = randomInt(-5, 8);
  const y = randomInt(-5, 8);
  const sum = x + y;
  const diff = x - y;
  const prompt = `Resuelve el sistema:\nx + y = ${sum}\nx - y = ${diff}`;
  const correct = formatSystemSolution(x, y);
  const candidates = [
    formatSystemSolution(x + 1, y - 1),
    formatSystemSolution(y, x),
    formatSystemSolution(x - 2, y + 2),
  ];
  const options = createOptions(correct, candidates, () => formatSystemSolution(x + randomInt(2, 3), y - randomInt(1, 2)));
  const explanation = `Suma y resta las ecuaciones para obtener 2x = ${sum + diff} y 2y = ${sum - diff}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateSistemasIntermedioQuestion() {
  const x = randomInt(-5, 7);
  const y = randomInt(-5, 7);
  const a1 = 2;
  const b1 = 1;
  const a2 = 1;
  const b2 = -1;
  const c1 = a1 * x + b1 * y;
  const c2 = a2 * x + b2 * y;
  const prompt = `Resuelve el sistema:\n${formatLinearEquation(a1, b1, c1)}\n${formatLinearEquation(a2, b2, c2)}`;
  const correct = formatSystemSolution(x, y);
  const candidates = [
    formatSystemSolution(x + 1, y),
    formatSystemSolution(x, y + 1),
    formatSystemSolution(-x, -y),
  ];
  const options = createOptions(correct, candidates, () => formatSystemSolution(x + randomInt(2, 3), y - randomInt(1, 2)));
  const explanation = `Mediante sustitución o eliminación se obtiene x = ${x} e y = ${y}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}

function generateSistemasAvanzadoQuestion() {
  let a1;
  let b1;
  let a2;
  let b2;
  let attempts = 0;
  do {
    a1 = randomInt(1, 6) * (Math.random() < 0.5 ? -1 : 1);
    b1 = randomInt(1, 6) * (Math.random() < 0.5 ? -1 : 1);
    a2 = randomInt(1, 6) * (Math.random() < 0.5 ? -1 : 1);
    b2 = randomInt(1, 6) * (Math.random() < 0.5 ? -1 : 1);
    attempts += 1;
  } while (a1 * b2 === a2 * b1 && attempts < 20);

  const xValue = randomInt(-5, 5) + (Math.random() < 0.5 ? 0.5 : 0);
  const yValue = randomInt(-5, 5) + (Math.random() < 0.5 ? 0.5 : 0);
  const c1 = a1 * xValue + b1 * yValue;
  const c2 = a2 * xValue + b2 * yValue;
  const prompt = `Resuelve el sistema:\n${formatLinearEquation(a1, b1, c1)}\n${formatLinearEquation(a2, b2, c2)}`;
  const correct = formatSystemSolution(formatNumber(xValue), formatNumber(yValue));
  const candidates = [
    formatSystemSolution(formatNumber(xValue + 1), formatNumber(yValue - 1)),
    formatSystemSolution(formatNumber(-xValue), formatNumber(-yValue)),
    formatSystemSolution(formatNumber(xValue + 0.5), formatNumber(yValue + 0.5)),
  ];
  const options = createOptions(correct, candidates, () => formatSystemSolution(formatNumber(xValue + randomInt(2, 3) / 2), formatNumber(yValue - randomInt(1, 2) / 2)));
  const explanation = `El determinante es distinto de cero, por lo que el sistema tiene solución única x = ${formatNumber(xValue)}, y = ${formatNumber(yValue)}.`;
  return { prompt, options, answerIndex: options.indexOf(correct), explanation };
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array) {
  return array[randomInt(0, array.length - 1)];
}

function formatSignedNumber(value) {
  return value >= 0 ? `+ ${value}` : `- ${Math.abs(value)}`;
}

function formatOriginalLinearExpression(a, b, constant) {
  let expression = `${a}x + ${b}x`;
  if (constant > 0) {
    expression += ` + ${constant}`;
  } else if (constant < 0) {
    expression += ` - ${Math.abs(constant)}`;
  }
  return expression;
}

function createOptions(correct, candidates, fallbackGenerator) {
  const fallback = fallbackGenerator || ((attempt) => `${correct} + ${attempt + 1}`);
  const options = [correct];
  candidates.forEach((candidate) => {
    if (candidate && !options.includes(candidate)) {
      options.push(candidate);
    }
  });
  let attempts = 0;
  while (options.length < 4 && attempts < 12) {
    const candidate = fallback(attempts, options);
    if (candidate && !options.includes(candidate)) {
      options.push(candidate);
    }
    attempts += 1;
  }
  while (options.length < 4) {
    const filler = `${correct} (${attempts + 1})`;
    if (!options.includes(filler)) {
      options.push(filler);
    } else {
      break;
    }
    attempts += 1;
  }
  return shuffleArray(options.slice(0, 4));
}

function shuffleArray(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function formatLinearExpression(coefficient, constant = 0) {
  let term;
  if (coefficient === 0) {
    term = "0";
  } else if (coefficient === 1) {
    term = "x";
  } else if (coefficient === -1) {
    term = "-x";
  } else {
    term = `${coefficient}x`;
  }
  if (constant === 0) {
    return term;
  }
  const sign = constant > 0 ? " + " : " - ";
  return `${term}${sign}${Math.abs(constant)}`;
}

function formatQuadraticExpression(a, b, c) {
  const terms = [];
  if (a !== 0) {
    const coefficient = a === 1 ? "" : a === -1 ? "-" : `${a}`;
    terms.push(`${coefficient}x^2`);
  }
  if (b !== 0) {
    const sign = b > 0 ? (terms.length ? " + " : "") : terms.length ? " - " : "-";
    const magnitude = Math.abs(b) === 1 ? "x" : `${Math.abs(b)}x`;
    terms.push(`${sign}${magnitude}`);
  }
  if (c !== 0 || terms.length === 0) {
    const sign = c > 0 ? (terms.length ? " + " : "") : terms.length ? " - " : "-";
    terms.push(`${sign}${Math.abs(c)}`);
  }
  return terms.join("");
}

function formatQuadraticFromSumProduct(sum, product) {
  const terms = ["x^2"];
  if (sum !== 0) {
    const sign = sum > 0 ? " + " : " - ";
    const magnitude = Math.abs(sum) === 1 ? "x" : `${Math.abs(sum)}x`;
    terms.push(`${sign}${magnitude}`);
  }
  if (product !== 0) {
    const sign = product > 0 ? " + " : " - ";
    terms.push(`${sign}${Math.abs(product)}`);
  }
  if (sum === 0 && product === 0) {
    terms.push(" + 0");
  }
  return terms.join("");
}

function formatBinomialTerm(value) {
  if (value === 0) return "x";
  return value > 0 ? `x + ${value}` : `x - ${Math.abs(value)}`;
}

function simplifyFraction(numerator, denominator) {
  const divisor = gcd(numerator, denominator);
  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = denominator / divisor;
  if (simplifiedDenominator === 1) {
    return `${simplifiedNumerator}`;
  }
  return `${simplifiedNumerator}/${simplifiedDenominator}`;
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function formatProbability(numerator, denominator) {
  if (numerator === 0) {
    return "0";
  }
  if (numerator === denominator) {
    return "1";
  }
  return simplifyFraction(numerator, denominator);
}

function formatNumber(value) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(2).replace(/\.00$/, "");
}

function formatLinearEquation(a, b, c) {
  const first = `${a}x`;
  const second = b >= 0 ? ` + ${b === 1 ? "" : b}y` : ` - ${Math.abs(b) === 1 ? "" : Math.abs(b)}y`;
  const cleaned = second.replace("+  y", "+ y").replace("-  y", "- y");
  return `${first}${cleaned} = ${formatNumber(c)}`;
}

function formatSystemSolution(x, y) {
  return `x = ${x}, y = ${y}`;
}

function combination(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - (k - i))) / i;
  }
  return Math.round(result);
}


