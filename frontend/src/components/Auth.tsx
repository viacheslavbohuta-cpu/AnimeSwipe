
import { useState } from "react";
import "./Auth.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface AuthProps {
  onLogin: (token: string) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        const registerResponse = await fetch(
          `${API_URL}/api/auth/register`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, password }),
          }
        );

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) {
          throw new Error(registerData.detail || "Registration failed");
        }

        setIsRegister(false);
        setPassword("");
        setSuccess("Account created! You can now log in.");
        return;
      }

      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.detail || "Login failed");
      }

      if (!loginData.access_token) {
        throw new Error("Server did not return an access token.");
      }

      localStorage.setItem("access_token", loginData.access_token);
      onLogin(loginData.access_token);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>
          Anime<span>Swipe</span>
        </h1>

        <p>{isRegister ? "Create your account" : "Welcome back"}</p>

        {isRegister && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <button type="submit" disabled={loading}>
          {loading
            ? "Please wait..."
            : isRegister
              ? "Create account"
              : "Log in"}
        </button>

        <div className="auth-switch">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}{" "}

          <span
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setSuccess("");
            }}
          >
            {isRegister ? "Log in" : "Sign up"}
          </span>
        </div>
      </form>
    </div>
  );
}
