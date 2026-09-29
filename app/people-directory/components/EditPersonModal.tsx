'use client';

import { FormEvent, useEffect, useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useAuth } from '../../components/auth/AuthProvider';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Person } from '../../utils/interfaces';
import { db } from '../../utils/firebaseConfig';
import { useOptionalFields } from '../../hooks/useOptionalFields';
import { usePersonRelationships } from '../../hooks/usePersonRelationships';
import { usePersonForm } from '../../hooks/usePersonForm';
import PersonEditorFields from './PersonEditorFields';
import styles from './PersonEditor.module.css';

interface EditPersonModalProps {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
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
  } = optionalFieldsControl;
  const {
    availableRelationships,
    selectedRelationships,
    toggleRelationship,
    handleAddRelationship,
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
    updatePerson,
  } = usePersonForm({
    uid: uid ?? '',
    person,
    optionalFieldsControl,
    personRelationshipsControl,
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

    onUpdated();
    onClose();
  };

  const handleDelete = async () => {
    if (!uid) return;

    try {
      await deleteDoc(doc(db, 'users', uid, 'people-directory', person.id));
      onDeleted();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir o cadastro da pessoa:', error);
    }
  };

  if (!isOpen || !uid) return null;

  return (
    <ProtectedRoute>
      <motion.div
        className={styles.overlay}
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
              <button type="button" onClick={onClose} className={styles.toolbarButton}>
                Cancelar
              </button>
              <h2 id="edit-person-title" className={styles.toolbarTitle}>Editar pessoa</h2>
              <button type="submit" className={styles.toolbarButton}>
                Salvar
              </button>
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
              selectedRelationships={selectedRelationships}
              toggleRelationship={toggleRelationship}
              handleAddRelationship={handleAddRelationship}
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
