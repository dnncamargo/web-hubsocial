import { OptionalField } from '../../types/optionalFields';
import TextInputField from "./fields/TextInputField";
import TaskListField from "./fields/TaskListField";
import AddressField from "./fields/AddressField";
import styles from './OptionalFields.module.css';

type OptionalFieldRendererProps = {
    field: OptionalField;
    onChange: (updatedValue: any) => void;
    onLabelChange: (updatedValue: any) => void;
    onRemove?: () => void;
};

export function OptionalFieldRenderer({ field, onChange, onLabelChange, onRemove }: OptionalFieldRendererProps) {

    return (
        <div className={styles.container}>

            <div className={styles.fieldContent}>

            {['text', 'additionalEmail', 'additionalPhone', 'url'].includes(field.type) && (
                <TextInputField
                    label={field.label}
                    value={field.value as string}
                    onChange={onChange}
                    onLabelChange={onLabelChange}
                />
            )}

            {field.type === "address" && (
                <AddressField
                    label={field.label}
                    value={field.value || {
                        address: "",
                        number: "",
                        district: "",
                        city: "",
                        state: "",
                        zipcode: ""
                    }}
                    onChange={(newValue) => onChange(newValue)}
                    onLabelChange={onLabelChange}
                />
            )}

            {field.type === 'tasks' && (
                <TaskListField
                    label={field.label}
                    value={field.value || []}
                    onChange={(newValue) => onChange(newValue)}
                    onLabelChange={onLabelChange}
                />
            )}

            </div>

            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        onRemove?.();
                    }}
                    className={styles.removeAction}
                >
                    Remover
                </button>
            )}
        </div>
    );
}
