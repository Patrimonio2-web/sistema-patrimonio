export const PASSWORD_REQUIREMENTS = [
  "8 caracteres como minimo",
  "Una letra",
  "Un numero",
  "Un caracter especial",
] as const;

export function passwordPolicyError(password: string) {
  if (password.length < 8) return "La contrasena debe tener al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(password)) return "La contrasena debe incluir al menos una letra.";
  if (!/\d/.test(password)) return "La contrasena debe incluir al menos un numero.";
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "La contrasena debe incluir al menos un caracter especial.";
  }
  return null;
}
