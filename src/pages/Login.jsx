import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../schemas/authSchemas.js";
import { userAuthDataStore } from "../store/userAuthDataStore.js";
import "../index.css";
import api from "../api";

function Login() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const setUser = userAuthDataStore(state => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(formData) {
    setServerError("");
    try {
      const response = await api.post("/user/login", formData);
      const { name, age, email, usage } = response;
      setUser({ name, age, email, usage });
      navigate("/", { replace: true });
    } catch (err) {
      setServerError(
        err.response?.data?.message || "Could not login, please try again",
      );
    }
  }
  return (
    <main className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="mb-6 text-3xl font-bold">Log in</h1>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded border p-2"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded border p-2"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-red-600">{errors.password.message}</p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-red-600">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-4">
        New user?{" "}
        <Link to="/signup" className="text-blue-600">
          Sign up
        </Link>
      </p>
    </main>
  );
}

export default Login;
