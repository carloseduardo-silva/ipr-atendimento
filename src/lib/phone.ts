/**
 * Formata dígitos de telefone brasileiro progressivamente enquanto a
 * atendente digita: (DD) NNNN-NNNN (fixo, 10 dígitos) ou
 * (DD) NNNNN-NNNN (celular, 11 dígitos). Não valida — apenas formata.
 */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const splitIndex = digits.length > 10 ? 5 : 4;
  const prefix = rest.slice(0, splitIndex);
  const suffix = rest.slice(splitIndex);

  return suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`;
}
