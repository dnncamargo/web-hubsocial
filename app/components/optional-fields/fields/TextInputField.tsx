import { useId } from 'react';
import styles from '../OptionalFields.module.css';

type TextInputFieldProps = {
    label: string;
    value: string;
    onChange: (newValue: string) => void;
    onLabelChange: (newValue: string) => void;
};

export default function TextInputField({ 
    label, 
    value, 
    onChange, 
    onLabelChange 
}: TextInputFieldProps) {
    const fieldId = useId();
    const labelId = `${fieldId}-label`;
    const valueId = `${fieldId}-value`;

    return (
        <div className={styles.field}>

            <input
                id={labelId}
                type="text"
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                className={styles.labelInput}
                aria-label="Nome do campo opcional"
                placeholder="Descrição"
            />

            <input
                id={valueId}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={styles.input}
                aria-label={label || 'Valor do campo opcional'}
            />
        </div>
    );
}
