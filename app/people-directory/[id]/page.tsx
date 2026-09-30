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
import { formatBirthday } from '../../utils/birthday';
import { getPersonDocumentPath, hydratePerson } from '../../utils/personPayload';
import detailStyles from '../../events-history/[id]/EventDetails.module.css';
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
    return <p className={detailStyles.loading}>Carregando as informações da pessoa...</p>;
  }

  if (!person) {
    return (
      <main className={detailStyles.page}>
        <p className={styles.panelEmpty}>Pessoa não encontrada.</p>
        <button
          type="button"
          onClick={() => navigate('/people-directory')}
          className={detailStyles.backButton}
        >
          Voltar para pessoas
        </button>
      </main>
    );
  }

  const relationships = person.relationships ?? [];
  const optionalFields = Array.isArray(person.optionalFields) ? person.optionalFields : [];
  const formattedBirthday = formatBirthday(person.birthday);

  return (
    <ProtectedRoute>
      <main className={detailStyles.page}>
        <header className={`${detailStyles.header} ${styles.header}`}>
          <div className={detailStyles.heading}>
            <p className={detailStyles.eyebrow}>Pessoa</p>
            <h1 className={detailStyles.title}>{person.name}</h1>
          </div>
          <div className={detailStyles.headerActions}>
            <button
              type="button"
              onClick={() => setIsEditPersonModalOpen(true)}
              className={detailStyles.editButton}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={detailStyles.backButton}
            >
              Voltar
            </button>
          </div>
        </header>

        <div className={detailStyles.layout}>
          <div className={detailStyles.column}>
            <section className={detailStyles.section} aria-labelledby="person-contact-title">
              <header className={detailStyles.sectionHeader}>
                <h2 id="person-contact-title" className={detailStyles.sectionTitle}>Contato</h2>
              </header>
              {person.phone || person.email ? (
                <dl className={detailStyles.definitionList}>
                  {person.phone && (
                    <div className={detailStyles.definitionRow}>
                      <dt className={detailStyles.term}>Telefone</dt>
                      <dd className={detailStyles.value}>{person.phone}</dd>
                    </div>
                  )}
                  {person.email && (
                    <div className={detailStyles.definitionRow}>
                      <dt className={detailStyles.term}>E-mail</dt>
                      <dd className={detailStyles.value}>
                        <a className={styles.link} href={`mailto:${person.email}`}>
                          {person.email}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className={styles.panelEmpty}>Nenhum contato principal registrado.</p>
              )}
            </section>

            <section className={detailStyles.section} aria-labelledby="person-context-title">
              <header className={detailStyles.sectionHeader}>
                <h2 id="person-context-title" className={detailStyles.sectionTitle}>Contexto</h2>
              </header>
              <dl className={detailStyles.definitionList}>
                {formattedBirthday && (
                  <div className={detailStyles.definitionRow}>
                    <dt className={detailStyles.term}>Aniversário</dt>
                    <dd className={detailStyles.value}>{formattedBirthday}</dd>
                  </div>
                )}
                {person.note && (
                  <div className={detailStyles.definitionRow}>
                    <dt className={detailStyles.term}>Notas</dt>
                    <dd className={detailStyles.value}>{person.note}</dd>
                  </div>
                )}
                <div className={detailStyles.definitionRow}>
                  <dt className={detailStyles.term}>Relacionamentos</dt>
                  <dd className={detailStyles.value}>
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
                      'Nenhum relacionamento registrado.'
                    )}
                  </dd>
                </div>
                <div className={detailStyles.definitionRow}>
                  <dt className={detailStyles.term}>Frequência de contato</dt>
                  <dd className={detailStyles.value}>
                    {person.contactFrequency
                      ? contactFrequencyLabels[person.contactFrequency]
                      : 'Nenhuma frequência definida.'}
                  </dd>
                </div>
              </dl>
            </section>

            {optionalFields.length > 0 && (
              <section className={detailStyles.section} aria-labelledby="person-optional-title">
                <header className={detailStyles.sectionHeader}>
                  <h2 id="person-optional-title" className={detailStyles.sectionTitle}>
                    Informações adicionais
                  </h2>
                </header>
                <dl className={detailStyles.definitionList}>
                  {optionalFields.map((field: OptionalField, index) => (
                    <div key={field.id || index} className={detailStyles.definitionRow}>
                      <dt className={detailStyles.term}>{field.label}</dt>
                      <dd className={detailStyles.value}>
                        {renderOptionalFieldValue(field)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <aside className={detailStyles.column}>
            <section className={detailStyles.section} aria-labelledby="person-events-title">
              <header className={detailStyles.sectionHeader}>
                <h2 id="person-events-title" className={detailStyles.sectionTitle}>
                  Eventos associados
                </h2>
              </header>
              {events.length > 0 ? (
                <div className={detailStyles.optionalList}>
                  {events.map((event) => (
                    <div key={event.id} className={detailStyles.optionalItem}>
                      <p className={styles.eventTitle}>{event.title}</p>
                      <p className={styles.eventMeta}>
                        {event.startDate} {event.startTime && `• ${event.startTime}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.panelEmpty}>Nenhum evento associado.</p>
              )}
              <div className={detailStyles.actions}>
                <button
                  type="button"
                  onClick={openAddEventModal}
                  className={detailStyles.calendarButton}
                >
                  Adicionar evento
                </button>
              </div>
            </section>
          </aside>
        </div>

        {addEventDraft.hasMounted && (
          <AddEventModal
            key={`${personId ?? 'unknown'}-${addEventDraft.revision}`}
            isOpen={addEventDraft.isOpen}
            onDismiss={dismissAddEventModal}
            onCancel={dismissAddEventModal}
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

function renderOptionalFieldValue(field: OptionalField) {
  switch (field.type) {
    case 'text':
    case 'additionalPhone':
      return <span>{field.value}</span>;
    case 'additionalEmail':
      return <a className={styles.link} href={`mailto:${field.value}`}>{field.value}</a>;
    case 'url':
      return (
        <a href={field.value} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {field.value}
        </a>
      );
    case 'address':
      return typeof field.value === 'object' ? (
        <div className={styles.address}>
          {field.value.location && <span>Localidade: {field.value.location}</span>}
          {field.value.zipcode && <span>CEP: {field.value.zipcode}</span>}
          {field.value.address && <span>Endereço: {field.value.address}</span>}
          {field.value.number && <span>Número: {field.value.number}</span>}
          {field.value.district && <span>Bairro: {field.value.district}</span>}
          {field.value.city && <span>Cidade: {field.value.city}</span>}
          {field.value.state && <span>Estado: {field.value.state}</span>}
        </div>
      ) : null;
    default:
      return 'Valor não suportado';
  }
}

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined;
}
