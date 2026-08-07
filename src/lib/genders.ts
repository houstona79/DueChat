export const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
] as const;

export type Gender = (typeof GENDERS)[number]["value"];

export function genderLabel(value: string | null | undefined) {
  return GENDERS.find((g) => g.value === value)?.label ?? null;
}
