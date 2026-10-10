import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "../schemas/authSchemas.js";
import { userAuthDataStore } from "../store/userAuthDataStore.js";
import api from "../api.js";
import "../index.css";

export default function Signup() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const setUser = userAuthDataStore(state => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      age: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(formData) {
    try {
      const response = await api.post("/user/signup", formData);
      const { name, age, email, usage } = response;
      setUser({ name, age, email, usage });
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(
        error.response?.data?.message || "signup failed, please try again",
      );
    }
  }

  return (
    <main className="mx-auto mt-16 max-w-sm px-4 ">
      <h1 className="mb-6 text-3xl font-bold">Sign up</h1>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="w-full rounded border p-2"
            {...register("name")}
          />
          {errors.name && <p className="text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="age">Age (optional)</label>
          <input
            id="age"
            type="number"
            className="w-full rounded border p-2"
            {...register("age")}
          />
          {errors.age && <p className="text-red-600">{errors.age.message}</p>}
        </div>

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
            autoComplete="new-password"
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
          {isSubmitting ? "Signing up..." : "Sign up"}
        </button>
      </form>

      <p className="mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600">
          Log in
        </Link>
      </p>
    </main>
  );
}
