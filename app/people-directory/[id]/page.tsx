'use client';

import { useEffect, useReducer, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router';
import AddEventModal from '../../events-history/components/AddEventModal';
import EditPersonModal from '../components/EditPersonModal';
import { useAuth } from '../../components/auth/AuthProvider';
import ProtectedRoute from '../../components/auth/ProtectedRoute';
import { Event, Person } from '../../utils/interfaces';
import { OptionalField } from '../../types/optionalFields';
import { usePersonRelationships } from '../../hooks/usePersonRelationships';
import { db } from '../../utils/firebaseConfig';
import { getPersonDocumentPath, hydratePerson } from '../../utils/personPayload';
import styles from '../PersonDetails.module.css';
import {
  initialCreationDraftLifecycleState,
  reduceCreationDraftLifecycle,
} from '../../utils/creationDraftLifecycle';

const contactFrequencyLabels: Record<NonNullable<Person['contactFrequency']>, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
};

const PersonDetails = () => {
  const { uid } = useAuth();
  const { id: personId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Person | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [addEventDraft, dispatchAddEventDraft] = useReducer(
    reduceCreationDraftLifecycle,
    initialCreationDraftLifecycleState,
  );
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { relationshipColors } = usePersonRelationships();

  const openAddEventModal = () => {
    dispatchAddEventDraft({ type: 'open' });
  };

  const dismissAddEventModal = () => {
    dispatchAddEventDraft({ type: 'dismiss' });
  };

  const discardAddEventDraft = () => {
    dispatchAddEventDraft({ type: 'discard' });
  };

  const fetchPerson = async () => {
    if (!uid || !personId) return;

    try {
      setIsLoading(true);
      const personReference = doc(db, getPersonDocumentPath(uid, personId));
      const snapshot = await getDoc(personReference);
      if (snapshot.exists()) {
        setPerson(hydratePerson(snapshot.id, snapshot.data()));
      } else {
        setPerson(null);
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao buscar pessoa:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    if (!uid || !personId) return;

    try {
      const eventsQuery = query(
        collection(db, `users/${uid}/events-history`),
        where('personIds', 'array-contains', personId),
      );
      const querySnapshot = await getDocs(eventsQuery);
      const eventData = querySnapshot.docs.map((eventDocument) => ({
        id: eventDocument.id,
        ...eventDocument.data(),
      })) as Event[];
      setEvents(eventData);
    } catch (error) {
      console.error('Erro ao buscar eventos associados:', error);
    }
  };

  useEffect(() => {
    if (!uid || !personId) return;
    void fetchPerson();
    void fetchEvents();
  }, [uid, personId]);

  if (isLoading) {
    return <p className={styles.loading}>Carregando as informações da pessoa...</p>;
  }

  if (!person) {
    return (
      <main className={styles.page}>
        <p className={styles.empty}>Pessoa não encontrada.</p>
        <button type="button" onClick={() => navigate('/people-directory')} className={styles.backButton}>
          Voltar para pessoas
        </button>
      </main>
    );
  }

  const relationships = person.relationships ?? [];
  const optionalFields = Array.isArray(person.optionalFields) ? person.optionalFields : [];

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>{person.name}</h1>
            <p className={styles.subtitle}>Registro de pessoa</p>
          </div>
          <div className={styles.headerActions}>
            <button type="button" onClick={() => setIsEditPersonModalOpen(true)} className={styles.editButton}>
              Editar
            </button>
            <button type="button" onClick={() => navigate(-1)} className={styles.backButton}>
              Voltar
            </button>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="person-contact-title">
          <h2 id="person-contact-title" className={styles.sectionTitle}>Contato</h2>
          <div>
            {person.phone && (
              <div className={styles.record}>
                <span className={styles.label}>Telefone</span>
                <span className={styles.value}>{person.phone}</span>
              </div>
            )}
            {person.email && (
              <div className={styles.record}>
                <span className={styles.label}>E-mail</span>
                <a className={`${styles.value} ${styles.link}`} href={`mailto:${person.email}`}>
                  {person.email}
                </a>
              </div>
            )}
            {!person.phone && !person.email && <p className={styles.empty}>Nenhum contato principal registrado.</p>}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="person-context-title">
          <h2 id="person-context-title" className={styles.sectionTitle}>Contexto</h2>
          <div>
            {person.birthday && (
              <div className={styles.record}>
                <span className={styles.label}>Aniversário</span>
                <span className={styles.value}>{person.birthday}</span>
              </div>
            )}
            {person.note && (
              <div className={styles.record}>
                <span className={styles.label}>Notas</span>
                <span className={styles.value}>{person.note}</span>
              </div>
            )}
            <div className={styles.record}>
              <span className={styles.label}>Relacionamentos</span>
              {relationships.length > 0 ? (
                <div className={styles.tagList}>
                    {relationships.map((relationship) => (
                      <span
                        key={relationship}
                        className={styles.tag}
                        style={getEntityColorStyle(relationshipColors[relationship])}
                      >
                        {relationship}
                      </span>
                    ))}
                </div>
              ) : (
                <span className={styles.value}>Nenhum relacionamento registrado.</span>
              )}
            </div>
            <div className={styles.record}>
              <span className={styles.label}>Frequência de contato</span>
              <span className={styles.value}>
                {person.contactFrequency
                  ? contactFrequencyLabels[person.contactFrequency]
                  : 'Nenhuma frequência definida.'}
              </span>
            </div>
          </div>
        </section>

        {optionalFields.length > 0 && (
          <section className={styles.section} aria-labelledby="person-optional-title">
            <h2 id="person-optional-title" className={styles.sectionTitle}>Informações adicionais</h2>
            <div className={styles.optionalList}>
              {optionalFields.map((field: OptionalField, index) => (
                <div key={field.id || index} className={styles.record}>
                  <span className={styles.label}>{field.label}</span>
                  {field.type === 'text' && <span className={styles.value}>{field.value}</span>}
                  {field.type === 'url' && (
                    <a href={field.value} target="_blank" rel="noopener noreferrer" className={`${styles.value} ${styles.link}`}>
                      {field.value}
                    </a>
                  )}
                  {field.type === 'additionalPhone' && <span className={styles.value}>{field.value}</span>}
                  {field.type === 'additionalEmail' && (
                    <a href={`mailto:${field.value}`} className={`${styles.value} ${styles.link}`}>
                      {field.value}
                    </a>
                  )}
                  {field.type === 'address' && typeof field.value === 'object' && (
                    <div className={styles.address}>
                      {field.value.location && <span className={styles.value}>Localidade: {field.value.location}</span>}
                      {field.value.zipcode && <span className={styles.value}>CEP: {field.value.zipcode}</span>}
                      {field.value.address && <span className={styles.value}>Endereço: {field.value.address}</span>}
                      {field.value.number && <span className={styles.value}>Número: {field.value.number}</span>}
                      {field.value.district && <span className={styles.value}>Bairro: {field.value.district}</span>}
                      {field.value.city && <span className={styles.value}>Cidade: {field.value.city}</span>}
                      {field.value.state && <span className={styles.value}>Estado: {field.value.state}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section} aria-labelledby="person-events-title">
          <h2 id="person-events-title" className={styles.sectionTitle}>Eventos associados</h2>
          {events.length > 0 ? (
            <div className={styles.eventList}>
              {events.map((event) => (
                <div key={event.id} className={styles.eventItem}>
                  <span className={styles.eventTitle}>{event.title}</span>
                  <span className={styles.eventMeta}>
                    {event.startDate} {event.startTime && `• ${event.startTime}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>Nenhum evento associado.</p>
          )}
        </section>

        <div className={styles.actionRow}>
          <button type="button" onClick={openAddEventModal} className={styles.primaryButton}>
            Adicionar evento
          </button>
        </div>

        {addEventDraft.hasMounted && (
          <AddEventModal
            key={`${personId ?? 'unknown'}-${addEventDraft.revision}`}
            isOpen={addEventDraft.isOpen}
            onDismiss={dismissAddEventModal}
            onCancel={discardAddEventDraft}
            onSaved={discardAddEventDraft}
            onAdded={() => { void fetchEvents(); }}
            initialPersonId={personId}
          />
        )}

        <EditPersonModal
          person={person}
          isOpen={isEditPersonModalOpen}
          onClose={() => setIsEditPersonModalOpen(false)}
          onUpdated={fetchPerson}
          onDeleted={async () => {
            navigate('/people-directory');
          }}
        />
      </main>
    </ProtectedRoute>
  );
};

export default PersonDetails;

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined;
}
