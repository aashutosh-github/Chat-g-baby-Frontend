import * as z from "zod";

export const emailSchema = z.preprocess(
  value => (typeof value === "string" ? value.trim().toLowerCase() : ""),
  z.email("Email must be valid"),
);

export const passwordSchema = z
  .string()
  .min(8, "Password must have minimum length of 8 characters")
  .max(30, "Password must have maximum length of 30 characters")
  .regex(/[A-Z]/, "Password must have at least one uppercase character")
  .regex(/[a-z]/, "Password must have at least one lowercase character")
  .regex(/[0-9]/, "Password must have at least one digit")
  .regex(
    /[~?@.,<>,{}:'!^#()&-+]/,
    "Password must have at least one special character",
  );

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long")
    .max(30, "Name must be maximum 30 characters long"),

  age: z.preprocess(value => {
    if (value === undefined || value === "" || value === null) {
      return undefined;
    }
    return Number(value);
  }, z.number().min(10, "Minimum age required is 10 years").max(100, "Max age allowed is 100 years").optional()),

  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
