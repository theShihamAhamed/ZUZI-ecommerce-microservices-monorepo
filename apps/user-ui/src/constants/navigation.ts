// Navigation constants for the Zuzi e-commerce header

export interface SubCategory {
  name: string;
  href: string;
}

export interface Category {
  name: string;
  href: string;
  subcategories: SubCategory[];
}

export const CATEGORIES: Category[] = [
  {
    name: "Electronics",
    href: "#",
    subcategories: [
      { name: "Smartphones", href: "#" },
      { name: "Laptops", href: "#" },
      { name: "Audio", href: "#" },
      { name: "Cameras", href: "#" },
    ],
  },
  {
    name: "Fashion",
    href: "#",
    subcategories: [
      { name: "Men", href: "#" },
      { name: "Women", href: "#" },
      { name: "Kids", href: "#" },
      { name: "Accessories", href: "#" },
    ],
  },
  {
    name: "Home & Living",
    href: "#",
    subcategories: [
      { name: "Furniture", href: "#" },
      { name: "Decor", href: "#" },
      { name: "Kitchen", href: "#" },
      { name: "Lighting", href: "#" },
    ],
  },
  {
    name: "Beauty",
    href: "#",
    subcategories: [
      { name: "Skincare", href: "#" },
      { name: "Makeup", href: "#" },
      { name: "Fragrance", href: "#" },
    ],
  },
];

export interface NavLink {
  name: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/" },
  { name: "Products", href: "/products" },
  { name: "Shops", href: "/shops" },
  { name: "Offers", href: "/offers" },
  { name: "Become a Seller", href: "/" },
];
