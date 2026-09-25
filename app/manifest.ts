import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Michiverso · Simulación de razas de gato",
    short_name: "Michiverso",
    description: "Las 98 razas de catfact.ninja como un campo de orbes, con la ficha, la foto y un dato curioso de cada una.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5fa",
    theme_color: "#f4f5fa",
    lang: "es",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
