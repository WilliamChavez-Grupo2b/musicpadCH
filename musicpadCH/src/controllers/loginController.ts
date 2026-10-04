import { AuthService } from "../services/AuthService.js";

const auth = new AuthService();

// If the user is already logged in, skip the login screen.
if (auth.getSession()) {
    window.location.href = "dashboard.html";
}

const form = document.querySelector<HTMLFormElement>("#login-form")!;
const emailInput = document.querySelector<HTMLInputElement>("#email")!;
const passwordInput = document.querySelector<HTMLInputElement>("#password")!;
const errorMessage = document.querySelector<HTMLParagraphElement>("#error-message")!;
const registerForm = document.querySelector<HTMLFormElement>("#register-form")!;
const registerEmailInput = document.querySelector<HTMLInputElement>("#register-email")!;
const registerPasswordInput = document.querySelector<HTMLInputElement>("#register-password")!;
const confirmPasswordInput = document.querySelector<HTMLInputElement>("#confirm-password")!;
const authTitle = document.querySelector<HTMLHeadingElement>("#auth-title")!;
const authToggleLabel = document.querySelector<HTMLSpanElement>("#auth-toggle-label")!;
const authToggleButton = document.querySelector<HTMLButtonElement>("#auth-toggle-button")!;

form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitAuth(() => auth.login(emailInput.value, passwordInput.value));
});

registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (registerPasswordInput.value !== confirmPasswordInput.value) {
        showError("Passwords do not match.");
        return;
    }
    void submitAuth(() => auth.register(registerEmailInput.value, registerPasswordInput.value));
});

authToggleButton.addEventListener("click", () => {
    // Whichever form is visible right now is the one we are switching away from.
    const switchingToRegister = !form.hidden;

    form.hidden = switchingToRegister;
    registerForm.hidden = !switchingToRegister;

    authTitle.textContent = switchingToRegister ? "Register" : "Log In";
    authToggleLabel.textContent = switchingToRegister
        ? "Already have an account?"
        : "Don't have an account?";
    authToggleButton.textContent = switchingToRegister ? "Log in" : "Register";
    errorMessage.hidden = true;
});

async function submitAuth(action: () => Promise<unknown>): Promise<void> {
    errorMessage.hidden = true;
    try {
        await action();
        window.location.href = "dashboard.html";
    } catch (error) {
        showError(error instanceof Error ? error.message : "Unable to complete the request.");
    }
}

function showError(message: string): void {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}
