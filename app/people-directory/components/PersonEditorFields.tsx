'use client';

import { useEffect, useState } from 'react';
import { Person } from '../../utils/interfaces';
import { parseBirthday } from '../../utils/birthday';
import { OptionalField, OptionalFieldOption } from '../../types/optionalFields';
import { OptionalFieldRenderer } from '../../components/optional-fields/OptionalFieldRenderer';
import { OptionalFieldModal } from '../../components/optional-fields/OptionalFieldModal';
import { PeopleRelationshipsRenderer } from './PeopleRelationshipsRenderer';
import { PeopleRelationshipsModal } from './PeopleRelationshipsModal';
import styles from './PersonEditor.module.css';

interface PersonEditorFieldsProps {
  showMore: boolean;
  onToggleMore: () => void;
  name: string;
  setName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  birthday: string;
  setBirthday: (value: string) => void;
  favorite: boolean;
  setFavorite: (value: boolean) => void;
  contactFrequency: Person['contactFrequency'];
  setContactFrequency: (value: Person['contactFrequency']) => void;
  optionalFields: OptionalField[];
  addOptionalField: (type: OptionalField['type']) => Promise<void>;
  availableFieldOptions: OptionalFieldOption[];
  removeOptionalField: (fieldId: string) => void;
  updateOptionalField: (fieldId: string, updates: Partial<OptionalField>) => void;
  updateLabel: (fieldId: string, label: string) => void;
  availableRelationships: string[];
  relationshipColors: Record<string, string>;
  selectedRelationships: string[];
  toggleRelationship: (relationship: string) => void;
  handleAddRelationship: (relationship: string) => Promise<boolean>;
  removeRelationship: (relationship: string) => Promise<boolean>;
  relationshipError: string | null;
  setRelationshipColor: (relationship: string, color: string) => Promise<void>;
  showOptionalFieldModal: boolean;
  setShowOptionalFieldModal: (value: boolean) => void;
  showRelationshipsModal: boolean;
  setShowRelationshipsModal: (value: boolean) => void;
}

