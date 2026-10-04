import { AuthService } from "../services/AuthService.js";
const auth = new AuthService();
const session = auth.getSession();
const greeting = document.querySelector("#greeting");
const primaryAction = document.querySelector("#primary-action");
const logoutButton = document.querySelector("#logout-button");
if (session) {
    greeting.textContent = `Welcome back, ${session.email}!`;
    primaryAction.textContent = "Go to dashboard";
    primaryAction.href = "dashboard.html";
    logoutButton.hidden = false;
}
else {
    greeting.textContent = "Welcome to MusicPad.";
    primaryAction.textContent = "Log in to start";
    primaryAction.href = "login.html";
    logoutButton.hidden = true;
}
logoutButton.addEventListener("click", () => {
    auth.logout();
    window.location.reload();
});
//# sourceMappingURL=homeController.js.map