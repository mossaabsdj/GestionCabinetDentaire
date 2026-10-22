/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracing: false,
  async rewrites() {
    return [
      { source: "/medicament", destination: "/Medicament" },
      { source: "/medicaments", destination: "/Medicament" },
      { source: "/vaccin", destination: "/Vaccinations" },
      { source: "/vaccins", destination: "/Vaccinations" },
      { source: "/vaccination", destination: "/Vaccinations" },
      { source: "/vaccinations", destination: "/Vaccinations" },
      { source: "/bilan", destination: "/Bilans" },
      { source: "/bilans", destination: "/Bilans" },
      { source: "/patient", destination: "/Patients" },
      { source: "/patients", destination: "/Patients" },
      { source: "/consulter", destination: "/Consulter" },
      { source: "/accueil", destination: "/Accueill" },
      { source: "/accueill", destination: "/Accueill" },
      { source: "/apropos", destination: "/Apropos" },
      { source: "/params", destination: "/Params" },
      { source: "/parametre", destination: "/Params" },
      { source: "/parametres", destination: "/Params" },
      { source: "/predifined", destination: "/Predifined" },
    ];
  },
};

export default nextConfig;
