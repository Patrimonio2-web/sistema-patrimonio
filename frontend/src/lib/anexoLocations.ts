export type AnexoLocation = {
  address: string;
  mapTitle: string;
  embedUrl: string;
  externalUrl: string;
};

const ANEXO_ADDRESSES: Record<number, string> = {
  100: "Dalmacio V\u00e9lez 874",
  200: "Copiap\u00f3 110",
  300: "Copiap\u00f3 266",
  400: "Santa Fe 891",
  500: "Rivadavia 938",
  600: "Urquiza 453",
  800: "Santa Fe 877",
  900: "Dalmacio V\u00e9lez 765",
  1000: "Perito Moreno 899",
  1100: "Hip\u00f3lito Yrigoyen 327",
  1101: "Lamadrid y Baz\u00e1n y Bustos",
  1200: "Dalmacio V\u00e9lez 874",
};

export function getAnexoLocation(anexoId: number): AnexoLocation | null {
  const address = ANEXO_ADDRESSES[anexoId];
  if (!address) return null;

  const query = `${address}, La Rioja, Argentina`;
  const encodedQuery = encodeURIComponent(query);

  return {
    address,
    mapTitle: `Mapa de ${address}`,
    embedUrl: `https://www.google.com/maps?q=${encodedQuery}&output=embed`,
    externalUrl: `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`,
  };
}
