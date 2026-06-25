"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Camera,
  Loader2,
  Mail,
  UserRound,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import {
  UpdateProfileFormData,
  updateProfileSchema,
} from "@/constants/profile.schema";
import { useUpdateProfile, useUploadProfileAvatar } from "@/hooks/useProfile";
import { CustomerProfile, ProfileImage } from "@/types/profile";

interface ProfileOverviewProps {
  profile: CustomerProfile;
}

const formatJoinedDate = (date: string) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
};

const getErrorMessage = (error: unknown) => {
  return (
    (error as any)?.response?.data?.message ||
    "Unable to update your profile right now."
  );
};

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const getAvatarUrl = (avatar?: ProfileImage | null, avatarUrl?: string | null) =>
  avatar?.url || avatarUrl || "";

export function ProfileOverview({ profile }: ProfileOverviewProps) {
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadProfileAvatar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [avatar, setAvatar] = useState<ProfileImage | null>(
    profile.avatar || null,
  );
  const [isAvatarDirty, setIsAvatarDirty] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarUrl = getAvatarUrl(avatar, profile.avatarUrl);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: profile.name,
    },
  });

  useEffect(() => {
    reset({ name: profile.name });
    setAvatar(profile.avatar || null);
    setIsAvatarDirty(false);
    setAvatarError("");
  }, [profile.avatar, profile.name, reset]);

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setSuccessMessage("");
    setAvatarError("");

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Please upload a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setAvatarError("Image is too large. Please upload an image under 5MB.");
      return;
    }

    uploadAvatar.mutate(file, {
      onSuccess: (response) => {
        setAvatar({
          url: response.url,
          fileId: response.fileId,
        });
        setIsAvatarDirty(true);
      },
      onError: (error) => {
        setAvatarError(getErrorMessage(error));
      },
    });
  };

  const handleRemoveAvatar = () => {
    setSuccessMessage("");
    setAvatarError("");
    setAvatar(null);
    setIsAvatarDirty(true);
  };

  const onSubmit = (data: UpdateProfileFormData) => {
    setSuccessMessage("");

    updateProfile.mutate(
      {
        ...data,
        ...(isAvatarDirty ? { avatar } : {}),
      },
      {
        onSuccess: (updatedProfile) => {
          reset({ name: updatedProfile.name });
          setAvatar(updatedProfile.avatar || null);
          setIsAvatarDirty(false);
          setSuccessMessage("Profile updated successfully.");
        },
      },
    );
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative h-20 w-20 shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-xl font-bold text-white">
                {getInitials(profile.name)}
              </div>
            )}
            {uploadAvatar.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              Customer profile
            </p>
            <h2 className="mt-1 truncate text-2xl font-extrabold text-gray-900">
              {profile.name}
            </h2>
            <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              <span className="flex min-w-0 items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-stone-400" />
                <span className="truncate">{profile.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-stone-400" />
                Joined {formatJoinedDate(profile.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending || updateProfile.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {avatarUrl ? "Change avatar" : "Upload avatar"}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={uploadAvatar.isPending || updateProfile.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Remove
              </button>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarSelect}
              className="hidden"
            />
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          JPG, PNG, or WEBP up to 5MB.
        </p>
        {avatarError ? (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {avatarError}
          </p>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Account details
            </h3>
            <p className="text-sm text-gray-500">
              Keep your display name up to date.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-semibold text-gray-700"
            >
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              className={`mt-2 block w-full rounded-xl border px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                errors.name ? "border-red-300" : "border-stone-200"
              }`}
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-semibold text-gray-700"
            >
              Email address
            </label>
            <input
              id="profile-email"
              type="email"
              value={profile.email}
              readOnly
              className="mt-2 block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-gray-500 outline-none"
            />
          </div>
        </div>

        {successMessage ? (
          <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {successMessage}
          </p>
        ) : null}

        {updateProfile.isError ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {getErrorMessage(updateProfile.error)}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={
              updateProfile.isPending ||
              uploadAvatar.isPending ||
              (!isDirty && !isAvatarDirty)
            }
            className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
