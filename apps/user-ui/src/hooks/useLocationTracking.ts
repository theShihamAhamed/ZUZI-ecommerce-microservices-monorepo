"use client";

import { useEffect, useState } from "react";

const LOCATION_STORAGE_KEY = "user_location";
const LOCATION_EXPIRY_DAYS = 20;
const LOCATION_EXPIRY_MS = LOCATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const UNKNOWN_LOCATION = "Unknown location";

interface StoredLocation {
  country: string;
  city: string;
  timestamp: number;
}

interface LocationState extends StoredLocation {
  label: string;
  isLoading: boolean;
}

const getLocationLabel = (city: string, country: string) => {
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return UNKNOWN_LOCATION;
};

const unknownLocationState: LocationState = {
  country: "",
  city: "",
  timestamp: 0,
  label: UNKNOWN_LOCATION,
  isLoading: false,
};

export const useLocationTracking = () => {
  const [location, setLocation] =
    useState<LocationState>(unknownLocationState);

  useEffect(() => {
    let isMounted = true;

    const updateLocation = async () => {
      setLocation((current) => ({ ...current, isLoading: true }));

      try {
        const storedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);

        if (storedLocation) {
          const parsed = JSON.parse(storedLocation) as StoredLocation;
          const isFresh = Date.now() - parsed.timestamp < LOCATION_EXPIRY_MS;

          if (isFresh) {
            if (!isMounted) return;

            setLocation({
              ...parsed,
              label: getLocationLabel(parsed.city, parsed.country),
              isLoading: false,
            });
            return;
          }
        }

        const response = await fetch("https://ipapi.co/json/");

        if (!response.ok) {
          throw new Error("Unable to detect location");
        }

        const data = await response.json();
        const nextLocation: StoredLocation = {
          country: data.country_name || data.country || "",
          city: data.city || "",
          timestamp: Date.now(),
        };

        localStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(nextLocation),
        );

        if (!isMounted) return;

        setLocation({
          ...nextLocation,
          label: getLocationLabel(nextLocation.city, nextLocation.country),
          isLoading: false,
        });
      } catch {
        if (!isMounted) return;
        setLocation(unknownLocationState);
      }
    };

    updateLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return location;
};
