const htmlTagPattern = /<[^>]*>/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export type PublicInquiryFormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
  privacyAccepted: boolean;
  company: string;
};

export type PublicInquiryFieldErrors = Partial<Record<keyof PublicInquiryFormValues, string>>;

export type PublicPickupFormValues = {
  name: string;
  email: string;
  phone: string;
  notes: string;
  privacyAccepted: boolean;
  company: string;
};

export type PublicPickupFieldErrors = Partial<
  Record<keyof PublicPickupFormValues | "items" | "pickup", string>
>;

export function containsHtmlTag(value: string) {
  return htmlTagPattern.test(value);
}

export function validatePublicInquiryValues(
  values: PublicInquiryFormValues,
): PublicInquiryFieldErrors {
  const errors: PublicInquiryFieldErrors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  const message = values.message.trim();

  if (containsHtmlTag(values.name)) errors.name = "Il nome non può contenere HTML.";
  else if (name.length < 2 || name.length > 120) errors.name = "Inserisci un nome valido.";

  if (!emailPattern.test(values.email.trim())) errors.email = "Inserisci un indirizzo email valido.";

  if (phone && containsHtmlTag(values.phone)) errors.phone = "Il telefono non può contenere HTML.";
  else if (phone.length > 60) errors.phone = "Inserisci un telefono valido.";

  if (containsHtmlTag(values.message)) errors.message = "Il messaggio non può contenere HTML.";
  else if (message.length < 10 || message.length > 4_000)
    errors.message = "Il messaggio deve contenere da 10 a 4000 caratteri.";

  if (!values.privacyAccepted) errors.privacyAccepted = "Il consenso privacy è obbligatorio.";
  return errors;
}

export function validatePublicPickupValues(
  values: PublicPickupFormValues,
  itemCount: number,
  pickupTime: string,
): PublicPickupFieldErrors {
  const errors: PublicPickupFieldErrors = {};
  const name = values.name.trim();
  const phone = values.phone.trim();
  const notes = values.notes.trim();

  if (itemCount < 1) errors.items = "Aggiungi almeno una voce del menu all'ordine.";
  if (!pickupTime) errors.pickup = "Scegli un orario di ritiro disponibile.";

  if (containsHtmlTag(values.name)) errors.name = "Il nome non può contenere HTML.";
  else if (name.length < 2 || name.length > 120) errors.name = "Inserisci un nome valido.";

  if (!emailPattern.test(values.email.trim())) errors.email = "Inserisci un indirizzo email valido.";

  if (phone && containsHtmlTag(values.phone)) errors.phone = "Il telefono non può contenere HTML.";
  else if (phone.length > 60) errors.phone = "Inserisci un telefono valido.";

  if (notes && containsHtmlTag(values.notes)) errors.notes = "Le note non possono contenere HTML.";
  else if (notes.length > 1_000)
    errors.notes = "Le note possono contenere al massimo 1000 caratteri.";

  if (!values.privacyAccepted) errors.privacyAccepted = "Il consenso privacy è obbligatorio.";
  return errors;
}
