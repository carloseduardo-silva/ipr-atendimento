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

/** Unidades físicas do instituto — usadas para filtrar as filas por local de atendimento. */
export const UNIDADES = ["São Paulo", "Campinas", "Santos"] as const;

export type Unidade = (typeof UNIDADES)[number];

export const MEDICO_UNIDADE: Record<Medico, Unidade> = {
  "Dr. Martinez": "São Paulo",
  "Dr. Lucas Cortez": "São Paulo",
  "Dr. Nion Netto": "São Paulo",
  "Dr. Guilherme Sabbag": "São Paulo",
  "Dr. Lana": "São Paulo",
  "Dr. Lucas": "Campinas",
  "Dr. Gabriel": "Campinas",
  "Dr. Jose": "Santos",
  "Dra. Raissa": "Santos",
  "Dr. João": "Santos",
};
