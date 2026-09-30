'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { ListFilter, Search, UserPlus, X } from 'lucide-react';
import { db } from '../utils/firebaseConfig';
import { useAuth } from '../components/auth/AuthProvider';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useSearchParams } from 'react-router';
import { Person } from '../utils/interfaces';
import { usePersonRelationships } from '../hooks/usePersonRelationships';
import PersonCard from './components/PersonCard';
import AddPersonModal from './components/AddPersonModal';
import EditPersonModal from './components/EditPersonModal';
import FilterPersonModal, { PersonFilter } from './components/FilterPersonModal';
import styles from './PeopleDirectory.module.css';

const defaultFilters: PersonFilter = {
  enabled: true,
  hasPhone: false,
  hasEmail: false,
  hasBirthday: false,
  hasAddressByCep: false,
  hasNote: false,
  isFavorite: false,
  hasContactFrequency: false,
  selectedRelationships: [],
};

const PeopleDirectory = () => {
  const { uid } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [filters, setFilters] = useState<PersonFilter>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const { availableRelationships, relationshipColors } = usePersonRelationships();

  const fetchPeople = async (): Promise<void> => {
    if (!uid) return;

    try {
      const querySnapshot = await getDocs(collection(db, `users/${uid}/people-directory`));
      const peopleData = querySnapshot.docs.map((personDocument) => ({
        id: personDocument.id,
        ...personDocument.data(),
      })) as Person[];

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

    setIsAddPersonModalOpen(true);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('create');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const loadFilters = async () => {
      if (!uid) return;

      try {
        const settingsReference = doc(db, `users/${uid}/settings`, 'userPeopleFilters');
        const snapshot = await getDoc(settingsReference);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setFilters({
            ...defaultFilters,
            ...data,
            selectedRelationships: Array.isArray(data?.selectedRelationships)
              ? data.selectedRelationships
              : [],
          });
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
    if (availableRelationships.length === 0) return;

    setFilters((previousFilters) => ({
      ...previousFilters,
      selectedRelationships: previousFilters.selectedRelationships.length === 0
        ? availableRelationships
        : previousFilters.selectedRelationships,
    }));
  }, [availableRelationships]);

  const openEditPersonModal = (person: Person) => {
    setSelectedPerson(person);
    setIsEditPersonModalOpen(true);
  };

  const handlePersonDeleted = () => {
    setSelectedPerson(null);
    void fetchPeople();
  };

  const toggleFavorite = async (personId: string, currentValue: boolean) => {
    if (!uid) return;

    const personReference = doc(db, `users/${uid}/people-directory`, personId);
    await updateDoc(personReference, { favorite: !currentValue });
    await fetchPeople();
  };

  const filteredPeople = (!filters.enabled || !filtersLoaded)
    ? people
    : people.filter((person) => {
      const matchesPhone = !filters.hasPhone || !!person.phone;
      const matchesEmail = !filters.hasEmail || !!person.email;
      const matchesBirthday = !filters.hasBirthday || !!person.birthday;
      const matchesFavorite = !filters.isFavorite || !!person.favorite;
      const matchesFrequency = !filters.hasContactFrequency || !!person.contactFrequency;
      const matchesRelationship =
        (filters.selectedRelationships?.length ?? 0) === 0 ||
        (Array.isArray(person.relationships) ? person.relationships : [])
          .some((relationship) => filters.selectedRelationships.includes(relationship));

      return (
        matchesPhone &&
        matchesEmail &&
        matchesBirthday &&
        matchesFavorite &&
        matchesFrequency &&
        matchesRelationship
      );
    });

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
              onClick={() => setIsAddPersonModalOpen(true)}
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
                  onEditPerson={openEditPersonModal}
                  onToggleFavorite={toggleFavorite}
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
          <div className={styles.searchOverlay} role="presentation">
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

        {isAddPersonModalOpen && (
          <AddPersonModal
            onClose={() => setIsAddPersonModalOpen(false)}
            onAdded={fetchPeople}
            isOpen={isAddPersonModalOpen}
          />
        )}

        {isEditPersonModalOpen && selectedPerson && (
          <EditPersonModal
            person={selectedPerson}
            isOpen={isEditPersonModalOpen}
            onClose={() => setIsEditPersonModalOpen(false)}
            onUpdated={fetchPeople}
            onDeleted={handlePersonDeleted}
          />
        )}
      </main>
    </ProtectedRoute>
  );
};

export default PeopleDirectory;
