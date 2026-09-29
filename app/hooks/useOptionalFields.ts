import { useState, useCallback, useMemo } from 'react';
import {
    canAddOptionalField,
    getAvailableOptionalFieldOptions,
    getDefaultOptionalFieldValue,
    getOptionalFieldLabel,
    OptionalField,
} from '../types/optionalFields';

type UseOptionalFieldsOptions = {
    context: "event" | "person";
};

export function useOptionalFields({ context }: UseOptionalFieldsOptions, initialFields: OptionalField[] = []) {

    const [optionalFields, setOptionalFields] = useState<OptionalField[]>(initialFields);

    const selectContext = useCallback(
        (type: OptionalField['type']): boolean => canAddOptionalField(type, context, optionalFields),
        [context, optionalFields],
    );

    const availableFieldOptions = useMemo(
        () => getAvailableOptionalFieldOptions(context, optionalFields),
        [context, optionalFields],
    );

    const addOptionalField = async (type: OptionalField["type"]): Promise<void> => {
        setOptionalFields((prev) => {
            if (!canAddOptionalField(type, context, prev)) return prev;

            return [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    type,
                    label: getOptionalFieldLabel(type),
                    value: getDefaultOptionalFieldValue(type),
                },
            ];
        });
    };

    const removeOptionalField = useCallback((fieldId: string) => {
        setOptionalFields((prev) => prev.filter((field) => field.id !== fieldId));
    }, []);

    const updateOptionalField = useCallback((fieldId: string, updates: Partial<OptionalField>) => {
        setOptionalFields((prev) =>
            prev.map((field) =>
                field.id === fieldId ? { ...field, ...updates } : field
            )
        );
    }, []);

    const updateLabel = (id: string, newLabel: string) => {
        setOptionalFields((prev) =>
            prev.map((field) =>
                field.id === id ? { ...field, label: newLabel } : field
            )
        );
    };

    const groupedFields = optionalFields.reduce<Record<string, OptionalField[]>>(
        (acc, field) => {
            if (!acc[field.type]) acc[field.type] = [];
            acc[field.type].push(field);
            return acc;
        },
        {}
    );

    const resetOptionalFields = useCallback((fields: OptionalField[] = []) => {
        setOptionalFields(fields);
    }, []);

    return {
        optionalFields,
        addOptionalField,
        removeOptionalField,
        updateOptionalField,
        updateLabel,
        selectContext,
        canAddOptionalField: selectContext,
        availableFieldOptions,
        groupedFields,
        resetOptionalFields,
    };
}
