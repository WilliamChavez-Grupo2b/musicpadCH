import { AuthService } from "../services/AuthService.js";

const auth = new AuthService();

const initializeHomePage = () => {
    const session = auth.getSession();
    const greeting = document.querySelector<HTMLParagraphElement>("#greeting");
    const primaryAction = document.querySelector<HTMLAnchorElement>("#primary-action");
    const logoutButton = document.querySelector<HTMLButtonElement>("#logout-button");

    if (!primaryAction || !logoutButton) {
        return;
    }

    if (session) {
        if (greeting) {
            greeting.textContent = `Welcome back, ${session.email}!`;
        }
        primaryAction.textContent = "Go to dashboard";
        primaryAction.href = "dashboard.html";
        logoutButton.hidden = false;
    } else {
        if (greeting) {
            greeting.textContent = "Welcome to MusicPad.";
        }
        primaryAction.textContent = "Log in to start";
        primaryAction.href = "login.html";
        logoutButton.hidden = true;
    }

    logoutButton.addEventListener("click", () => {
        auth.logout();
        window.location.reload();
    });
};

initializeHomePage();
