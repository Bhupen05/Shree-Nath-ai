import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [identifier, setIdentifier] = useState("EMP-0001");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await api.login(identifier, password);
      setSession(response.accessToken, response.employee);
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in. Check the backend and seeded admin account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-panel">
        <p className="eyebrow">Foundation phase scaffold</p>
        <h1>Sign in to the control room</h1>
        <p className="login-copy">
          This starter ships with the seeded admin credentials from the backend seed script so
          we can get into the dashboard immediately.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Employee code or email</span>
            <input
              className="input"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="helper-text error">{error}</p> : null}

          <button className="button" disabled={submitting} type="submit">
            {submitting ? "Signing in..." : "Enter SIBMS"}
          </button>
        </form>
      </div>
    </div>
  );
}
