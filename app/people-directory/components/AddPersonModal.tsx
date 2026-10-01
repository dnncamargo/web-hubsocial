'use client';

import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../components/auth/AuthProvider';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { useOptionalFields } from '../../hooks/useOptionalFields';
import { usePersonRelationships } from '../../hooks/usePersonRelationships';
import { usePersonForm } from '../../hooks/usePersonForm';
import { useLocalEditorDraft } from '../../hooks/useLocalEditorDraft';
import {
  isPersonEditorDraft,
  type PersonEditorDraft,
} from '../../utils/editorDraftStorage';
import PersonEditorFields from './PersonEditorFields';
import styles from './PersonEditor.module.css';

interface AddPersonModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onCancel: () => void;
  onSaved: () => void;
  onAdded: () => void | Promise<void>;
}

const AddPersonModal = ({ isOpen, onDismiss, onCancel, onSaved, onAdded }: AddPersonModalProps) => {
  const { uid } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const [showOptionalFieldModal, setShowOptionalFieldModal] = useState(false);
  const [showRelationshipsModal, setShowRelationshipsModal] = useState(false);
  const optionalFieldsControl = useOptionalFields({ context: 'person' });
  const personRelationshipsControl = usePersonRelationships();

  const {
    optionalFields,
    addOptionalField,
    availableFieldOptions,
    removeOptionalField,
    updateOptionalField,
    updateLabel,
    resetOptionalFields,
  } = optionalFieldsControl;
  const {
    availableRelationships,
    relationshipColors,
    selectedRelationships,
    setSelectedRelationships,
    toggleRelationship,
    handleAddRelationship,
    removeRelationship,
    setRelationshipColor,
    error: relationshipError,
  } = personRelationshipsControl;
  const {
    name,
    setName,
    email,
    setEmail,
    phone,
    setPhone,
    birthday,
    setBirthday,
    favorite,
    setFavorite,
    contactFrequency,
    setContactFrequency,
    error,
    setError,
    resetForm,
    createPerson,
  } = usePersonForm({
    uid: uid ?? '',
    optionalFieldsControl,
    personRelationshipsControl,
  });

  const closeNestedModals = () => {
    setShowOptionalFieldModal(false);
    setShowRelationshipsModal(false);
  };

  const editorDraft = useLocalEditorDraft<PersonEditorDraft>({
    scope: {
      uid,
      entity: 'person',
      operation: 'add',
    },
    isOpen,
    isValid: isPersonEditorDraft,
    getSnapshot: () => ({
      name,
      phone,
      email,
      birthday,
      favorite,
      contactFrequency,
      relationships: selectedRelationships,
      optionalFields,
      showMore,
    }),
    restoreSnapshot: (draft) => {
      setName(draft.name);
      setPhone(draft.phone);
      setEmail(draft.email);
      setBirthday(draft.birthday);
      setFavorite(draft.favorite);
      setContactFrequency(draft.contactFrequency ?? null);
      setSelectedRelationships(draft.relationships);
      resetOptionalFields(draft.optionalFields);
      setShowMore(draft.showMore);
      setError(null);
    },
    resetState: () => {
      resetForm();
      setShowMore(false);
      closeNestedModals();
    },
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleDismiss = () => {
    editorDraft.saveOnDismiss();
    closeNestedModals();
    onDismiss();
  };

  const handleCancel = () => {
    editorDraft.saveOnDismiss();
    closeNestedModals();
    onCancel();
  };

  const handleClear = () => {
    editorDraft.clearDraft();
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    handleDismiss();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await createPerson();
    if (!success) return;

    editorDraft.consumeAfterSave();
    await onAdded();
    onSaved();
  };

  if (!isOpen || !uid) return null;

  return (
    <ProtectedRoute>
      <motion.div
        className={styles.overlay}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-person-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.content}>
            <div className={styles.toolbar}>
              <div className={styles.toolbarStart}>
                <button type="button" onClick={handleCancel} className={styles.toolbarButton}>
                  Cancelar
                </button>
                {editorDraft.canClearDraft && (
                  <button type="button" onClick={handleClear} className={styles.toolbarButton}>
                    Limpar
                  </button>
                )}
              </div>
              <h2 id="add-person-title" className={styles.toolbarTitle}>Nova pessoa</h2>
              <div className={styles.toolbarEnd}>
                <button type="submit" className={styles.toolbarButton}>
                  Salvar
                </button>
              </div>
            </div>

            <PersonEditorFields
              showMore={showMore}
              onToggleMore={() => setShowMore((value) => !value)}
              name={name}
              setName={setName}
              phone={phone}
              setPhone={setPhone}
              email={email}
              setEmail={setEmail}
              birthday={birthday}
              setBirthday={setBirthday}
              favorite={favorite}
              setFavorite={setFavorite}
              contactFrequency={contactFrequency}
              setContactFrequency={setContactFrequency}
              optionalFields={optionalFields}
              addOptionalField={addOptionalField}
              availableFieldOptions={availableFieldOptions}
              removeOptionalField={removeOptionalField}
              updateOptionalField={updateOptionalField}
              updateLabel={updateLabel}
              availableRelationships={availableRelationships}
              relationshipColors={relationshipColors}
              selectedRelationships={selectedRelationships}
              toggleRelationship={toggleRelationship}
              handleAddRelationship={handleAddRelationship}
              removeRelationship={removeRelationship}
              relationshipError={relationshipError}
              setRelationshipColor={setRelationshipColor}
              showOptionalFieldModal={showOptionalFieldModal}
              setShowOptionalFieldModal={setShowOptionalFieldModal}
              showRelationshipsModal={showRelationshipsModal}
              setShowRelationshipsModal={setShowRelationshipsModal}
            />

            {error && <p className={styles.error} role="alert">{error}</p>}
          </div>
        </form>
      </motion.div>
    </ProtectedRoute>
  );
};

export default AddPersonModal;
