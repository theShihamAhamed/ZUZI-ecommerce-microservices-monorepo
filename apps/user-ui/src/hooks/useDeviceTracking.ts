"use client";

import { useEffect, useState } from "react";
import { UAParser } from "ua-parser-js";

const UNKNOWN_DEVICE = "Unknown device";

interface DeviceState {
  browser: string;
  os: string;
  deviceType: string;
  vendor: string;
  model: string;
  label: string;
}

const unknownDeviceState: DeviceState = {
  browser: "",
  os: "",
  deviceType: "",
  vendor: "",
  model: "",
  label: UNKNOWN_DEVICE,
};

export const useDeviceTracking = () => {
  const [deviceInfo, setDeviceInfo] =
    useState<DeviceState>(unknownDeviceState);

  useEffect(() => {
    try {
      const parser = new UAParser(window.navigator.userAgent);
      const result = parser.getResult();

      const browser = result.browser.name || "";
      const os = result.os.name || "";
      const deviceType = result.device.type || "desktop";
      const vendor = result.device.vendor || "";
      const model = result.device.model || "";
      const labelParts = [browser, os, deviceType].filter(Boolean);

      setDeviceInfo({
        browser,
        os,
        deviceType,
        vendor,
        model,
        label: labelParts.length > 0 ? labelParts.join(" / ") : UNKNOWN_DEVICE,
      });
    } catch {
      setDeviceInfo(unknownDeviceState);
    }
  }, []);

  return deviceInfo;
};
