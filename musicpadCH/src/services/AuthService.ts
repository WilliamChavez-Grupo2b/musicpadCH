/**
 * AuthService
 * --------------------------------------------------------------------------
 * Credentials are verified by the local API. The browser session is stored in
 * localStorage to preserve the existing page navigation flow.
 */

const STORAGE_KEY = "musicpad_session";

export interface Session {
    email: string;
}

export class AuthService {
    async login(email: string, password: string): Promise<Session> {
        const normalizedEmail = email.trim().toLowerCase();
        if (!this.isValidEmail(normalizedEmail) || !password) {
            throw new Error("A valid email and password are required.");
        }

        const session = await this.requestSession("/api/auth/login", normalizedEmail, password);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return session;
    }

    async register(email: string, password: string): Promise<Session> {
        const normalizedEmail = email.trim().toLowerCase();
        if (!this.isValidEmail(normalizedEmail)) {
            throw new Error("Enter a valid email address.");
        }
        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters.");
        }

        const session = await this.requestSession(
            "/api/auth/register",
            normalizedEmail,
            password,
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return session;
    }

    private async requestSession(
        endpoint: string,
        email: string,
        password: string,
    ): Promise<Session> {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const result = (await response.json()) as { email?: string; error?: string };

        if (!response.ok || !result.email) {
            throw new Error(result.error ?? "Unable to log in.");
        }

        return { email: result.email };
    }

    private isValidEmail(email: string): boolean {
        return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    getSession(): Session | null {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const stored = JSON.parse(raw) as { email?: string; username?: string };
        const email = stored.email ?? stored.username;
        return email ? { email } : null;
    }

    logout(): void {
        localStorage.removeItem(STORAGE_KEY);
    }

    /** Redirects to login.html if there is no active session. */
    requireSession(): Session | null {
        const session = this.getSession();
        if (!session) {
            window.location.href = "login.html";
            return null;
        }
        return session;
    }
}
