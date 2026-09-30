'use client';

import { useNavigate } from 'react-router';
import { Person } from '../../utils/interfaces';
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors';
import { Heart, Mail, Phone } from 'lucide-react';
import styles from './PersonCard.module.css';

interface PersonCardProps {
  person: Person;
  onToggleFavorite: (personId: string, currentValue: boolean) => void;
  onEditPerson: (person: Person) => void;
  relationshipColors?: EntityColorMap;
}

const PersonCard = ({
  person,
  onToggleFavorite,
  onEditPerson,
  relationshipColors,
}: PersonCardProps) => {
  const navigate = useNavigate();
  const relationships = person.relationships ?? [];

  const openPerson = () => navigate(`/people-directory/${person.id}`);

  return (
    <article
      className={styles.card}
      role="link"
      tabIndex={0}
      aria-label={`Abrir pessoa ${person.name}`}
      onClick={openPerson}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPerson();
        }
      }}
    >
      <header className={styles.header}>
        <h2 className={styles.title}>{person.name}</h2>

        <button
          type="button"
          className={`${styles.iconButton} ${person.favorite ? styles.favoriteActive : ''}`}
          aria-label={person.favorite
            ? `Remover ${person.name} dos favoritos`
            : `Adicionar ${person.name} aos favoritos`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(person.id, !!person.favorite);
          }}
        >
          <Heart
            className={styles.icon}
            fill={person.favorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </button>
      </header>

      <div className={styles.metaList}>
        {person.phone && (
          <div className={styles.metaRow}>
            <Phone className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{person.phone}</span>
          </div>
        )}
        {person.email && (
          <div className={styles.metaRow}>
            <Mail className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{person.email}</span>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.relationships}>
          {relationships.map((relationship) => (
            <span
              key={relationship}
              className={styles.relationship}
              style={getEntityColorStyle(getEntityColor(relationshipColors, relationship))}
            >
              {relationship}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={styles.editButton}
          onClick={(event) => {
            event.stopPropagation();
            onEditPerson(person);
          }}
        >
          Editar
        </button>
      </footer>
    </article>
  );
};

export default PersonCard;

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined;
}
