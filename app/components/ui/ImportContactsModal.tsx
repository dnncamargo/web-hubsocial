'use client'

import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider';
import { Contact, fetchAllContacts, parseGoogleContact } from '../../utils/googleContacts'
import { useNavigate } from 'react-router'
import { db } from '../../utils/firebaseConfig'
import { addDoc, collection } from 'firebase/firestore'
import { motion } from 'motion/react'
import { Timestamp } from 'firebase/firestore'
import styles from './ImportContactsModal.module.css'
import { buildPersonPayload } from '../../utils/personPayload'

interface ImportContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportContactsPage({ isOpen, onClose }: ImportContactsModalProps) {
  const { uid, googleAccessToken } = useAuth(); /** @const {uid | null} uid - O usuário do Firebase e do Google autenticado. */
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;
  if (!uid) return <p className={styles.loading}>Carregando usuário...</p>;

  async function loadContacts() {
    if (!googleAccessToken) {
      alert('Token de acesso não encontrado.');
      return;
    }

    setLoading(true);
    try {
      const loadedContacts = await fetchAllContacts(googleAccessToken);
      const mappedContacts = loadedContacts.map(parseGoogleContact);

      setContacts(mappedContacts);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      alert('Erro ao carregar contatos.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map(c => c.resourceName));
    }
  }

  async function importSelected() {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos um contato.');
      return;
    }

    setImporting(true);

    try {
      const selectedContacts = contacts.filter(c => selectedIds.includes(c.resourceName));

      const batch = selectedContacts.map(contact => {
        return addDoc(collection(db, `users/${uid}/people-directory`), buildPersonPayload({
          name: contact.displayName || 'Sem nome',
          phone: contact.phoneNumbers?.[0] || '',
          email: contact.emailAddresses?.[0] || '',
          birthday: contact.birthday || '',
          favorite: false,
          contactFrequency: null,
          optionalFields: (contact.addresses || []).map((address, index) => ({
            id: `imported-address-${index}`,
            type: 'text' as const,
            label: 'Endereço',
            value: address,
          })),
          createdAt: Timestamp.fromDate(new Date()),
        }));
      });

      await Promise.all(batch);

      alert('Contatos importados!');
      onClose();
      navigate('/people-directory');
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert('Erro ao importar contatos.');
    } finally {
      setImporting(false);
    }
  }


  return (
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="import-contacts-title">
        <header className={styles.header}>
          <h2 id="import-contacts-title" className={styles.title}>Importar contatos</h2>
          <button type="button" onClick={onClose} className={styles.closeButton}>
          Voltar
          </button>
        </header>

        <div className={styles.toolbar}>
        <button
          type="button"
          onClick={loadContacts}
          disabled={loading}
          className={styles.actionButton}
        >
          {loading ? 'Carregando...' : 'Carregar Contatos'}
        </button>

        {contacts.length > 0 && (
          <button
            type="button"
            onClick={selectAll}
            className={styles.secondaryButton}
          >
            {selectedIds.length === contacts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
        )}

        {/* Botão de Importar */}
        {contacts.length > 0 && (
          <button
            type="button"
            onClick={importSelected}
            disabled={importing}
            className={styles.primaryButton}
          >
            {importing
              ? 'Importando...'
              : `Importar ${selectedIds.length} Contato(s)`}
          </button>
        )}
        </div>

        <div className={styles.body}>
        {contacts.length === 0 && (
          <p className={styles.emptyState}>Nenhum contato carregado.</p>
        )}
        <div className={styles.contacts}>
          {contacts.map((contact) => {
            const checkboxId = `contact-${contact.resourceName}`
            const contactName = contact.displayName || 'Contato sem nome'

            return (
              <motion.div
                key={contact.resourceName}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={styles.contactRow}
              >
                <div className={styles.contactInfo}>
                  <p className={styles.contactName}>{contactName}</p>
                  {contact.phoneNumbers && (
                    <p className={styles.contactDetail}>{contact.phoneNumbers.join(', ')}</p>
                  )}
                </div>
                <label htmlFor={checkboxId} className={styles.checkboxLabel}>
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={selectedIds.includes(contact.resourceName)}
                    onChange={() => toggleSelect(contact.resourceName)}
                    className={styles.checkbox}
                    aria-label={`Selecionar ${contactName}`}
                  />
                </label>
              </motion.div>
            )
          })}
        </div>
        </div>
      </div>
    </div>
  )
}
