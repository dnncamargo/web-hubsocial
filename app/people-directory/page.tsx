'use client';

import { useEffect, useReducer, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ListFilter, Search, UserPlus, X } from 'lucide-react';
import { db } from '../utils/firebaseConfig';
import { useAuth } from '../components/auth/AuthProvider';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useSearchParams } from 'react-router';
import { Person } from '../utils/interfaces';
import { getPersonDocumentPath, hydratePerson } from '../utils/personPayload';
import { usePersonRelationships } from '../hooks/usePersonRelationships';
import { usePageTitle } from '../hooks/usePageTitle';
import PersonCard from './components/PersonCard';
import AddPersonModal from './components/AddPersonModal';
import EditPersonModal from './components/EditPersonModal';
import FilterPersonModal from './components/FilterPersonModal';
import {
  defaultPersonFilters,
  evaluatePersonFilters,
  normalizePersonFilters,
  type PersonFilter,
} from './utils/personFilters';
import styles from './PeopleDirectory.module.css';
import {
  initialCreationDraftLifecycleState,
  reduceCreationDraftLifecycle,
} from '../utils/creationDraftLifecycle';

const PeopleDirectory = () => {
  const { uid } = useAuth();
  usePageTitle('Pessoas');
  const [searchParams, setSearchParams] = useSearchParams();
  const [people, setPeople] = useState<Person[]>([]);
  const [addPersonDraft, dispatchAddPersonDraft] = useReducer(
    reduceCreationDraftLifecycle,
    initialCreationDraftLifecycleState,
  );
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filters, setFilters] = useState<PersonFilter>(defaultPersonFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { availableRelationships, relationshipColors } = usePersonRelationships();

  const fetchPeople = async (): Promise<void> => {
    if (!uid) return;

    try {
      const querySnapshot = await getDocs(collection(db, `users/${uid}/people-directory`));
      const peopleData = querySnapshot.docs.map((personDocument) =>
        hydratePerson(personDocument.id, personDocument.data())
      );

      peopleData.sort((left, right) => {
        const favoriteDifference = Number(right.favorite) - Number(left.favorite);
        return favoriteDifference !== 0
          ? favoriteDifference
          : left.name.localeCompare(right.name);
      });
      setPeople(peopleData);
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
    }
  };

  useEffect(() => {
    void fetchPeople();
  }, [uid]);

  useEffect(() => {
    if (searchParams.get('create') !== 'person') return;

    dispatchAddPersonDraft({ type: 'open' });
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('create');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const openAddPersonModal = () => {
    dispatchAddPersonDraft({ type: 'open' });
  };

  const dismissAddPersonModal = () => {
    dispatchAddPersonDraft({ type: 'dismiss' });
  };

  const discardAddPersonDraft = () => {
    dispatchAddPersonDraft({ type: 'discard' });
  };

  useEffect(() => {
    const loadFilters = async () => {
      if (!uid) return;

      try {
        const settingsReference = doc(db, `users/${uid}/settings`, 'userPeopleFilters');
        const snapshot = await getDoc(settingsReference);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setFilters(normalizePersonFilters(data));
        }
      } catch (error) {
        console.error('Erro ao carregar filtros:', error);
      } finally {
        setFiltersLoaded(true);
      }
    };

    void loadFilters();
  }, [uid]);

  useEffect(() => {
    if (!filtersLoaded || availableRelationships.length === 0) return;

    const normalizedFilters = normalizePersonFilters(filters, availableRelationships);
    if (
      normalizedFilters.selectedRelationships.join('\u0000')
      === filters.selectedRelationships.join('\u0000')
    ) {
      return;
    }

    setFilters(normalizedFilters);
    if (!uid) return;

    const settingsReference = doc(db, `users/${uid}/settings`, 'userPeopleFilters');
    void setDoc(settingsReference, normalizedFilters);
  }, [availableRelationships, filters, filtersLoaded, uid]);

  const toggleFavorite = async (personId: string, currentValue: boolean) => {
    if (!uid) return;

    const personReference = doc(db, getPersonDocumentPath(uid, personId));
    await updateDoc(personReference, { favorite: !currentValue });
    await fetchPeople();
  };

  const openEditPersonModal = (person: Person): void => {
    setSelectedPerson(person);
    setIsEditPersonModalOpen(true);
  };

  const filteredPeople = (!filters.enabled || !filtersLoaded)
    ? people
    : people.filter((person) =>
      evaluatePersonFilters(person, filters, availableRelationships).matches);

  const visiblePeople = filteredPeople.filter((person) => {
    if (!isSearching || searchQuery.trim() === '') return true;
    return person.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const updateFilters = async (updatedFilters: PersonFilter) => {
    setFilters(updatedFilters);
    if (!uid) return;

    const settingsReference = doc(db, `users/${uid}/settings`, 'userPeopleFilters');
    await setDoc(settingsReference, updatedFilters);
  };

  const searchIsActive = isSearching && searchQuery.trim() !== '';
  const hasPeople = people.length > 0;

  return (
    <ProtectedRoute>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Diretório de pessoas</h1>
            <p className={styles.subtitle}>Contatos, relacionamentos e histórico associado.</p>
          </div>

          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.toolbarButton}
              title="Buscar pessoa"
              aria-label="Buscar pessoa"
              onClick={() => setShowSearchModal(true)}
            >
              <Search className={styles.buttonIcon} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${styles.toolbarButton} ${filters.enabled ? styles.toolbarButtonActive : ''}`}
              title="Filtrar pessoas"
              aria-label="Filtrar pessoas"
              aria-pressed={filters.enabled}
              onClick={() => setShowFilterModal(true)}
            >
              <ListFilter className={styles.buttonIcon} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={openAddPersonModal}
            >
              <UserPlus className={styles.buttonIcon} aria-hidden="true" />
              Nova pessoa
            </button>
          </div>
        </header>

        {hasPeople && (
          <div className={styles.resultMeta}>
            <p className={styles.resultCount}>
              {visiblePeople.length} {visiblePeople.length === 1 ? 'pessoa' : 'pessoas'}
            </p>
            {searchIsActive && <p className={styles.resultCount}>Busca ativa</p>}
          </div>
        )}

        {!hasPeople && <p className={styles.emptyState}>Nenhuma pessoa registrada.</p>}

        {hasPeople && visiblePeople.length === 0 && (
          <p className={styles.noResults}>Nenhuma pessoa corresponde aos filtros ou à busca atual.</p>
        )}

        {visiblePeople.length > 0 && (
          <div className={styles.grid}>
            {visiblePeople.map((person) => (
              <div key={person.id}>
                <PersonCard
                  person={person}
                  onToggleFavorite={toggleFavorite}
                  onEditPerson={openEditPersonModal}
                  relationshipColors={relationshipColors}
                />
              </div>
            ))}
          </div>
        )}

        <FilterPersonModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          setFilters={updateFilters}
          availableRelationships={availableRelationships}
        />

        {showSearchModal && (
          <div
            className={styles.searchOverlay}
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setShowSearchModal(false)
            }}
          >
            <div
              className={styles.searchDialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby="people-search-title"
            >
              <div className={styles.searchHeader}>
                <h2 id="people-search-title" className={styles.searchTitle}>Buscar pessoa</h2>
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    aria-label="Limpar busca"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearching(false);
                    }}
                  >
                    <X className={styles.buttonIcon} aria-hidden="true" />
                  </button>
                )}
              </div>
              <div className={styles.searchBody}>
                <input
                  type="search"
                  placeholder="Digite um nome..."
                  aria-label="Buscar por nome"
                  className={styles.searchInput}
                  value={searchQuery}
                  autoFocus
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setIsSearching(true);
                  }}
                />
                <button
                  type="button"
                  className={styles.searchClose}
                  onClick={() => setShowSearchModal(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {addPersonDraft.hasMounted && (
          <AddPersonModal
            key={addPersonDraft.revision}
            onDismiss={dismissAddPersonModal}
            onCancel={dismissAddPersonModal}
            onSaved={discardAddPersonDraft}
            onAdded={fetchPeople}
            isOpen={addPersonDraft.isOpen}
          />
        )}

        {isEditPersonModalOpen && selectedPerson && (
          <EditPersonModal
            person={selectedPerson}
            isOpen={isEditPersonModalOpen}
            onClose={() => setIsEditPersonModalOpen(false)}
            onUpdated={fetchPeople}
            onDeleted={async () => {
              await fetchPeople();
              setSelectedPerson(null);
            }}
          />
        )}

      </main>
    </ProtectedRoute>
  );
};

export default PeopleDirectory;
