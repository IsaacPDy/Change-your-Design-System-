export type System = "shadcn" | "material" | "ant" | "carbon";
export type SurfaceStyle = "system" | "minimal" | "glass" | "soft";
export interface Settings {
  system: System;
  style: SurfaceStyle;
  accent: string;
  dark: boolean;
  radius: number;
}
export interface PageData {
  title: string;
  body: string;
  css: string;
  source: string;
  htmlAttributes?: Record<string, string>;
  bodyAttributes?: Record<string, string>;
  inventory: Record<
    "buttons" | "cards" | "navigation" | "inputs" | "images" | "headings",
    number
  >;
  warnings: string[];
}
export interface RepositoryData {
  html: string;
  css: string;
  source: string;
  framework: string;
  private: boolean;
  branch: string;
  warnings: string[];
}