export default function PersonEditorFields({
  showMore,
  onToggleMore,
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  birthday,
  setBirthday,
  favorite,
  setFavorite,
  contactFrequency,
  setContactFrequency,
  optionalFields,
  addOptionalField,
  availableFieldOptions,
  removeOptionalField,
  updateOptionalField,
  updateLabel,
  availableRelationships,
  relationshipColors,
  selectedRelationships,
  toggleRelationship,
  handleAddRelationship,
  removeRelationship,
  relationshipError,
  setRelationshipColor,
  showOptionalFieldModal,
  setShowOptionalFieldModal,
  showRelationshipsModal,
  setShowRelationshipsModal,
}: PersonEditorFieldsProps) {
  return (
    <>
      <div className={styles.preferenceRow}>
        <span>Favorito</span>
        <button
          type="button"
          role="switch"
          aria-checked={favorite}
          aria-label="Marcar pessoa como favorita"
          onClick={() => setFavorite(!favorite)}
          className={`${styles.switch} ${favorite ? styles.switchActive : ''}`}
        >
          <span className={`${styles.switchThumb} ${favorite ? styles.switchThumbActive : ''}`} />
        </button>
      </div>

      <div className={styles.fieldGroup}>
        <input
          type="text"
          aria-label="Nome completo"
          placeholder="Nome completo"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={styles.textInput}
        />
        <input
          type="tel"
          aria-label="Telefone"
          placeholder="Telefone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={styles.textInput}
        />
        <input
          type="email"
          aria-label="E-mail"
          placeholder="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={styles.textInput}
        />
      </div>

      <div className={styles.moreRow}>
        <span>Mostrar mais campos</span>
        <button
          type="button"
          role="switch"
          aria-checked={showMore}
          aria-label="Mostrar campos adicionais"
          onClick={onToggleMore}
          className={`${styles.switch} ${showMore ? styles.switchActive : ''}`}
        >
          <span className={`${styles.switchThumb} ${showMore ? styles.switchThumbActive : ''}`} />
        </button>
      </div>

      {showMore && (
        <div className={styles.moreContent}>
          <BirthdayFields value={birthday} onChange={setBirthday} />

          <div className={styles.preferenceRow}>
            <label htmlFor="person-contact-frequency">Frequência de contato</label>
            <select
              id="person-contact-frequency"
              value={contactFrequency ?? ''}
              onChange={(event) => setContactFrequency(event.target.value as Person['contactFrequency'])}
              className={styles.select}
            >
              <option value="">Sem frequência</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quinzenal</option>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
            </select>
          </div>

          {optionalFields.map((field) => (
            <div key={field.id}>
              <OptionalFieldRenderer
                field={field}
                onChange={(updatedValue) => updateOptionalField(field.id, { value: updatedValue })}
                onLabelChange={(newLabel) => updateLabel(field.id, newLabel)}
                onRemove={() => removeOptionalField(field.id)}
              />
            </div>
          ))}

          <PeopleRelationshipsRenderer
            selectedRelationships={selectedRelationships}
            relationshipColors={relationshipColors}
          />

          {showOptionalFieldModal && (
            <OptionalFieldModal
              context="person"
              availableFieldOptions={availableFieldOptions}
              onAddOptionalField={addOptionalField}
              onClose={() => setShowOptionalFieldModal(false)}
            />
          )}

          {showRelationshipsModal && (
            <PeopleRelationshipsModal
              onClose={() => setShowRelationshipsModal(false)}
              availableRelationships={availableRelationships}
              selectedRelationships={selectedRelationships}
              toggleRelationship={toggleRelationship}
              handleAddRelationship={handleAddRelationship}
              removeRelationship={removeRelationship}
              error={relationshipError}
              relationshipColors={relationshipColors}
              setRelationshipColor={setRelationshipColor}
            />
          )}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => setShowRelationshipsModal(true)}
              className={styles.textAction}
            >
              + Adicionar relacionamento
            </button>
            <button
              type="button"
              onClick={() => setShowOptionalFieldModal(true)}
              className={styles.textAction}
            >
              + Adicionar campo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface BirthdayFieldsProps {
  value: string;
  onChange: (value: string) => void;
}

const months = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function BirthdayFields({ value, onChange }: BirthdayFieldsProps) {
  const parsedBirthday = parseBirthday(value);
  const [day, setDay] = useState(parsedBirthday ? String(parsedBirthday.day) : '');
  const [month, setMonth] = useState(parsedBirthday ? String(parsedBirthday.month) : '');
  const [year, setYear] = useState(parsedBirthday?.year ? String(parsedBirthday.year) : '');

  useEffect(() => {
    const parsed = parseBirthday(value);
    if (parsed) {
      setDay(String(parsed.day));
      setMonth(String(parsed.month));
      setYear(parsed.year === undefined ? '' : String(parsed.year));
    } else if (!value) {
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);

  const updateBirthday = (next: { day?: string; month?: string; year?: string }) => {
    const nextDay = next.day ?? day;
    const nextMonth = next.month ?? month;
    const nextYear = next.year ?? year;
    const dayPart = nextDay.padStart(2, '0');
    const monthPart = nextMonth.padStart(2, '0');
    const hasCompleteDayAndMonth = /^\d{1,2}$/.test(nextDay) && /^\d{1,2}$/.test(nextMonth);
    const hasCompleteYear = /^\d{4}$/.test(nextYear);

    if (hasCompleteDayAndMonth && (!nextYear || hasCompleteYear)) {
      onChange(nextYear ? `${nextYear}-${monthPart}-${dayPart}` : `--${monthPart}-${dayPart}`);
      return;
    }

    if (!nextDay && !nextMonth && !nextYear) {
      onChange('');
      return;
    }

    onChange(`${nextYear || '----'}-${nextMonth || '--'}-${nextDay || '--'}`);
  };

  return (
    <fieldset className={styles.birthdayFields}>
      <legend className={styles.fieldLegend}>Aniversário</legend>
      <div className={styles.birthdayGrid}>
        <label className={styles.birthdayControl}>
          <span>Dia</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            maxLength={2}
            aria-label="Dia do aniversário"
            value={day}
            onChange={(event) => {
              setDay(event.target.value);
              updateBirthday({ day: event.target.value });
            }}
            className={styles.birthdayInput}
          />
        </label>
        <label className={styles.birthdayControl}>
          <span>Mês</span>
          <select
            aria-label="Mês do aniversário"
            value={month}
            onChange={(event) => {
              setMonth(event.target.value);
              updateBirthday({ month: event.target.value });
            }}
            className={styles.birthdayInput}
          >
            <option value="">Selecione</option>
            {months.map((monthName, index) => (
              <option key={monthName} value={index + 1}>{monthName}</option>
            ))}
          </select>
        </label>
        <label className={styles.birthdayControl}>
          <span>Ano (opcional)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1000"
            max={new Date().getFullYear()}
            maxLength={4}
            aria-label="Ano do aniversário, opcional"
            placeholder="AAAA"
            value={year}
            onChange={(event) => {
              setYear(event.target.value);
              updateBirthday({ year: event.target.value });
            }}
            className={styles.birthdayInput}
          />
        </label>
      </div>
      <p className={styles.fieldHint}>Informe dia e mês. O ano é opcional.</p>
    </fieldset>
  );
}
