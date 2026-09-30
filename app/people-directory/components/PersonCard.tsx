'use client';

import { useNavigate } from 'react-router';
import { Person } from '../../utils/interfaces';
import { getEntityColor, type EntityColorMap } from '../../utils/entityColors';
import { Heart, Mail, Phone } from 'lucide-react';
import styles from './PersonCard.module.css';

/**
 * @interface PersonCardProps
 * @description Props para o componente `PersonCard`, que exibe informações resumidas de uma pessoa e oferece ação de favoritar.
 * @property {Person} person - O objeto da pessoa a ser exibido no cartão.
 * @property {(personId: string, currentValue: boolean) => void} onToggleFavorite - Função chamada ao solicitar a alteração do status de favorito da pessoa. Recebe o ID da pessoa e o valor atual do status como argumentos.
 */
interface PersonCardProps {
  person: Person;
  onToggleFavorite: (personId: string, currentValue: boolean) => void;
  relationshipColors?: EntityColorMap;
}

/**
 * @component
 * @description Componente para exibir um cartão resumido de uma pessoa, incluindo nome, telefone, email (opcional) e ação de favoritar. Ao clicar no cartão, navega para a página de detalhes da pessoa.
 * @param {PersonCardProps} { person, onToggleFavorite } - Props para o componente.
 * @returns {JSX.Element} Um cartão representando as informações da pessoa.
 */
const PersonCard = ({ person, onToggleFavorite, relationshipColors }: PersonCardProps) => {
  const navigate = useNavigate();
  const relationships = person.relationships ?? [];

  return (
    <article className={styles.card}>

      <div className={styles.header}>
        <button
          type="button"
          className={styles.titleButton}
          onClick={() => navigate(`/people-directory/${person.id}`)}
        >
          <span className={styles.title}>{person.name}</span>
        </button>
        <div className={styles.actionGroup}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(person.id, !!person.favorite);
          }}
          aria-label={person.favorite ? `Remover ${person.name} dos favoritos` : `Adicionar ${person.name} aos favoritos`}
          className={`${styles.iconButton} ${person.favorite ? styles.favoriteActive : ''}`}>
          {person.favorite ? (
            <Heart className={styles.icon} fill="currentColor" aria-hidden="true" />
          ) : (
            <Heart className={styles.icon} aria-hidden="true" />
          )}
        </button>
        </div>
      </div>

      <button
        type="button"
        className={styles.bodyButton}
        aria-label={`Abrir detalhes de ${person.name}`}
        onClick={() => navigate(`/people-directory/${person.id}`)}
      >
      <span className={styles.body}>
        <span className={styles.metaList}>
        {person.phone && (
          <span className={styles.metaRow}>
            <Phone className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{person.phone}</span>
          </span>
        )}
        {person.email && (
          <span className={styles.metaRow}>
            <Mail className={styles.metaIcon} aria-hidden="true" />
            <span className={styles.metaText}>{person.email}</span>
          </span>
        )}
        </span>

        {relationships.length > 0 && (
          <span className={styles.relationships}>
              {relationships.map((rel) => (
                <span
                  key={rel}
                  className={styles.relationship}
                  style={getEntityColorStyle(getEntityColor(relationshipColors, rel))}
                >
                  {rel}
                </span>
              ))}
          </span>
        )}
      </span>
      </button>

    </article>
  );
};

export default PersonCard;

function getEntityColorStyle(color: string | undefined): React.CSSProperties | undefined {
  return color ? { '--entity-color': color } as React.CSSProperties : undefined;
}
