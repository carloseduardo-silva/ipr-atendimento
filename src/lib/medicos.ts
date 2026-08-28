/**
 * Médicos que atendem as avaliações online.
 *
 * Cada médico tem a sua fila isolada: a posição da paciente é contada apenas
 * entre as pacientes do mesmo médico, e o painel `/admin` opera uma fila por vez.
 *
 * A coluna `medico` no banco é texto livre, então `Patient["medico"]` continua
 * sendo `string` — esta constante é apenas a lista oferecida na interface.
 */
export const MEDICOS = ["Dr. Martinez", "Dr. Lucas Cortez", "Dr. Nion Netto", "Dr. Guilherme Sabbag", "Dr. Jose", "Dra. Raissa", "Dr. João", "Dr. Lucas", "Dr. Gabriel", "Dr. Lana"] as const;

export type Medico = (typeof MEDICOS)[number];
