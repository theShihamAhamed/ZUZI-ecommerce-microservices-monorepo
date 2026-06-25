import { z } from "zod";
import { COUNTRY_NAMES } from "@/constants/countries";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" }),
});

export const shippingAddressSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters" }),
  phone: z.string().trim().min(1, { message: "Phone is required" }),
  addressLine1: z
    .string()
    .trim()
    .min(1, { message: "Address line 1 is required" }),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, { message: "City is required" }),
  state: z.string().trim().optional(),
  postalCode: z
    .string()
    .trim()
    .min(1, { message: "Postal code is required" }),
  country: z
    .string()
    .trim()
    .min(1, { message: "Country is required" })
    .refine((country) => COUNTRY_NAMES.includes(country), {
      message: "Select a country from the list",
    }),
  isDefault: z.boolean().optional(),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type ShippingAddressFormData = z.infer<typeof shippingAddressSchema>;
