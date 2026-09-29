export type TaskItem = {
  id: string;
  text: string;
  done: boolean;
};

export type OptionalFieldContext = 'event' | 'person';

export type OptionalField = {
  id: string;
  type: 'text' | 'address' | 'tasks' | 'additionalPhone' | 'additionalEmail' | 'url';
  label: string;
  value: any;
};

export type OptionalFieldOption = {
  type: OptionalField['type'];
  label: string;
};

const OPTIONAL_FIELD_CAPABILITIES: Record<OptionalField['type'], readonly OptionalFieldContext[]> = {
  text: ['event', 'person'],
  address: ['event', 'person'],
  tasks: ['event'],
  additionalPhone: ['person'],
  additionalEmail: ['person'],
  url: ['event', 'person'],
};

export const optionalFieldOptions: readonly OptionalFieldOption[] = [
  { type: 'text', label: 'Campo de texto' },
  { type: 'address', label: 'Detalhes de endereço' },
  { type: 'tasks', label: 'Lista de tarefas' },
  { type: 'additionalEmail', label: 'E-mail adicional' },
  { type: 'additionalPhone', label: 'Telefone adicional' },
  { type: 'url', label: 'URL' },
];

export function canAddOptionalField(
  type: OptionalField['type'],
  context: OptionalFieldContext,
  fields: OptionalField[] = [],
): boolean {
  if (!OPTIONAL_FIELD_CAPABILITIES[type].includes(context)) return false;
  if (type === 'address' && fields.some((field) => field.type === 'address')) return false;
  return true;
}

export function getAvailableOptionalFieldOptions(
  context: OptionalFieldContext,
  fields: OptionalField[] = [],
): OptionalFieldOption[] {
  return optionalFieldOptions.filter(({ type }) => canAddOptionalField(type, context, fields));
}

export function getOptionalFieldLabel(type: OptionalField['type']): string {
  return optionalFieldOptions.find((option) => option.type === type)?.label ?? 'Novo campo';
}

export function getDefaultOptionalFieldValue(type: OptionalField['type']): OptionalField['value'] {
  if (type === 'address') {
    return {
      address: '',
      number: '',
      district: '',
      city: '',
      state: '',
      zipcode: '',
    };
  }

  if (type === 'tasks') return [];
  return '';
}
