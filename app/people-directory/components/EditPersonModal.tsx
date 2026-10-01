'use client';

import { FormEvent, useEffect, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useAuth } from '../../components/auth/AuthProvider';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Person } from '../../utils/interfaces';
import { db } from '../../utils/firebaseConfig';
import { getPersonDocumentPath } from '../../utils/personPayload';
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

interface EditPersonModalProps {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}

const EditPersonModal = ({
  person,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: EditPersonModalProps) => {
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
    updatePerson,
  } = usePersonForm({
    uid: uid ?? '',
    person,
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
      operation: 'edit',
      entityId: person.id,
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

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = await updatePerson();
    if (!success) return;

    editorDraft.consumeAfterSave();
    await onUpdated();
    onClose();
  };

  const handleDelete = async () => {
    if (!uid) return;
    if (!window.confirm(`Excluir o cadastro de ${person.name}?`)) return;

    try {
      await deleteDoc(doc(db, getPersonDocumentPath(uid, person.id)));
      editorDraft.consumeAfterSave();
      await onDeleted();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir o cadastro da pessoa:', error);
      setError('Erro ao excluir a pessoa. Verifique sua conexão.');
    }
  };

  const handleDismiss = () => {
    editorDraft.saveOnDismiss();
    closeNestedModals();
    onClose();
  };

  const handleClear = () => {
    editorDraft.clearDraft();
  };

  if (!isOpen || !uid) return null;

  return (
    <ProtectedRoute>
      <motion.div
        className={styles.overlay}
        onClick={(clickEvent) => {
          if (clickEvent.target === clickEvent.currentTarget) handleDismiss();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-person-title"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.2 }}
      >
        <form className={styles.form} onSubmit={handleUpdate}>
          <div className={styles.content}>
            <div className={styles.toolbar}>
              <div className={styles.toolbarStart}>
                <button type="button" onClick={handleDismiss} className={styles.toolbarButton}>
                  Cancelar
                </button>
                {editorDraft.canClearDraft && (
                  <button type="button" onClick={handleClear} className={styles.toolbarButton}>
                    Limpar
                  </button>
                )}
              </div>
              <h2 id="edit-person-title" className={styles.toolbarTitle}>Editar pessoa</h2>
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

            <div className={styles.deleteRow}>
              <button type="button" onClick={handleDelete} className={styles.deleteButton}>
                Excluir cadastro
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </ProtectedRoute>
  );
};

export default EditPersonModal;
