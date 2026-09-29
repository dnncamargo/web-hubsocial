'use client';

import { useId, useRef } from 'react';
import { searchAddress } from '../../../utils/services';
import styles from '../OptionalFields.module.css';

type AddressValue = {
  address: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipcode: string;
};

interface AddressFieldProps {
  label: string;
  value: AddressValue;
  onChange: (newValue: AddressValue) => void;
  onLabelChange: (newValue: string) => void;
}

export default function AddressField({
  label,
  value,
  onChange,
  onLabelChange
}: AddressFieldProps) {

  const numberInputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  const handleSearchCep = async () => {
    if (!value.zipcode) return;

    try {
      const result = await searchAddress(value.zipcode);
      if (result) {
        const newValue = {
          ...value,
          address: result.address || '',
          district: result.district || '',
          city: result.city || '',
          state: result.state || ''
        };

        onChange(newValue);

        // Dá foco no campo número
        setTimeout(() => {
          numberInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Erro na busca de CEP:', error);
    }
  };

  const handleFieldChange = (field: keyof AddressValue, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const hasAddressData = value.address || value.city || value.state || value.district;

  return (
    <div className={styles.field}>

      {/* Label editável */}
      <input
        id={`${fieldId}-label`}
        type="text"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        className={styles.labelInput}
        aria-label="Nome do campo de endereço"
        placeholder="Detalhes do endereço"
      />

      <div className={styles.addressFields}>
        <input
          id={`${fieldId}-zipcode`}
          type="text"
          placeholder="CEP"
          value={value.zipcode}
          onChange={(e) => handleFieldChange('zipcode', e.target.value)}
          onBlur={handleSearchCep}
          className={styles.input}
          inputMode="numeric"
          autoComplete="postal-code"
          aria-label="CEP"
        />

        <input
          id={`${fieldId}-number`}
          type="text"
          placeholder="Número"
          value={value.number}
          onChange={(e) => handleFieldChange('number', e.target.value)}
          className={styles.input}
          inputMode="numeric"
          ref={numberInputRef}
          aria-label="Número do endereço"
        />

        {hasAddressData && (
          <>
            <input
              id={`${fieldId}-address`}
              type="text"
              placeholder="Endereço"
              value={value.address}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              className={styles.input}
              autoComplete="street-address"
              aria-label="Endereço"
            />
            <input
              id={`${fieldId}-district`}
              type="text"
              placeholder="Bairro"
              value={value.district}
              onChange={(e) => handleFieldChange('district', e.target.value)}
              className={styles.input}
              aria-label="Bairro"
            />
            <input
              id={`${fieldId}-city`}
              type="text"
              placeholder="Cidade"
              value={value.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              className={styles.input}
              autoComplete="address-level2"
              aria-label="Cidade"
            />
            <input
              id={`${fieldId}-state`}
              type="text"
              placeholder="Estado"
              value={value.state}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              className={styles.input}
              autoComplete="address-level1"
              aria-label="Estado"
            />
          </>
        )}
      </div>

    </div>
  );
}
