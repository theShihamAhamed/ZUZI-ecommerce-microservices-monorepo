"use client";
import React, { useEffect, useState, useRef } from "react";
import { Grid, ChevronDown, ChevronRight } from "lucide-react";
import { CATEGORIES, NAV_LINKS } from "@/constants/navigation";
import Link from "next/link";

export function BottomHeader() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);
  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen]);
  return (
    <div className="hidden md:block sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-12">
          {/* Departments Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center h-12 space-x-2 px-4 bg-stone-100 hover:bg-amber-50 text-gray-900 font-semibold text-sm transition-colors border-r border-stone-200 min-w-[200px]"
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              <Grid className="h-5 w-5" />
              <span>ALL DEPARTMENTS</span>
              <ChevronDown
                className={`h-4 w-4 ml-auto transition-transform duration-200 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 w-64 bg-white shadow-xl shadow-stone-200/60 border border-stone-200 rounded-b-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <ul className="py-2">
                  {CATEGORIES.map((category) => (
                    <li key={category.name} className="group/item relative">
                      <a
                        href={category.href}
                        className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-amber-50 hover:text-gray-900 transition-colors"
                      >
                        <span>{category.name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </a>

                      {/* Subcategories (Flyout) */}
                      <div className="absolute top-0 left-full w-56 bg-white shadow-xl shadow-stone-200/60 border border-stone-200 rounded-lg opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all duration-200 transform origin-top-left ml-1">
                        <ul className="py-2">
                          {category.subcategories.map((sub) => (
                            <li key={sub.name}>
                              <a
                                href={sub.href}
                                className="block px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-amber-50 transition-colors"
                              >
                                {sub.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-8 ml-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-amber-700 transition-colors relative group"
              >
                {link.name}
                <span className="absolute bottom-[-4px] left-0 w-0 h-0.5 bg-amber-500 transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
