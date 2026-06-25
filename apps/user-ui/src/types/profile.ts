export interface ProfileImage {
  url: string;
  fileId: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  avatar?: ProfileImage | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddress {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileResponse {
  success: boolean;
  user: CustomerProfile;
}

export interface ShippingAddressesResponse {
  success: boolean;
  addresses: ShippingAddress[];
}

export interface ShippingAddressResponse {
  success: boolean;
  address: ShippingAddress;
}

export interface UpdateProfileInput {
  name: string;
  avatar?: ProfileImage | null;
}

export interface ProfileImageUploadResponse {
  success: boolean;
  url: string;
  fileId: string;
}

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}
